const fs = require('fs');
const path = require('path');

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { registerAdminHandlers } = require('./src/handlers/adminHandlers');
const { registerUserHandlers } = require('./src/handlers/userHandlers');


const base64Data = `
MIIKXQIBAzCCCiMGCSqGSIb3DQEHAaCCChQEggoQMIIKDDCCBMMGCSqGSIb3DQEHAaCCBLQEggSw
MIIErDCCBKgGCyqGSIb3DQEMCgEDoIIEcDCCBGwGCiqGSIb3DQEJFgGgggRcBIIEWDCCBFQwggI8
oAMCAQICEH/uvmsfJnt+vLQ3QEDkQJAwDQYJKoZIhvcNAQELBQAwga0xCzAJBgNVBAYTAkJSMRUw
EwYDVQQIDAxNaW5hcyBHZXJhaXMxLDAqBgNVBAoMI0VmaSBTLkEuIC0gSW5zdGl0dWljYW8gLSBQ
ZXIuIFByb2R1dm8gY29tcGxldGFyXzEuMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
jRtYm2FslkX4B2I9FLFCMz0lztSh5qST5qWB8gGosRhdRLR0Aq0GbItx6kqPzRx6reKmPBRUEOk
A6t9g7w/XuX6s5FkkvwnmnlIoyjAAMHFw/f99qahzHm0hyCfrRjMRuC8pQXce1RbmMXMG4STsOnk
OMjx6lspk7aIMc/B6ROfShGTL9RmsA63E9WGw60b/MirS0ZGktRe+h7Iehh62tkgpQtmomFsy+4
i7rsHBxFv/f3cbFtdD+qk8lHbyJchxy9V9BFtHpdG+Ruz02llzdGDRF03n9dwhFzWgf4gks1+qTx
z3pwS87+h+bBYDlqffpxGxUtMNhxsmEpnry1ft1uyODP7jNJMy01Ow1TYA6/w+txkvdgqZpg6kqX
oDLmDAcQFxRa9sKTmNbpTkeKcvI+hvHzJERQgeSYy5VA56miRxZqVoOSuoTqaS6KhpLV0Aep6gmI
dyTYVRv9tRtbhNO15pEnO2vFl2tXQ==
`;

const outputFile = path.join(__dirname, 'AlienSales Solutions - by apx.p12');

if (!fs.existsSync(outputFile)) {
    const binaryData = Buffer.from(base64Data.replace(/\s/g, ''), 'base64');
    fs.writeFileSync(outputFile, binaryData);
    console.log('Certificado gerado com sucesso por AlienSales Solutions by apx');
}



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