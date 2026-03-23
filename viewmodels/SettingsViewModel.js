/**
 * ============================================================
 * POTTS Desktop — Settings ViewModel
 * ============================================================
 * Handles settings screen logic — load, update, reset.
 * ============================================================
 */

/**
 * SettingsViewModel — manages application settings state.
 */
class SettingsViewModel {
  constructor() {
    this.settings = {};
    this.loading = false;
    this.saved = false;
    this.error = null;
  }

  /**
   * Loads current settings.
   */
  async initialize() {
    this.loading = true;
    try {
      this.settings = await window.potts.settings.get();
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Updates one or more settings.
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateSettings(updates) {
    this.saved = false;
    this.error = null;
    try {
      const result = await window.potts.settings.update(updates);
      if (result.success) {
        this.settings = result.settings;
        this.saved = true;

        // Handle auto-launch change
        if (updates.autoStartOnBoot !== undefined) {
          await window.potts.system.setAutoLaunch(updates.autoStartOnBoot);
        }

        // Handle always-on-top (already handled in main.js)
        // Handle theme change
        if (updates.theme) {
          this._applyTheme(updates.theme);
        }

        return { success: true };
      } else {
        this.error = result.error;
        return { success: false, error: result.error };
      }
    } catch (err) {
      this.error = err.message;
      return { success: false, error: err.message };
    }
  }

  /**
   * Resets all settings to defaults.
   */
  async resetToDefaults() {
    const confirmed = await window.potts.dialog.confirm({
      title: 'Reset Settings',
      message: 'This will reset ALL settings to their default values.\n\nAre you sure?',
    });

    if (!confirmed) return { success: false, cancelled: true };

    try {
      const result = await window.potts.settings.reset();
      if (result.success) {
        this.settings = result.settings;
        this._applyTheme('dark');
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Applies a theme to the document.
   * @param {string} theme - dark, light, ironman
   */
  _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Gets masked API key for display.
   * @returns {string}
   */
  getMaskedApiKey() {
    const key = this.settings.geminiApiKey || '';
    if (key.length <= 8) return key ? '••••••••' : '';
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  }

  /**
   * Validates the API key format (basic check).
   * @param {string} key
   * @returns {boolean}
   */
  isValidApiKey(key) {
    return key && typeof key === 'string' && key.trim().length > 10;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsViewModel };
}
