import { Message, TextChannel, PermissionFlagsBits, Collection, Channel } from 'discord.js';
import { AiSession } from '../services/deepseekAPI';

export async function executeTrends(message: Message, AiSession: AiSession) {
    try {
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply('Only administrators can use this command.');
            return;
        }

        const args = message.content.split(' ');
        let targetChannel = message.channel;
        let hours = 24;
        
        // Vérifier les arguments
        for (let i = 1; i < args.length; i++) {
            // Si c'est une mention de channel
            if (args[i].startsWith('<#') && args[i].endsWith('>')) {
                const channelId = args[i].slice(2, -1);
                const channel = message.guild?.channels.cache.get(channelId);
                if (channel && channel.isTextBased()) {
                    targetChannel = channel;
                } else {
                    await message.reply('Invalid channel specified.');
                    return;
                }
            }
            // Si c'est un nombre (heures)
            else if (!isNaN(parseFloat(args[i]))) {
                hours = parseFloat(args[i]);
            }
        }

        if (hours <= 0) {
            await message.reply('Please specify a valid duration in hours (example: !trends #channel 24)');
            return;
        }
        
        if (hours > 48) {
            await message.reply('The maximum duration is 48 hours. The duration will be limited to 48 hours.');
            hours = 48;
        }

        const loadingMsg = await message.reply(
            `Analyzing trends from ${targetChannel === message.channel ? 'this channel' : targetChannel.toString()} for the last ${hours} hours...`
        );
        
        const timeLimit = new Date(Date.now() - hours * 60 * 60 * 1000);
        const messages: string[] = [];
        let lastId: string | undefined;

        while (true) {
            const options = { limit: 100, before: lastId };
            
            const fetchedMessages = await targetChannel.messages.fetch(options) as Collection<string, Message>;
            if (fetchedMessages.size === 0) break;
            
            for (const msg of fetchedMessages.values()) {
                if (msg.createdAt < timeLimit) {
                    break;
                }
                if (!msg.content || msg.author.bot) continue;
                
                messages.push(msg.content);
            }
            
            const lastMessage = fetchedMessages.last();
            if (!lastMessage || lastMessage.createdAt < timeLimit) break;
            lastId = lastMessage.id;
        }

        if (messages.length === 0) {
            await loadingMsg.edit(`No messages found in ${targetChannel.toString()} for the last ${hours} hours.`);
            return;
        }

        await loadingMsg.edit(`Analyzing ${messages.length} messages from ${targetChannel.toString()} for trends...`);

        const prompt = `Analyze these Discord messages from the last ${hours} hours and provide a VERY CONCISE analysis (max 1500 characters) with:
        1. Most discussed topics (top 3-4)
        2. Key terms frequency (top 3-4)
        3. Main trends or patterns
        4. Don't mention casual interactions, only provide crypto related trends and insights
        
        Format the response as a brief list with bullet points.
        
        Messages to analyze:
        ${messages.join('\n')}`;

        const analysis = await AiSession.askApi(prompt);
        
        const header = `**Trend Analysis for ${targetChannel.toString()} - Last ${hours} hours:**\n\n`;
        let finalMessage = header + analysis;
        
        if (finalMessage.length > 1900) {
            finalMessage = finalMessage.substring(0, 1900) + "...";
        }
        
        await loadingMsg.edit(finalMessage);
        console.log(`Trends analyzed for channel ${targetChannel.id} in server ${message.guildId}`);

    } catch (error) {
        console.error('Error analyzing trends:', error);
        await message.reply('An error occurred while analyzing trends.');
    }
} 