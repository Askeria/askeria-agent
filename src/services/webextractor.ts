import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import TurndownService from 'turndown';

export class WebContentParser {
    private markdownConverter: TurndownService;
    private visitedLinks: Set<string> = new Set();

    constructor(private rootUrl: string, private targetFolder: string) {
        this.markdownConverter = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
        });
        this.targetFolder = targetFolder;
    }

    async setup() {
        try {
            await fs.mkdir(this.targetFolder, { recursive: true });
            console.log(`Dossier cible créé: ${this.targetFolder}`);
        } catch (error) {
            console.error(`Échec de création du dossier: ${error}`);
            throw error;
        }
    }

    private formatUrlToFilename(url: string): string {
        return url 
        .replace(this.rootUrl, '')
        .split('#')[0]
        .replace(/\/?$/, '')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
    }

    private async transformToMarkdown(html: string, url: string): Promise<string> {
        const $ = cheerio.load(html);
        $('script, style, nav, footer, header').remove();
        
        const pageTitle = 
            $('h1').first().text() || 
            $('title').text() || 
            $('.page-title').text() ||
            $('.title').text() ||
            'Sans Titre';
        
        const fileHeader = [
            '---',
            `title: ${pageTitle.trim()}`,
            `url: ${url}`,
            `parsed_at: ${new Date().toISOString()}`,
            '---\n\n'
        ].join('\n');

        const mdContent = this.markdownConverter.turndown($.html());
        return fileHeader + mdContent;
    }

    async parsePage(url: string): Promise<void> {
        if (this.visitedLinks.has(url)) {
            return;
        }

        this.visitedLinks.add(url);

        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);

            $('nav, header, footer, [role="navigation"], .gitbook-root, .css-175oi2r.r-bnwqim.r-13qz1uu').remove();
            
            const gitbookSelectors = [
                '[data-testid="page.contentEditor"]',
                '[data-testid="page.content"]',
                '.reset-3c756112--content-0f7b14fb',
                '.markdown-section',
            ];

            const genericSelectors = [
                'main',
                'article',
                '.content',
                '.main-content',
                '.documentation',
                '.docs-content',
                '#content',
                '.markdown-body',
                '.doc-content'
            ];

            let mainContent = null;

            for (const selector of gitbookSelectors) {
                const content = $(selector);
                if (content.length > 0) {
                    mainContent = content;
                    break;
                }
            }

            if (!mainContent) {
                for (const selector of genericSelectors) {
                    const content = $(selector);
                    if (content.length > 0) {
                        mainContent = content;
                        break;
                    }
                }
            }

            if (!mainContent) {
                mainContent = $('body');
            }

            mainContent.find('nav, header, footer, [role="navigation"], .gitbook-root').remove();
            
            const markdown = await this.transformToMarkdown(mainContent.html() || '', url);
            const filename = this.formatUrlToFilename(url) + '.md';
            const filePath = path.join(this.targetFolder, filename);
            await fs.writeFile(filePath, markdown);

            const links = mainContent.find('a[href]')
                .map((_, element) => {
                    const href = $(element).attr('href');
                    if (!href) return null;
                    if (this.shouldIgnoreLink(href)) return null;
                    return this.standardizeUrl(href, url);
                })
                .get()
                .filter(href => href && href.startsWith(this.rootUrl));

            for (const link of links) {
                if (link) {
                    await this.parsePage(link);
                }
            }

        } catch (error) {
            console.error(`Failed to process page ${url}: ${error}`);
        }
    }

    private shouldIgnoreLink(href: string): boolean {
        return href.includes('#') || 
               href.startsWith('javascript:') ||
               href.toLowerCase().endsWith('.zip') ||
               href.includes('~gitbook') ||
               href.includes('utm_source') ||
               href.includes('mailto:') ||
               href.includes('tel:') ||
               /\.(png|jpg|jpeg|gif|svg|css|js)$/.test(href.toLowerCase());
    }

    private standardizeUrl(href: string, currentUrl: string): string | null {
        try {
            if (href.startsWith('/')) {
                return new URL(href, this.rootUrl).toString();
            }
            if (href.startsWith('http')) {
                return href;
            }
            return new URL(href, currentUrl).toString();
        } catch {
            return null;
        }
    }

    async mergeFiles(): Promise<string> {
        const files = await fs.readdir(this.targetFolder);
        const markdownFiles = files.filter(file => file.endsWith('.md'));
        
        let combinedContent = '';
        for (const file of markdownFiles) {
            const content = await fs.readFile(path.join(this.targetFolder, file), 'utf-8');
            combinedContent += content + '\n\n---\n\n';
        }

        const combinedFilePath = path.join(this.targetFolder, 'combined_context.txt');
        await fs.writeFile(combinedFilePath, combinedContent);

        return combinedContent;
    }

    async parseWebsite(): Promise<string> {
        try {
            console.log('Extracting site content...');
            await this.clearTargetFolder();
            await this.setup();
            await this.parsePage(this.rootUrl);
            const content = await this.mergeFiles();
            console.log('Site content extracted successfully');
            console.log(`Combined context is saved in ${this.targetFolder}/combined_context.txt`);
            return content;
        } catch (error) {
            console.error(`Failed to extract site content: ${error}`);
            throw error;
        }
    }

    private async clearTargetFolder(): Promise<void> {
        try {
            await fs.access(this.targetFolder);
            await fs.rm(this.targetFolder, { recursive: true, force: true });
            console.log('Output directory cleaned');
            await fs.mkdir(this.targetFolder);
        } catch (error) {
            await fs.mkdir(this.targetFolder, { recursive: true });
        }
    }
}
