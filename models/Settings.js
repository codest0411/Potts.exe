/**
 * ============================================================
 * POTTS Desktop — Settings Data Model
 * ============================================================
 * Defines the application settings schema with defaults.
 * Settings stored at D:\POTTS_Data\settings.json
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// ─── CONSTANTS ─────────────────────────────────────────────

const POTTS_DATA_DIR = path.join('D:', 'POTTS_Data');
const SETTINGS_FILE_PATH = path.join(POTTS_DATA_DIR, 'settings.json');

/** Default settings object */
const DEFAULT_SETTINGS = {
  // API Configuration
  geminiApiKey: '',
  groqApiKey: '',
  aiProvider: 'gemini',     // 'gemini' or 'groq'
  geminiModel: 'gemini-2.0-flash',
  groqModel: 'llama-3.3-70b-versatile',

  // Voice Settings
  voiceSpeed: 1.0,        // 0.5 to 2.0
  voicePitch: 1.0,        // 0.0 to 2.0

  // Hotkey
  globalHotkey: 'CommandOrControl+Space',

  // Behavior
  autoStartOnBoot: false,
  alwaysOnTop: false,
  confirmDestructiveActions: true,

  // File Manager
  defaultDrive: 'D:\\',

  // Theme
  theme: 'dark',          // dark, light, ironman

  // Window
  windowWidth: 420,
  windowHeight: 680,
};

/** Available themes */
const THEMES = ['dark', 'light', 'ironman'];

/** Available AI Providers */
const AI_PROVIDERS = ['gemini', 'groq'];

/** Available drives */
const ALLOWED_DRIVES = ['D:\\', 'E:\\'];

// ─── SETTINGS CLASS ────────────────────────────────────────

/**
 * Settings model for the POTTS application.
 * Handles loading, saving, and validating settings.
 */
class Settings {
  /**
   * @param {Object} [data={}] - Initial settings values
   */
  constructor(data = {}) {
    // Merge defaults with provided data
    const merged = { ...DEFAULT_SETTINGS, ...data };

    this.geminiApiKey = String(merged.geminiApiKey || '');
    this.groqApiKey = String(merged.groqApiKey || '');
    this.aiProvider = AI_PROVIDERS.includes(merged.aiProvider) ? merged.aiProvider : 'gemini';
    this.geminiModel = String(merged.geminiModel || 'gemini-2.0-flash');
    this.groqModel = String(merged.groqModel || 'llama-3.3-70b-versatile');
    this.voiceSpeed = this._clamp(Number(merged.voiceSpeed) || 1.0, 0.5, 2.0);
    this.voicePitch = this._clamp(Number(merged.voicePitch) || 1.0, 0.0, 2.0);
    this.globalHotkey = String(merged.globalHotkey || 'CommandOrControl+Space');
    this.autoStartOnBoot = Boolean(merged.autoStartOnBoot);
    this.alwaysOnTop = Boolean(merged.alwaysOnTop);
    this.confirmDestructiveActions = merged.confirmDestructiveActions !== false;
    this.defaultDrive = ALLOWED_DRIVES.includes(merged.defaultDrive) ? merged.defaultDrive : 'D:\\';
    this.theme = THEMES.includes(merged.theme) ? merged.theme : 'dark';
    this.windowWidth = Number(merged.windowWidth) || 420;
    this.windowHeight = Number(merged.windowHeight) || 680;
  }

  /**
   * Clamps a number between min and max.
   * @private
   */
  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Updates settings with new values.
   * @param {Object} updates - Partial settings to update
   * @returns {Settings} this
   */
  update(updates = {}) {
    if (updates.geminiApiKey !== undefined) this.geminiApiKey = String(updates.geminiApiKey);
    if (updates.groqApiKey !== undefined) this.groqApiKey = String(updates.groqApiKey);
    if (updates.aiProvider !== undefined && AI_PROVIDERS.includes(updates.aiProvider)) this.aiProvider = updates.aiProvider;
    if (updates.geminiModel !== undefined) this.geminiModel = String(updates.geminiModel);
    if (updates.groqModel !== undefined) this.groqModel = String(updates.groqModel);
    if (updates.voiceSpeed !== undefined) this.voiceSpeed = this._clamp(Number(updates.voiceSpeed), 0.5, 2.0);
    if (updates.voicePitch !== undefined) this.voicePitch = this._clamp(Number(updates.voicePitch), 0.0, 2.0);
    if (updates.globalHotkey !== undefined) this.globalHotkey = String(updates.globalHotkey);
    if (updates.autoStartOnBoot !== undefined) this.autoStartOnBoot = Boolean(updates.autoStartOnBoot);
    if (updates.alwaysOnTop !== undefined) this.alwaysOnTop = Boolean(updates.alwaysOnTop);
    if (updates.confirmDestructiveActions !== undefined) this.confirmDestructiveActions = Boolean(updates.confirmDestructiveActions);
    if (updates.defaultDrive !== undefined && ALLOWED_DRIVES.includes(updates.defaultDrive)) this.defaultDrive = updates.defaultDrive;
    if (updates.theme !== undefined && THEMES.includes(updates.theme)) this.theme = updates.theme;
    if (updates.windowWidth !== undefined) this.windowWidth = Number(updates.windowWidth);
    if (updates.windowHeight !== undefined) this.windowHeight = Number(updates.windowHeight);
    return this;
  }

  /**
   * Resets all settings to defaults.
   * @returns {Settings} this
   */
  resetToDefaults() {
    Object.assign(this, new Settings(DEFAULT_SETTINGS));
    return this;
  }

  /**
   * Validates the current settings.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];
    if (this.voiceSpeed < 0.5 || this.voiceSpeed > 2.0) errors.push('Voice speed must be 0.5–2.0');
    if (this.voicePitch < 0.0 || this.voicePitch > 2.0) errors.push('Voice pitch must be 0.0–2.0');
    if (!THEMES.includes(this.theme)) errors.push('Invalid theme selected');
    if (!ALLOWED_DRIVES.includes(this.defaultDrive)) errors.push('Invalid default drive');
    return { valid: errors.length === 0, errors };
  }

  /**
   * Saves settings to disk.
   * @returns {Promise<void>}
   */
  async save() {
    try {
      if (!fs.existsSync(POTTS_DATA_DIR)) {
        fs.mkdirSync(POTTS_DATA_DIR, { recursive: true });
      }
      await fs.promises.writeFile(SETTINGS_FILE_PATH, JSON.stringify(this.toJSON(), null, 2), 'utf-8');
    } catch (err) {
      console.error('[Settings] Failed to save settings:', err.message);
      throw new Error('Failed to save settings.');
    }
  }

  /**
   * Loads settings from disk. Returns a new Settings instance.
   * @returns {Promise<Settings>}
   */
  static async load() {
    try {
      if (!fs.existsSync(SETTINGS_FILE_PATH)) {
        // Return defaults and save them
        const settings = new Settings();
        await settings.save();
        return settings;
      }
      const content = await fs.promises.readFile(SETTINGS_FILE_PATH, 'utf-8');
      const data = JSON.parse(content);
      return new Settings(data);
    } catch (err) {
      console.error('[Settings] Failed to load settings, using defaults:', err.message);
      return new Settings();
    }
  }

  /**
   * Returns a plain object for serialization.
   * @returns {Object}
   */
  toJSON() {
    return {
      geminiApiKey: this.geminiApiKey,
      groqApiKey: this.groqApiKey,
      aiProvider: this.aiProvider,
      geminiModel: this.geminiModel,
      groqModel: this.groqModel,
      voiceSpeed: this.voiceSpeed,
      voicePitch: this.voicePitch,
      globalHotkey: this.globalHotkey,
      autoStartOnBoot: this.autoStartOnBoot,
      alwaysOnTop: this.alwaysOnTop,
      confirmDestructiveActions: this.confirmDestructiveActions,
      defaultDrive: this.defaultDrive,
      theme: this.theme,
      windowWidth: this.windowWidth,
      windowHeight: this.windowHeight,
    };
  }
}

module.exports = {
  Settings,
  DEFAULT_SETTINGS,
  THEMES,
  AI_PROVIDERS,
  ALLOWED_DRIVES,
  SETTINGS_FILE_PATH,
};
