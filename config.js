require('dotenv').config();

module.exports = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    adminId: parseInt(process.env.ADMIN_USER_ID, 10),
    signalChannelId: process.env.SIGNAL_CHANNEL_ID,
    redirectUrl: process.env.REDIRECT_URL,
  },
  signalGenerator: {
    signalIntervalSeconds: 180,
  }
};