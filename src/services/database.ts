import { createClient } from '@supabase/supabase-js';
import { ServerBot, ServerUsage } from '../types/interfaces';
import { config } from '../config';

class DatabaseService {
    private supabase;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async createServerBot(bot: ServerBot): Promise<ServerBot> {
        const { data, error } = await this.supabase
            .from('bot_clients')
            .insert([{
                name: bot.name,
                documentation_url: bot.documentationUrl,
                server_id: bot.serverId,
                user_id: bot.userId,
                context_path: bot.contextPath
            }])
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return bot;
            }
            throw error;
        }

        return {
            id: data.id,
            name: data.name,
            documentationUrl: data.documentation_url,
            serverId: data.server_id,
            userId: data.user_id,
            contextPath: data.context_path,
            created_at: data.created_at
        };
    }

    async getServerBot(serverId: string): Promise<ServerBot | null> {
        const { data, error } = await this.supabase
            .from('bot_clients')
            .select('*')
            .eq('server_id', serverId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw error;
        }
        
        if (data) {
            return {
                id: data.id,
                name: data.name,
                documentationUrl: data.documentation_url,
                serverId: data.server_id,
                userId: data.user_id,
                contextPath: data.context_path,
                created_at: data.created_at
            };
        }
        return null;
    }

    async updateServerBot(bot: ServerBot): Promise<void> {
        const { error } = await this.supabase
            .from('bot_clients')
            .update({
                name: bot.name,
                documentation_url: bot.documentationUrl,
                server_id: bot.serverId,
                user_id: bot.userId,
                context_path: bot.contextPath
            })
            .eq('server_id', bot.serverId);

        if (error) throw error;
    }

    async deleteServerBot(serverId: string): Promise<void> {
        const { error } = await this.supabase
            .from('bot_clients')
            .delete()
            .eq('server_id', serverId);

        if (error) throw error;
    }

    async incrementServerUsage(serverId: string): Promise<boolean> {
        try {
            const { data: currentData, error: fetchError } = await this.supabase
                .from('bot_clients')
                .select('request_count')
                .eq('server_id', serverId)
                .single();

            if (fetchError) throw fetchError;

            const { data, error } = await this.supabase
                .from('bot_clients')
                .update({ 
                    request_count: (currentData.request_count || 0) + 1
                })
                .eq('server_id', serverId)
                .select()
                .single();

            if (error) throw error;

            if (data.request_count >= 200) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error incrementing server usage:', error);
            throw error;
        }
    }

    async getServerUsage(serverId: string): Promise<ServerUsage | null> {
        const { data, error } = await this.supabase
            .from('server_usage')
            .select('*')
            .eq('server_id', serverId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    }

    async resetServerUsage(serverId: string): Promise<void> {
        const { error } = await this.supabase
            .from('bot_clients')
            .update({
                request_count: 0,
                last_reset: new Date().toISOString()
            })
            .eq('server_id', serverId);

        if (error) throw error;
    }
}

export const database = new DatabaseService(config.supabaseUrl, config.supabaseKey); 