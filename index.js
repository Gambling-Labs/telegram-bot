const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { registerAdminHandlers } = require('./src/handlers/adminHandlers');
const { registerUserHandlers } = require('./src/handlers/userHandlers');

if (!config.telegram.token || !config.telegram.adminId || !config.telegram.signalChannelId) {
    console.error("❌ CRITICAL ERROR: Check that the bot token, admin id and signal channel id are set in your .env file");
    process.exit(1);
}

const bot = new TelegramBot(config.telegram.token, { polling: true });

const userCommands = [
    { command: 'start', description: '▶️ Start the bot' },
];
bot.setMyCommands(userCommands)
    .then(() => console.log('User commands set.'))
    .catch(console.error);

const adminCommands = [
    { command: 'painel', description: '👑 Open the control panel' },
    ...userCommands
];
bot.setMyCommands(adminCommands, { scope: { type: 'chat', chat_id: config.telegram.adminId } })
    .then(() => console.log(`Admin commands set for ID: ${config.telegram.adminId}.`))
    .catch((err) => console.error("Failed to set admin commands. Check the ID.", err.message));

registerAdminHandlers(bot, config.telegram.adminId);
registerUserHandlers(bot, config.telegram.adminId);

// Defensive global handlers — never let a stray error crash the bot
process.on('unhandledRejection', (reason) => {
    console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('UncaughtException:', err);
});
bot.on('polling_error', (err) => {
    console.error('Polling error:', err.code || '', err.message || err);
});

console.log('❤ Built with love by Apx');
console.log('✅ Use the /painel command in a private chat with the bot to access admin controls');