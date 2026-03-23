/**
 * ============================================================
 * POTTS Desktop — Home ViewModel
 * ============================================================
 * Handles the dashboard / home screen logic.
 * Displays system info, recent activity, and quick stats.
 * ============================================================
 */

/**
 * HomeViewModel — manages the home dashboard state.
 */
class HomeViewModel {
  constructor() {
    this.systemInfo = null;
    this.notesCount = 0;
    this.recentActions = [];
    this.securityEvents = 0;
    this.status = 'idle'; // idle, listening, processing, error
    this.greeting = this._getGreeting();
  }

  /**
   * Initializes the Home screen data.
   */
  async initialize() {
    try {
      await Promise.all([
        this.loadSystemInfo(),
        this.loadStats(),
      ]);
    } catch (err) {
      console.error('[HomeVM] Init failed:', err.message);
    }
  }

  /**
   * Loads system information.
   */
  async loadSystemInfo() {
    try {
      this.systemInfo = await window.potts.system.getInfo();
    } catch (err) {
      console.error('[HomeVM] System info error:', err.message);
    }
  }

  /**
   * Loads quick stats for the dashboard.
   */
  async loadStats() {
    try {
      const [notesCount, recentActions, securityLog] = await Promise.all([
        window.potts.notes.count(),
        window.potts.files.getActionLog(),
        window.potts.security.getLog(),
      ]);
      this.notesCount = notesCount;
      this.recentActions = recentActions.slice(0, 5);
      this.securityEvents = securityLog.length;
    } catch (err) {
      console.error('[HomeVM] Stats error:', err.message);
    }
  }

  /**
   * Returns a time-appropriate greeting.
   * @returns {string}
   */
  _getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  /**
   * Gets formatted uptime string.
   * @returns {string}
   */
  getUptimeString() {
    if (!this.systemInfo) return '--';
    const secs = this.systemInfo.uptime;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }

  /**
   * Gets memory usage percentage.
   * @returns {number}
   */
  getMemoryUsagePercent() {
    if (!this.systemInfo) return 0;
    const used = this.systemInfo.totalMemory - this.systemInfo.freeMemory;
    return Math.round((used / this.systemInfo.totalMemory) * 100);
  }

  /**
   * Gets formatted total memory.
   * @returns {string}
   */
  getTotalMemoryGB() {
    if (!this.systemInfo) return '--';
    return (this.systemInfo.totalMemory / (1024 ** 3)).toFixed(1) + ' GB';
  }

  /**
   * Updates the assistant status.
   * @param {string} newStatus - idle, listening, processing, error
   */
  setStatus(newStatus) {
    this.status = newStatus;
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HomeViewModel };
}
