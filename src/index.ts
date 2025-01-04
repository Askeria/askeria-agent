import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';
import { config } from './config';
import { DiscordService } from './services/discordService';

async function main() {
    try {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        const discordService = new DiscordService(config, client);
        
        client.on('messageCreate', async (message) => {
            if (message.content.startsWith('!init')) {
                if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
                    await message.reply('Sorry, only admins can use this command.');
                    return;
                }
                const args = message.content.split(' ');
                if (args.length < 3) {
                    await message.reply('Usage: !init <bot_name> <documentation_url>');
                    return;
                }

                const botName = args[1];
                const docUrl = args[2];

                try {
                    await discordService.initializeBot(
                        botName,
                        docUrl,
                        message.guildId!,
                        message.author.id,
                        config.contextPath
                    );
                    await message.guild?.members.me?.setNickname(botName);
                    await message.reply(`Bot initialized successfully as ${botName}`);

                } catch (error) {
                    console.error('Error initializing bot:', error);
                    await message.reply('Failed to initialize bot. Please check the logs.');
                }
            }
        });

        await discordService.start();
        console.log('Bot is running!');

    } catch (error) {
        console.error('Failed to start bot:', error);
    }
}

main();
