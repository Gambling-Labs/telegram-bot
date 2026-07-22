const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { getSettings, isSignalsEnabled, setSignalsEnabled } = require('./settingsService');

let signalInterval = null;

const IMAGES_DIR = path.join(__dirname, '..', '..', 'images');

/**
 * Resolves an image reference into something `bot.sendPhoto` can use.
 * - HTTP/HTTPS URLs are returned as-is.
 * - Anything else is treated as a filename inside the project's `images/` folder
 *   and returned as a readable stream.
 *
 * @param {string} imageRef
 * @returns {string | import('fs').ReadStream}
 */
function resolveImage(imageRef) {
    if (/^https?:\/\//i.test(imageRef)) {
        return imageRef;
    }
    const localPath = path.join(IMAGES_DIR, imageRef);
    if (!fs.existsSync(localPath)) {
        throw new Error(`Image file not found: ${localPath}`);
    }
    return fs.createReadStream(localPath);
}

/**
 * @returns {{multiplier: string, emoji: string, imageUrl: string}}
 */
function generateSignal() {
    const rand = Math.random();
    let multiplier, emoji, imageUrl;

    const { imageUrls } = getSettings();

    if (rand < 0.70) {
        multiplier = (Math.random() * (1.90 - 1.30) + 1.30).toFixed(2);
        emoji = '🟢';
        imageUrl = imageUrls.green;
    } else if (rand < 0.95) {
        multiplier = (Math.random() * (3.50 - 2.00) + 2.00).toFixed(2);
        emoji = '🟡';
        imageUrl = imageUrls.yellow;
    } else {
        multiplier = (Math.random() * (10.00 - 4.00) + 4.00).toFixed(2);
        emoji = '🔴';
        imageUrl = imageUrls.red;
    }
    
    return { multiplier, emoji, imageUrl };
}

/**
 * @param {TelegramBot} bot
 */
function sendSignal(bot) {
    const { multiplier, emoji, imageUrl } = generateSignal();
    
    const channelId = config.telegram.signalChannelId;
    const redirectUrl = config.telegram.redirectUrl;
    const { phrases } = getSettings();

    if (!channelId || !redirectUrl) {
        console.error("ERROR: Make sure SIGNAL_CHANNEL_ID and REDIRECT_URL are configured in .env");
        return;
    }

    const caption = `${phrases.entradaConfirmada}\n\n` +
                    `${emoji} ${phrases.buscarAte} \`${multiplier}x\`\n\n` +
                    `${phrases.plataformaAbaixo}`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: phrases.entrarNaCasa, url: redirectUrl }
            ]
        ]
    };

    let photo;
    try {
        photo = resolveImage(imageUrl);
    } catch (err) {
        console.error(`Failed to resolve image '${imageUrl}':`, err.message);
        return;
    }

    bot.sendPhoto(channelId, photo, {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: keyboard
    })
    .then(() => console.log(`Signal of ${multiplier}x (${emoji}) sent to channel ${channelId}.`))
    .catch(err => console.error(`Failed to send photo/signal to channel ${channelId}:`, err.message));
}

/**
 * @param {TelegramBot} bot
 * @param {{ persist?: boolean, immediate?: boolean }} [options]
 *        persist=false skips writing the enabled flag (used for auto-resume,
 *        where it's already true). immediate=false skips the leading signal so
 *        a crash-loop of restarts can't spam the channel out of cadence.
 */
function start(bot, { persist = true, immediate = true } = {}) {
    if (signalInterval) {
        console.log("Signal generator is already active.");
        return;
    }
    console.log("Starting signal generator with 3 minute interval...");

    // In-memory action first: a failed settings write must never leave the bot
    // "enabled" on disk while not actually sending.
    if (immediate) {
        sendSignal(bot);
    }
    signalInterval = setInterval(() => {
        sendSignal(bot);
    }, config.signalGenerator.signalIntervalSeconds * 1000);

    if (persist) {
        try {
            setSignalsEnabled(true);
        } catch (err) {
            console.error("Could not persist signals-enabled state:", err.message);
        }
    }
}

/**
 * @param {{ persist?: boolean }} [options] persist=false clears the in-memory
 *        interval without disabling auto-resume.
 */
function stop({ persist = true } = {}) {
    if (signalInterval) {
        clearInterval(signalInterval);
        signalInterval = null;
        console.log("Signal generator stopped.");
    } else {
        console.log("Signal generator was already stopped.");
    }

    if (persist) {
        try {
            setSignalsEnabled(false);
        } catch (err) {
            console.error("Could not persist signals-disabled state:", err.message);
        }
    }
}

/**
 * Resumes automatic signals on boot if they were enabled before the last
 * restart. Does not fire an immediate signal — the first one follows the normal
 * interval, so repeated restarts can't spam the channel. Called once at startup.
 *
 * @param {TelegramBot} bot
 */
function resumeIfEnabled(bot) {
    if (isSignalsEnabled() && !signalInterval) {
        console.log("↻ Auto-signals were enabled before restart — resuming (next signal on the normal 3 min cadence).");
        start(bot, { persist: false, immediate: false });
    }
}

/**
 * @returns {boolean}
 */
function isRunning() {
    return signalInterval !== null;
}

module.exports = {
    start,
    stop,
    sendSignal,
    resumeIfEnabled,
    isRunning
};