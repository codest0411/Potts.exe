/**
 * ============================================================
 * POTTS Desktop — Note Data Model
 * ============================================================
 * Defines the Note entity structure with validation.
 * ============================================================
 */

const { v4: uuidv4 } = require('uuid');

/** Valid tag values for notes */
const VALID_TAGS = ['personal', 'work', 'todo'];

/**
 * Note data model class.
 * Represents a single note with title, content, tags, and timestamps.
 */
class Note {
  /**
   * @param {Object} data - Note initialization data
   * @param {string} [data.id] - UUID (auto-generated if not provided)
   * @param {string} data.title - Note title (required)
   * @param {string} [data.content=''] - Note body content
   * @param {string[]} [data.tags=[]] - Array of tag names
   * @param {string} [data.createdAt] - ISO date string
   * @param {string} [data.updatedAt] - ISO date string
   */
  constructor({ id, title, content = '', tags = [], createdAt, updatedAt } = {}) {
    this.id = id || uuidv4();
    this.title = title ? String(title).trim() : 'Untitled Note';
    this.content = content ? String(content).trim() : '';
    this.tags = Array.isArray(tags) ? tags.filter(t => VALID_TAGS.includes(t)) : [];
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  /**
   * Updates the note fields and refreshes the updatedAt timestamp.
   * @param {Object} updates - Fields to update
   * @returns {Note} this
   */
  update(updates = {}) {
    if (updates.title !== undefined) this.title = String(updates.title).trim();
    if (updates.content !== undefined) this.content = String(updates.content).trim();
    if (updates.tags !== undefined) {
      this.tags = Array.isArray(updates.tags)
        ? updates.tags.filter(t => VALID_TAGS.includes(t))
        : this.tags;
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Checks if the note contains a specific tag.
   * @param {string} tag - Tag to check
   * @returns {boolean}
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }

  /**
   * Adds a tag to the note.
   * @param {string} tag - Tag to add
   * @returns {boolean} True if tag was added
   */
  addTag(tag) {
    if (VALID_TAGS.includes(tag) && !this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Removes a tag from the note.
   * @param {string} tag - Tag to remove
   * @returns {boolean} True if tag was removed
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Checks if the note matches a search query.
   * @param {string} query - Search string
   * @returns {boolean}
   */
  matchesSearch(query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(q) ||
      this.content.toLowerCase().includes(q) ||
      this.tags.some(t => t.includes(q))
    );
  }

  /**
   * Returns a plain object representation for JSON serialization.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      tags: [...this.tags],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Creates a Note instance from a plain object (e.g., from JSON).
   * @param {Object} data - Plain note data
   * @returns {Note}
   */
  static fromJSON(data) {
    return new Note(data);
  }
}

module.exports = { Note, VALID_TAGS };
