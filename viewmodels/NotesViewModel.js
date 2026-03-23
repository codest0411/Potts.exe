/**
 * ============================================================
 * POTTS Desktop — Notes ViewModel
 * ============================================================
 * Handles notes UI state, CRUD operations, search, and export.
 * ============================================================
 */

/**
 * NotesViewModel — manages notes list state and operations.
 */
class NotesViewModel {
  constructor() {
    this.notes = [];
    this.filteredNotes = [];
    this.searchQuery = '';
    this.activeFilter = null; // null = all, or 'personal', 'work', 'todo'
    this.editingNoteId = null;
    this.loading = false;
    this.error = null;
  }

  /**
   * Initializes notes — loads all notes from storage.
   */
  async initialize() {
    this.loading = true;
    try {
      this.notes = await window.potts.notes.getAll();
      this._applyFilters();
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Creates a new note.
   * @param {string} title
   * @param {string} content
   * @param {string[]} [tags=[]]
   * @returns {Promise<Object>} Created note
   */
  async createNote(title, content, tags = []) {
    try {
      const note = await window.potts.notes.create({ title, content, tags });
      this.notes.unshift(note);
      this._applyFilters();
      return { success: true, note };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates an existing note.
   * @param {string} id
   * @param {Object} updates
   */
  async updateNote(id, updates) {
    try {
      const updated = await window.potts.notes.update({ id, updates });
      const idx = this.notes.findIndex(n => n.id === id);
      if (idx !== -1) this.notes[idx] = updated;
      this._applyFilters();
      this.editingNoteId = null;
      return { success: true, note: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Deletes a note with confirmation.
   * @param {string} id
   * @param {string} title - For confirmation display
   */
  async deleteNote(id, title) {
    const confirmed = await window.potts.dialog.confirm({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${title}"?\n\nThis cannot be undone.`,
    });

    if (!confirmed) return { success: false, cancelled: true };

    try {
      await window.potts.notes.delete(id);
      this.notes = this.notes.filter(n => n.id !== id);
      this._applyFilters();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Searches notes by keyword.
   * @param {string} query
   */
  async search(query) {
    this.searchQuery = query;
    if (!query || query.trim().length === 0) {
      this._applyFilters();
      return;
    }

    try {
      this.filteredNotes = await window.potts.notes.search(query);
      if (this.activeFilter) {
        this.filteredNotes = this.filteredNotes.filter(
          n => n.tags && n.tags.includes(this.activeFilter)
        );
      }
    } catch (err) {
      this.error = err.message;
    }
  }

  /**
   * Filters notes by tag.
   * @param {string|null} tag
   */
  setFilter(tag) {
    this.activeFilter = tag;
    this._applyFilters();
  }

  /**
   * Applies current search query and tag filter.
   */
  _applyFilters() {
    let result = [...this.notes];
    if (this.activeFilter) {
      result = result.filter(n => n.tags && n.tags.includes(this.activeFilter));
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
      );
    }
    this.filteredNotes = result;
  }

  /**
   * Sets a note as being edited.
   * @param {string|null} id
   */
  setEditing(id) {
    this.editingNoteId = id;
  }

  /**
   * Exports all notes to a text file.
   * @returns {Promise<Object>}
   */
  async exportNotes() {
    try {
      const exportPath = await window.potts.notes.export();
      return { success: true, path: exportPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Returns notes count by tag.
   * @returns {Object}
   */
  getTagCounts() {
    const counts = { all: this.notes.length, personal: 0, work: 0, todo: 0 };
    this.notes.forEach(n => {
      if (n.tags) {
        n.tags.forEach(t => {
          if (counts[t] !== undefined) counts[t]++;
        });
      }
    });
    return counts;
  }

  /**
   * Formats a date string for display.
   * @param {string} isoString
   * @returns {string}
   */
  formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotesViewModel };
}
