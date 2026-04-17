const config = require('../../config');

function registerUserHandlers(bot, adminId) {
    bot.onText(/\/start/, (msg) => {
        if (msg.from.id === adminId) return; 
        
        const welcomeMessage = "👋 Welcome to the **Aviator Signals Bot**!\n\n" +
                               "This bot sends signals for the Aviator game in an exclusive channel.\n\n" +
                               `To access the signals, join our channel: ${config.telegram.signalChannelId}`;
        
        bot.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
    });
}

module.exports = { registerUserHandlers };