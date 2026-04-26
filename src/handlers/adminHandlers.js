const signalGenerator = require('../services/signalGenerator');
const { updateSetting } = require('../services/settingsService');
let adminState = {};

/**
 * @param {TelegramBot} bot
 * @param {number} chatId
 */
async function sendAdminPanel(bot, chatId) {
    const status = signalGenerator.isRunning() ? '🟢 Running' : '⏹️ Stopped';
    const caption = `✈️ **Control Panel - Aviator Signals**\n\nUse the buttons to manage the bot.\n\n**Current Status:** ${status}`;
    const keyboard = {
        inline_keyboard: [
            [
                { text: "▶️ Start Signals", callback_data: "admin_start_signals" },
                { text: "⏹️ Stop Signals", callback_data: "admin_stop_signals" }
            ],
            [
                { text: "📲 Send Manual Signal", callback_data: "admin_manual_signal" }
            ],
            [
                { text: "🖼️ Change Images", callback_data: "admin_menu_images" },
                { text: "📝 Change Phrases", callback_data: "admin_menu_phrases" }
            ],
            [
                { text: "🔄 Refresh Status", callback_data: "admin_refresh_panel" }
            ]
        ]
    };

    try {
        await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (error) {
        console.error("Failed to send admin panel:", error.message);
    }
}

function sendImageMenu(bot, chatId) {
    const text = "🖼️ **Change Images**\n\nSelect which signal image you want to change. You can send either a filename from the `images/` folder (e.g. `green.jpg`) or a public URL (https://...).";
    const keyboard = {
        inline_keyboard: [
            [{ text: "🔴 Low Signal Image", callback_data: "admin_set_image_red" }],
            [{ text: "🟡 Medium Signal Image", callback_data: "admin_set_image_yellow" }],
            [{ text: "🟢 High Signal Image", callback_data: "admin_set_image_green" }],
            [{ text: "⬅️ Back", callback_data: "admin_refresh_panel" }]
        ]
    };
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

function sendPhraseMenu(bot, chatId) {
    const text = "📝 **Change Phrases**\n\nSelect which signal phrase you want to change.";
    const keyboard = {
        inline_keyboard: [
            [{ text: "Phrase 1 (Entry Confirmed)", callback_data: "admin_set_phrase_1" }],
            [{ text: "Phrase 2 (Target up to:)", callback_data: "admin_set_phrase_2" }],
            [{ text: "Phrase 3 (Platform Below)", callback_data: "admin_set_phrase_3" }],
            [{ text: "Phrase 4 ('Join' Button)", callback_data: "admin_set_phrase_4" }],
            [{ text: "⬅️ Back", callback_data: "admin_refresh_panel" }]
        ]
    };
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

function requestAdminInput(bot, chatId, type) {
    let prompt;
    switch (type) {
        case 'image_red':
            prompt = "Send the new image for the 🔴 (Low) signal.\n\nOptions:\n• Filename in `images/` folder (e.g. `red.jpg`)\n• Public URL starting with https://";
            adminState[chatId] = { action: 'update_setting', mainKey: 'imageUrls', subKey: 'red' };
            break;
        case 'image_yellow':
            prompt = "Send the new image for the 🟡 (Medium) signal.\n\nOptions:\n• Filename in `images/` folder (e.g. `yellow.jpg`)\n• Public URL starting with https://";
            adminState[chatId] = { action: 'update_setting', mainKey: 'imageUrls', subKey: 'yellow' };
            break;
        case 'image_green':
            prompt = "Send the new image for the 🟢 (High) signal.\n\nOptions:\n• Filename in `images/` folder (e.g. `green.jpg`)\n• Public URL starting with https://";
            adminState[chatId] = { action: 'update_setting', mainKey: 'imageUrls', subKey: 'green' };
            break;
        case 'phrase_1':
            prompt = "Please send the new text for Phrase 1 (e.g.: ✅ Entry Confirmed ✅).";
            adminState[chatId] = { action: 'update_setting', mainKey: 'phrases', subKey: 'entradaConfirmada' };
            break;
        case 'phrase_2':
            prompt = "Please send the new text for Phrase 2 (e.g.: Target up to:).";
            adminState[chatId] = { action: 'update_setting', mainKey: 'phrases', subKey: 'buscarAte' };
            break;
        case 'phrase_3':
            prompt = "Please send the new text for Phrase 3 (e.g.: 🖥 Platform Below 👇).";
            adminState[chatId] = { action: 'update_setting', mainKey: 'phrases', subKey: 'plataformaAbaixo' };
            break;
        case 'phrase_4':
            prompt = "Please send the new text for the button (e.g.: ✈️ JOIN THE HOUSE ✈️).";
            adminState[chatId] = { action: 'update_setting', mainKey: 'phrases', subKey: 'entrarNaCasa' };
            break;
    }
    bot.sendMessage(chatId, prompt);
}


function registerAdminHandlers(bot, adminId) {
    bot.onText(/\/painel/, async (msg) => {
        if (msg.from.id !== adminId) return;
        delete adminState[msg.from.id];
        await sendAdminPanel(bot, adminId);
    });

    bot.on('message', async (msg) => {
        // Ignore non-admin or messages without an active admin state
        if (msg.from.id !== adminId || !adminState[msg.from.id]) return;

        // Ignore non-text messages (photos, stickers, etc.) — would crash on .startsWith
        if (typeof msg.text !== 'string') return;

        // Ignore commands
        if (msg.text.startsWith('/')) return;

        const state = adminState[msg.from.id];
        const newValue = msg.text.trim();

        if (!newValue) {
            await bot.sendMessage(adminId, "⚠️ Empty value. Please try again.");
            return;
        }

        try {
            if (state.action === 'update_setting') {
                updateSetting(state.mainKey, state.subKey, newValue);
                await bot.sendMessage(adminId, `✅ Setting '${state.subKey}' updated successfully!`);
            }
        } catch (err) {
            console.error('Failed to apply admin update:', err.message);
            await bot.sendMessage(adminId, `❌ Failed to update setting: ${err.message}`);
        } finally {
            delete adminState[msg.from.id];
            await sendAdminPanel(bot, adminId);
        }
    });

    bot.on('callback_query', (cbq) => {
        if (cbq.from.id !== adminId || !cbq.data.startsWith('admin_')) return;
        
        bot.answerCallbackQuery(cbq.id);
        const action = cbq.data;
        const chatId = cbq.message.chat.id;
        const messageId = cbq.message.message_id;

        bot.deleteMessage(chatId, messageId).catch(() => {});
        
        switch (action) {
            case 'admin_start_signals':
                if (signalGenerator.isRunning()) {
                    bot.sendMessage(adminId, "⚠️ The bot is already running.").then(() => sendAdminPanel(bot, adminId));
                } else {
                    signalGenerator.start(bot);
                    bot.sendMessage(adminId, "✅ Bot started! Signals will start being sent.").then(() => sendAdminPanel(bot, adminId));
                }
                break;

            case 'admin_stop_signals':
                if (!signalGenerator.isRunning()) {
                     bot.sendMessage(adminId, "⚠️ The bot was already stopped.").then(() => sendAdminPanel(bot, adminId));
                } else {
                    signalGenerator.stop();
                    bot.sendMessage(adminId, "🛑 Bot stopped. No automatic signals will be sent.").then(() => sendAdminPanel(bot, adminId));
                }
                break;

            case 'admin_manual_signal':
                bot.sendMessage(adminId, "📲 Sending a manual signal to the channel...").then(() => sendAdminPanel(bot, adminId));
                signalGenerator.sendSignal(bot);
                break;

            case 'admin_refresh_panel':
                 sendAdminPanel(bot, adminId);
                 break;

            case 'admin_menu_images':
                sendImageMenu(bot, adminId);
                break;
            
            case 'admin_menu_phrases':
                sendPhraseMenu(bot, adminId);
                break;

            case 'admin_set_image_red':
                requestAdminInput(bot, adminId, 'image_red');
                break;
            case 'admin_set_image_yellow':
                requestAdminInput(bot, adminId, 'image_yellow');
                break;
            case 'admin_set_image_green':
                requestAdminInput(bot, adminId, 'image_green');
                break;

            case 'admin_set_phrase_1':
                requestAdminInput(bot, adminId, 'phrase_1');
                break;
            case 'admin_set_phrase_2':
                requestAdminInput(bot, adminId, 'phrase_2');
                break;
            case 'admin_set_phrase_3':
                requestAdminInput(bot, adminId, 'phrase_3');
                break;
            case 'admin_set_phrase_4':
                requestAdminInput(bot, adminId, 'phrase_4');
                break;
        }
    });
}

module.exports = { registerAdminHandlers };