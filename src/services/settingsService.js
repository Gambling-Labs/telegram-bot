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
	// Whether automatic signals were running. Persisted so the bot resumes
	// them after a restart/crash instead of going silent until the admin
	// reopens /painel and clicks "Start" again.
	signalsRunning: false,
};

/**
 * A fresh, isolated copy of the defaults so callers never mutate the shared
 * module-level object.
 */
function cloneDefaults() {
	return JSON.parse(JSON.stringify(defaultSettings));
}

/**
 * Atomic write: serialize to a temp file then rename over the target. A crash
 * (e.g. SIGKILL) mid-write leaves the original file intact instead of a
 * truncated/corrupt JSON.
 *
 * @param {object} settings
 */
function writeSettings(settings) {
	const tmpPath = `${settingsFilePath}.tmp`;
	fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2), "utf8");
	fs.renameSync(tmpPath, settingsFilePath);
}

/**
 * @returns {typeof defaultSettings}
 */
function getSettings() {
	if (!fs.existsSync(settingsFilePath)) {
		const fresh = cloneDefaults();
		writeSettings(fresh);
		return fresh;
	}
	try {
		const settings = JSON.parse(fs.readFileSync(settingsFilePath, "utf8"));
		return settings;
	} catch (error) {
		console.error(
			"Failed to read settings file. Falling back to defaults.",
			error,
		);
		return cloneDefaults();
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
	writeSettings(settings);
	console.log(`Setting updated: ${mainKey}.${subKey}`);
	return true;
}

/**
 * @returns {boolean} whether automatic signals were enabled before.
 */
function isSignalsEnabled() {
	return getSettings().signalsRunning === true;
}

/**
 * Persists whether automatic signals are enabled, so the state survives
 * restarts. Merges into the existing settings file without touching other keys.
 *
 * @param {boolean} enabled
 * @returns {boolean} the value that was persisted.
 */
function setSignalsEnabled(enabled) {
	const settings = getSettings();
	settings.signalsRunning = enabled === true;
	writeSettings(settings);
	return settings.signalsRunning;
}

module.exports = {
	getSettings,
	updateSetting,
	isSignalsEnabled,
	setSignalsEnabled,
};
