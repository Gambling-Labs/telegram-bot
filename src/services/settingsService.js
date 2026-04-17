const fs = require('fs');
const path = require('path');

const settingsFilePath = path.join(__dirname, '..', '..', 'settings.json');

const defaultSettings = {
  imageUrls: {
    green: 'https://i.imgur.com/BAPIbL4.jpeg',
    yellow: 'https://i.imgur.com/njoarXh.jpeg',
    red: 'https://i.imgur.com/zS2yDav.jpeg'
  },
  phrases: {
    entradaConfirmada: "✅Entry confirmed✅",
    buscarAte: "Target up to:",
    plataformaAbaixo: "🖥 Platform below~👇",
    entrarNaCasa: "✈Join the house✈"
  }
};

/**
 * @returns {typeof defaultSettings}
 */
function getSettings() {
  if (!fs.existsSync(settingsFilePath)) {
    fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    return defaultSettings;
  }
  try {
    const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    return settings;
  } catch (error) {
    console.error("Failed to read settings file. Falling back to defaults.", error);
    return defaultSettings;
  }
}

/**
 * @param {string} mainKey
 * @param {string} subKey
 * @param {string} value
 */
function updateSetting(mainKey, subKey, value) {
  const settings = getSettings();
  if (settings[mainKey] && typeof settings[mainKey][subKey] !== 'undefined') {
    settings[mainKey][subKey] = value;
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`Setting updated: ${mainKey}.${subKey}`);
    return true;
  }
  return false;
}

module.exports = {
  getSettings,
  updateSetting
};