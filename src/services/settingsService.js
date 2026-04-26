const fs = require("fs");
const path = require("path");

const settingsFilePath = path.join(__dirname, "..", "..", "settings.json");

const defaultSettings = {
	imageUrls: {
		green: "BAPIbL4.png",
		yellow: "njoarXh.png",
		red: "zS2yDav.png",
	},
	phrases: {
		entradaConfirmada: "✅Entry confirmed✅",
		buscarAte: "Target up to:",
		plataformaAbaixo: "🖥 Platform below~👇",
		entrarNaCasa: "✈Join the house✈",
	},
};

/**
 * @returns {typeof defaultSettings}
 */
function getSettings() {
	if (!fs.existsSync(settingsFilePath)) {
		fs.writeFileSync(
			settingsFilePath,
			JSON.stringify(defaultSettings, null, 2),
			"utf8",
		);
		return defaultSettings;
	}
	try {
		const settings = JSON.parse(fs.readFileSync(settingsFilePath, "utf8"));
		return settings;
	} catch (error) {
		console.error(
			"Failed to read settings file. Falling back to defaults.",
			error,
		);
		return defaultSettings;
	}
}

/**
 * Validates an image reference: either an https URL or a non-empty filename
 * (no path traversal, no slashes/backslashes).
 *
 * @param {string} value
 */
function validateImageRef(value) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error("Image reference cannot be empty.");
	}
	const v = value.trim();
	if (/^https?:\/\//i.test(v)) {
		return v;
	}
	if (/[\\/]|\.\./.test(v)) {
		throw new Error(
			"Filename must not contain slashes or '..'. Just the file name (e.g. green.png).",
		);
	}
	return v;
}

/**
 * @param {string} mainKey
 * @param {string} subKey
 * @param {string} value
 */
function updateSetting(mainKey, subKey, value) {
	const settings = getSettings();
	if (!settings[mainKey] || typeof settings[mainKey][subKey] === "undefined") {
		throw new Error(`Unknown setting: ${mainKey}.${subKey}`);
	}

	let cleanValue = typeof value === "string" ? value.trim() : value;
	if (mainKey === "imageUrls") {
		cleanValue = validateImageRef(cleanValue);
	} else if (typeof cleanValue !== "string" || !cleanValue) {
		throw new Error("Value cannot be empty.");
	}

	settings[mainKey][subKey] = cleanValue;
	fs.writeFileSync(
		settingsFilePath,
		JSON.stringify(settings, null, 2),
		"utf8",
	);
	console.log(`Setting updated: ${mainKey}.${subKey}`);
	return true;
}

module.exports = {
	getSettings,
	updateSetting,
};
