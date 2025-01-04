import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import { BotConfig } from '../types/interfaces';
import { SessionManager } from './sessionManager';
import { ServerBot } from '../types/interfaces';
import { WebContentParser } from './webextractor';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AiSession } from './deepseekAPI';

export class DiscordService {
    private sessionManager: SessionManager;

    constructor(
        private config: BotConfig,
        private client: Client
    ) {
        this.sessionManager = new SessionManager(config);
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return;
            await this.handleMessage(message);
        });

        this.client.once(Events.ClientReady, () => {
            console.log('Discord Bot ready!');
        });
    }

    async handleMessage(message: Message): Promise<void> {
        if (message.content.startsWith('!ask')) {
            console.log(`Received question from server ${message.guildId}`);
            const session = await this.sessionManager.getSession(message.guildId!);
            const question = message.content.slice(4).trim();

            if (!session) {
                await message.reply('Session not initialized. Please initialize the bot first.');
                return;
            }

            const waitingMessage = await message.reply('Give me a sec...');

            const response = await session.aiSession.askApiWithContext(question);
            await waitingMessage.edit(response);
        }
        else if (message.content.startsWith('!chat')) {
            console.log(`Received general question from server ${message.guildId}`);
            const session = await this.sessionManager.getSession(message.guildId!);
            const question = message.content.slice(5).trim();

            if (!session) {
                await message.reply('Session not initialized. Please initialize the bot first.');
                return;
            }

            const waitingMessage = await message.reply('Give me a sec...');

            const response = await session.aiSession.askApi(question);
            await waitingMessage.edit(response);
        }
    }

    private async ensureContextDirectory(contextPath: string): Promise<void> {
        try {
            await fs.access(contextPath);
        } catch {
            await fs.mkdir(contextPath, { recursive: true });
        }
    }

    async initializeBot(
        name: string,
        documentationUrl: string,
        serverId: string,
        userId: string,
        contextPath: string
    ): Promise<void> {
        await this.ensureContextDirectory(contextPath);
        const serverContextDir = `${contextPath}/server_${serverId}`;
        
        const contextExtractor = new WebContentParser(documentationUrl, serverContextDir);
        await contextExtractor.parseWebsite();
        
        const bot: ServerBot = {
            name,
            documentationUrl,
            serverId,
            userId,
            contextPath: `${serverContextDir}/combined_context.txt`
        };

        try {
            await this.sessionManager.createSession(bot);
        } catch (error) {
            await fs.rm(serverContextDir, { recursive: true, force: true });
            throw error;
        }
    }

    public async start(): Promise<void> {
        await this.client.login(this.config.discordToken);
    }
}