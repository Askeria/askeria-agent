import { AiSession } from "../services/deepseekAPI";

export interface BotConfig {
    discordToken: string;
    deepseekApiKey: string;
    contextPath: string;
}

export interface SystemConfig extends BotConfig {
    supabaseUrl: string;
    supabaseKey: string;
}

export interface MessageContent {
    role: string;
    content: string;
}

export interface ChatMessage extends MessageContent {
}

export interface MessageResponse {
    choices: [{
        message: {
            content: string;
        }
    }];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface AiResponse extends MessageResponse {
}

export interface ServerBot {
    id?: string;
    name: string;
    documentationUrl: string;
    serverId: string;
    userId: string;
    contextPath: string;
    created_at?: string;
    request_count?: number;
    last_reset?: string;
}

export interface AssistantConfig extends ServerBot {
}

export interface BotSession {
    bot: ServerBot;
    aiSession: AiSession;
}

export interface AssistantSession {
    config: AssistantConfig;
    aiSession: AiSession;
}

export interface ServerUsage {
    server_id: string;
    request_count: number;
    last_reset: string;
}

export interface UsageMetrics extends ServerUsage {
}