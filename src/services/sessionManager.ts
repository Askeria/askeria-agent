import { ServerBot, BotSession } from '../types/interfaces';
import { AiSession } from './deepseekAPI';
import { BotConfig } from '../types/interfaces';
import { database } from './database';

export class SessionManager {
    private sessions: Map<string, BotSession> = new Map();
    
    constructor(private config: BotConfig) {}

    async createSession(bot: ServerBot): Promise<void> {
        const existingBot = await database.getServerBot(bot.serverId);
        
        let savedBot: ServerBot;
        if (existingBot) {
            await database.updateServerBot({
                ...existingBot,
                ...bot
            });
            savedBot = {
                ...existingBot,
                ...bot
            };
        } else {
            savedBot = await database.createServerBot(bot);
        }
        
        const aiSession = new AiSession(this.config, savedBot);
        await aiSession.loadContext();
        
        this.sessions.set(savedBot.serverId, {
            bot: savedBot,
            aiSession
        });
    }


    async getSession(serverId: string): Promise<BotSession | undefined> {
        let session = this.sessions.get(serverId);

        if (!session) {
            const bot = await database.getServerBot(serverId);
            if (bot) {
                const aiSession = new AiSession(this.config, bot);
                await aiSession.loadContext();
                session = { bot, aiSession };
                this.sessions.set(serverId, session);
            }
        }

        return session;
    }

    removeSession(serverId: string): boolean {
        return this.sessions.delete(serverId);
    }
} 