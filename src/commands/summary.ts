import { Message, TextChannel, PermissionFlagsBits, Collection } from 'discord.js';
import { AiSession } from '../services/deepseekAPI';

export async function executeSummary(message: Message, AiSession: AiSession) {
    try {
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('Only administrators can use this command.');
            return;
        }

        const args = message.content.split(' ');
        let hours = args[1] ? parseFloat(args[1]) : 6;
        
        if (isNaN(hours) || hours <= 0) {
            await message.reply('Please specify a valid duration in hours (example: !summary 2)');
            return;
        }
        
        if (hours > 6) {
            await message.reply('The maximum duration is 6 hours. The duration will be limited to 6 hours.');
            hours = 6;
        }

        const loadingMsg = await message.reply(`Fetching messages from the last ${hours} hours...`);
        
        const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
        const messages: string[] = [];
        let lastId: string | undefined;

        while (true) {
            const options = { limit: 100, before: lastId };
            
            const fetchedMessages = await message.channel.messages.fetch(options) as Collection<string, Message>;
            if (fetchedMessages.size === 0) break;
            
            for (const msg of fetchedMessages.values()) {
                if (msg.createdAt < timeLimit) {
                    break;
                }
                if (!msg.content || msg.author.bot) continue;
                
                messages.unshift(`${msg.author.username}: ${msg.content}`);
            }
            
            const lastMessage = fetchedMessages.last();
            if (!lastMessage || lastMessage.createdAt < timeLimit) break;
            lastId = lastMessage.id;
        }

        if (messages.length === 0) {
            await loadingMsg.edit(`No messages found in the last ${hours} hours.`);
            return;
        }

        await loadingMsg.edit(`Analyzing ${messages.length} messages...`);

        const prompt = `Here is a Discord conversation of the last ${hours} hours. 
        Make a concise summary of the main topics and important points discussed.
        
        ${messages.join('\n')}`;

        const summary = await AiSession.askApi(prompt);
        await loadingMsg.edit(`**Summary of the last ${hours} hours :**\n\n${summary}`);
        console.log(`Summary generated for server ${message.guildId}`);

    } catch (error) {
        console.error('Error during summary:', error);
        await message.reply('An error occurred while generating the summary.');
    }
}
