import { BotConfig, ServerBot, MessageResponse } from '../types/interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { database } from './database';

export class AiSession {
    private apiKey: string;
    private systemContext: string = '';
    private apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    private messageHistory: { role: string; content: string }[] = [];
    constructor(
        private config: BotConfig,
        private bot: ServerBot
    ) {
        this.apiKey = config.deepseekApiKey;
    }

    private async checkUsageLimit(): Promise<boolean> {
        try {
            return await database.incrementServerUsage(this.bot.serverId);
        } catch (error) {
            console.error('Error checking usage limit:', error);
            throw error;
        }
    }

    public getClientId(): string {
        return this.bot.userId;
    }

    public getServerId(): string {
        return this.bot.serverId;
    }

    async loadContext(): Promise<void> {
        try {
            const contextConfig = await fs.readFile(path.resolve('./src/basecontext.txt'), 'utf-8');
            const extractedContext = await fs.readFile(path.resolve(this.bot.contextPath), 'utf-8');
            this.systemContext = contextConfig + extractedContext;
            console.log(`Context has beenloaded successfully for bot ${this.bot.name}`);
        
        } catch (error) {
            console.error('Error while loading system context:', error);
            this.systemContext = '';
        }
    }

    public async askApiWithContext(message: string): Promise<string> {
        try {
            const canProceed = await this.checkUsageLimit();
            if (!canProceed) {
                return 'Monthly request limit reached (100 requests).';
            }

            const userQuestion = message.slice(5).trim() + "\n\nAnswer using maximum 500 tokens & 3 sentences";
            this.messageHistory.push({ role: 'user', content: userQuestion });

            const response = await axios.post<MessageResponse>(
                this.apiUrl,
                {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: this.systemContext },
                        ...this.messageHistory
                    ],
                    max_tokens: 500,
                    temperature: 1.0
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const assistantResponse = response.data.choices[0].message.content;
            this.messageHistory.push({ role: 'assistant', content: assistantResponse });
            
            console.log(`Tokens used - Total:${response.data.usage.total_tokens}`);

            if (this.messageHistory.length > 10) {
                this.messageHistory = this.messageHistory.slice(-10);
            }

            return assistantResponse;

        } catch (error) {
            console.error('Error getting Deepseek response:', error);
            return '';
        }
    }

    public async askApi(message: string): Promise<string> {
        try {
            const canProceed = await this.checkUsageLimit();
            if (!canProceed) {
                return 'Monthly request limit reached (100 requests).';
            }

            const userQuestion = message.slice(5).trim();
            this.messageHistory.push({ role: 'user', content: userQuestion });

            const response = await axios.post<MessageResponse>(
                this.apiUrl,
                {
                    model: 'deepseek-chat',
                    messages: [
                        { 
                            role: 'system', 
                            content: "You're an AI agent operated by Askeria. You're designed to answer questions about documentation & assist server users. Never use emojis" 
                        },
                        ...this.messageHistory
                    ],
                    max_tokens: 500,
                    temperature: 1.0
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const assistantResponse = response.data.choices[0].message.content;
            this.messageHistory.push({ role: 'assistant', content: assistantResponse });
            
            console.log(`Tokens used - Total:${response.data.usage.total_tokens}`);

            if (this.messageHistory.length > 10) {
                this.messageHistory = this.messageHistory.slice(-10);
            }

            return assistantResponse;

        } catch (error) {
            console.error('Error getting Deepseek response:', error);
            return '';
        }
    }
}
