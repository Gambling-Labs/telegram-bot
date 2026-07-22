const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { registerAdminHandlers } = require('./src/handlers/adminHandlers');
const { registerUserHandlers } = require('./src/handlers/userHandlers');
const signalGenerator = require('./src/services/signalGenerator');

if (!config.telegram.token || !config.telegram.adminId || !config.telegram.signalChannelId) {
    console.error("❌ CRITICAL ERROR: Check that the bot token, admin id and signal channel id are set in your .env file");
    process.exit(1);
}

// autoStart:false so we can clear any stale webhook BEFORE we begin polling.
// A long-poll timeout (30s) means far fewer getUpdates requests, which greatly
// reduces the transient 502/ECONNRESET churn seen behind NAT/proxies.
const bot = new TelegramBot(config.telegram.token, {
    polling: {
        autoStart: false,
        interval: 1000,
        params: { timeout: 30 },
    },
});

const userCommands = [
    { command: 'start', description: '▶️ Start the bot' },
];
bot.setMyCommands(userCommands)
    .then(() => console.log('User commands set.'))
    .catch((err) => console.error('Failed to set user commands.', err.message));

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

// Polling error handling. Transient network errors (502/ECONNRESET) are
// auto-retried by the library, so we throttle their logs to avoid spam. A 409
// means another consumer is reading this bot's updates — that one we always
// surface loudly because it needs human action.
let lastPollingErrorLog = 0;
let lastConflictLog = 0;
bot.on('polling_error', (err) => {
    const code = err.code || '';
    const message = err.message || String(err);
    const now = Date.now();

    if (/409|conflict/i.test(message)) {
        if (now - lastConflictLog > 30000) {
            console.error(
                '⛔ Polling conflict (409): another instance of this bot is polling with the SAME token, ' +
                'or a webhook is still set. Only one consumer is allowed — kill the duplicate process ' +
                '(check `pm2 list` here and any other server/machine) and restart.'
            );
            lastConflictLog = now;
        }
        return;
    }

    if (now - lastPollingErrorLog > 15000) {
        console.error('Polling error (auto-retrying):', code, message);
        lastPollingErrorLog = now;
    }
});

async function startBot() {
    // Clear any stale webhook that would block getUpdates polling. Idempotent
    // and safe: if no webhook is set this is a no-op. Keeps pending updates.
    try {
        await bot.deleteWebhook({ drop_pending_updates: false });
    } catch (err) {
        console.error('Could not clear webhook (continuing anyway):', err.message);
    }

    try {
        await bot.startPolling();
    } catch (err) {
        console.error('Failed to start polling:', err.message);
    }

    // Bring auto-signals back if they were running before the last restart.
    signalGenerator.resumeIfEnabled(bot);

    console.log('❤ Built with love by Apx');
    console.log('✅ Use the /painel command in a private chat with the bot to access admin controls');
}

// Graceful shutdown: pm2 restart sends SIGINT. Cleanly closing the open
// getUpdates long-poll releases Telegram's side immediately, so the next
// instance doesn't collide with a lingering connection (the burst of
// 502/ECONNRESET right after a restart). We do NOT persist a "stopped" state
// here, so auto-signals resume on the next boot.
let shuttingDown = false;
async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, closing polling connection before exit...`);
    try {
        // Don't let a hung stopPolling block the exit — cap it at 3s.
        await Promise.race([
            bot.stopPolling({ cancel: true }),
            new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
    } catch (err) {
        console.error('Error while stopping polling:', err.message);
    }
    process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startBot();
