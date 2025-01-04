import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface BotConfig {
    discordToken: string;
    deepseekApiKey: string;
    contextPath: string;
    supabaseUrl: string;
    supabaseKey: string;
}


export const config: BotConfig = {
    discordToken: process.env.DISCORD_TOKEN!,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY!,
    contextPath: './extracted_context',
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_KEY!
};


