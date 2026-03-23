/**
 * ============================================================
 * POTTS Desktop — Files ViewModel
 * ============================================================
 * Handles file browser logic — listing, navigation,
 * and all CRUD file operations through the security guard.
 * ============================================================
 */

/**
 * FilesViewModel — manages the file browser state.
 */
class FilesViewModel {
  constructor() {
    this.currentPath = 'D:\\';
    this.items = [];
    this.actionLog = [];
    this.loading = false;
    this.error = null;
    this.breadcrumbs = [];
    this.sortBy = 'name'; // name, size, modified
    this.sortAsc = true;
  }

  /**
   * Initializes the file manager at the default drive.
   */
  async initialize(defaultDrive) {
    this.currentPath = defaultDrive || 'D:\\';
    await this.navigateTo(this.currentPath);
    await this.loadActionLog();
  }

  /**
   * Navigates to a directory and lists its contents.
   * @param {string} dirPath - Directory path
   */
  async navigateTo(dirPath) {
    this.loading = true;
    this.error = null;

    try {
      const result = await window.potts.files.list(dirPath);
      if (result.success) {
        this.currentPath = result.currentPath;
        this.items = this._sortItems(result.items);
        this._updateBreadcrumbs();
      } else {
        this.error = result.error;
      }
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Navigates up one directory level.
   */
  async navigateUp() {
    const parent = this.currentPath.replace(/\\[^\\]+\\?$/, '');
    const drive = this.currentPath.match(/^[A-Z]:\\/i)?.[0] || 'D:\\';
    const target = parent.length >= drive.length ? parent : drive;
    await this.navigateTo(target.endsWith('\\') ? target : target + '\\');
  }

  /**
   * Updates breadcrumb navigation array.
   */
  _updateBreadcrumbs() {
    const parts = this.currentPath.split('\\').filter(Boolean);
    this.breadcrumbs = [];
    let accum = '';
    parts.forEach((part, idx) => {
      accum += (idx === 0) ? part + '\\' : part + '\\';
      this.breadcrumbs.push({ label: part, path: accum });
    });
  }

  /**
   * Sorts items — directories first, then by selected criteria.
   */
  _sortItems(items) {
    return items.sort((a, b) => {
      // Directories always first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let cmp = 0;
      switch (this.sortBy) {
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'modified':
          cmp = new Date(a.modified) - new Date(b.modified);
          break;
        default:
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      return this.sortAsc ? cmp : -cmp;
    });
  }

  /**
   * Creates a new file or directory.
   * @param {string} name - File/directory name
   * @param {boolean} isDirectory - Whether to create a directory
   * @param {string} [content=''] - File content (for files)
   */
  async createItem(name, isDirectory = false, content = '') {
    const fullPath = this.currentPath + (this.currentPath.endsWith('\\') ? '' : '\\') + name;
    const result = await window.potts.files.create({ filePath: fullPath, content, isDirectory });
    if (result.success) {
      await this.navigateTo(this.currentPath);
      await this.loadActionLog();
    }
    return result;
  }

  /**
   * Reads a file's content.
   * @param {string} filePath
   * @returns {Promise<Object>}
   */
  async readFile(filePath) {
    return await window.potts.files.read(filePath);
  }

  /**
   * Writes content to a file.
   * @param {string} filePath
   * @param {string} content
   */
  async writeFile(filePath, content) {
    const result = await window.potts.files.write({ filePath, content });
    if (result.success) await this.loadActionLog();
    return result;
  }

  /**
   * Deletes a file or directory (with confirmation).
   * @param {string} filePath
   * @param {string} name - Display name for confirmation
   */
  async deleteItem(filePath, name) {
    const confirmed = await window.potts.dialog.confirm({
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`,
    });

    if (!confirmed) return { success: false, cancelled: true };

    const result = await window.potts.files.delete(filePath);
    if (result.success) {
      await this.navigateTo(this.currentPath);
      await this.loadActionLog();
    }
    return result;
  }

  /**
   * Renames a file or directory.
   * @param {string} oldPath - Current path
   * @param {string} newName - New name
   */
  async renameItem(oldPath, newName) {
    const result = await window.potts.files.rename({ oldPath, newName });
    if (result.success) {
      await this.navigateTo(this.currentPath);
      await this.loadActionLog();
    }
    return result;
  }

  /**
   * Copies a file.
   * @param {string} source
   * @param {string} destination
   */
  async copyItem(source, destination) {
    const result = await window.potts.files.copy({ source, destination });
    if (result.success) await this.loadActionLog();
    return result;
  }

  /**
   * Moves a file or directory.
   * @param {string} source
   * @param {string} destination
   */
  async moveItem(source, destination) {
    const confirmed = await window.potts.dialog.confirm({
      title: 'Move Confirmation',
      message: `Move this item?\n\nFrom: ${source}\nTo: ${destination}`,
    });

    if (!confirmed) return { success: false, cancelled: true };

    const result = await window.potts.files.move({ source, destination });
    if (result.success) {
      await this.navigateTo(this.currentPath);
      await this.loadActionLog();
    }
    return result;
  }

  /**
   * Loads the recent action log.
   */
  async loadActionLog() {
    try {
      this.actionLog = await window.potts.files.getActionLog();
    } catch {
      this.actionLog = [];
    }
  }

  /**
   * Gets file type icon based on extension.
   * @param {Object} item - File item
   * @returns {string} Icon character
   */
  getFileIcon(item) {
    if (item.isDirectory) return '📁';
    const ext = item.extension;
    const iconMap = {
      '.txt': '📄', '.md': '📝', '.log': '📋',
      '.js': '💛', '.ts': '💙', '.py': '🐍', '.java': '☕',
      '.html': '🌐', '.css': '🎨', '.json': '📦',
      '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️', '.svg': '🖼️',
      '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵',
      '.mp4': '🎬', '.mkv': '🎬', '.avi': '🎬',
      '.zip': '📦', '.rar': '📦', '.7z': '📦',
      '.exe': '⚙️', '.msi': '⚙️',
      '.pdf': '📕', '.doc': '📘', '.docx': '📘', '.xls': '📗', '.xlsx': '📗',
    };
    return iconMap[ext] || '📄';
  }

  /**
   * Formats bytes to human-readable string.
   * @param {number} bytes
   * @returns {string}
   */
  formatSize(bytes) {
    if (bytes === 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FilesViewModel };
}
