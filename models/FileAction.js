/**
 * ============================================================
 * POTTS Desktop — FileAction Data Model
 * ============================================================
 * Represents a single file operation for the action log.
 * ============================================================
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Valid file action types.
 */
const ACTION_TYPES = [
  'read', 'create', 'edit', 'copy', 'move', 'rename', 'delete',
  'list', 'open', 'blocked',
];

/**
 * FileAction model — logs a single file operation.
 */
class FileAction {
  /**
   * @param {Object} data - Action data
   * @param {string} [data.id] - UUID
   * @param {string} data.type - Action type (read, create, edit, etc.)
   * @param {string} data.path - Target file/directory path
   * @param {string} [data.destination] - Destination path (for copy/move)
   * @param {boolean} [data.success=true] - Whether the action succeeded
   * @param {string} [data.message=''] - Result message or error
   * @param {string} [data.timestamp] - ISO timestamp
   */
  constructor({ id, type, path: filePath, destination, success = true, message = '', timestamp } = {}) {
    this.id = id || uuidv4();
    this.type = ACTION_TYPES.includes(type) ? type : 'unknown';
    this.path = filePath || '';
    this.destination = destination || null;
    this.success = Boolean(success);
    this.message = String(message);
    this.timestamp = timestamp || new Date().toISOString();
  }

  /**
   * Returns a user-friendly description of the action.
   * @returns {string}
   */
  describe() {
    const icon = this.success ? '✅' : '❌';
    const dest = this.destination ? ` → ${this.destination}` : '';
    return `${icon} [${this.type.toUpperCase()}] ${this.path}${dest}`;
  }

  /**
   * Returns a plain object for JSON serialization.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      path: this.path,
      destination: this.destination,
      success: this.success,
      message: this.message,
      timestamp: this.timestamp,
    };
  }

  /**
   * Creates a FileAction from a plain object.
   * @param {Object} data
   * @returns {FileAction}
   */
  static fromJSON(data) {
    return new FileAction(data);
  }
}

module.exports = { FileAction, ACTION_TYPES };
