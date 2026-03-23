/**
 * ============================================================
 * POTTS Desktop — Preload Script (Context Bridge)
 * ============================================================
 * Exposes secure IPC channels to the renderer process.
 * Only whitelisted APIs are bridged — no raw Node.js access.
 * ============================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * POTTS API — exposed to the renderer via window.potts
 * All methods use IPC invoke (async) or IPC send (fire-and-forget).
 */
contextBridge.exposeInMainWorld('potts', {

  // ── Window Controls ─────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // ── Settings ────────────────────────────────────────────
  settings: {
    /** @returns {Promise<Object>} Current settings */
    get: () => ipcRenderer.invoke('settings:get'),
    /** @param {Object} updates - Settings to update */
    update: (updates) => ipcRenderer.invoke('settings:update', updates),
    /** Reset all settings to defaults */
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  // ── Security ────────────────────────────────────────────
  security: {
    /** Validate a path/command before execution */
    validate: (opts) => ipcRenderer.invoke('security:validate', opts),
    /** Get security log entries */
    getLog: () => ipcRenderer.invoke('security:getLog'),
    /** Clear the security log */
    clearLog: () => ipcRenderer.invoke('security:clearLog'),
    /** Export security log to file */
    exportLog: () => ipcRenderer.invoke('security:exportLog'),
    /** Get drive access status */
    getDriveStatus: () => ipcRenderer.invoke('security:getDriveStatus'),
  },

  // ── Notes ───────────────────────────────────────────────
  notes: {
    /** @returns {Promise<Array>} All notes */
    getAll: (filterTag) => ipcRenderer.invoke('notes:getAll', filterTag),
    /** Create a new note */
    create: (data) => ipcRenderer.invoke('notes:create', data),
    /** Update an existing note */
    update: (data) => ipcRenderer.invoke('notes:update', data),
    /** Delete a note by ID */
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
    /** Search notes by keyword */
    search: (query) => ipcRenderer.invoke('notes:search', query),
    /** Export notes to text file */
    export: () => ipcRenderer.invoke('notes:export'),
    /** Get total notes count */
    count: () => ipcRenderer.invoke('notes:count'),
  },

  // ── File Operations ─────────────────────────────────────
  files: {
    /** List directory contents */
    list: (dirPath) => ipcRenderer.invoke('files:list', dirPath),
    /** Read file contents */
    read: (filePath) => ipcRenderer.invoke('files:read', filePath),
    /** Create a file or directory */
    create: (data) => ipcRenderer.invoke('files:create', data),
    /** Write content to a file */
    write: (data) => ipcRenderer.invoke('files:write', data),
    /** Delete a file or directory */
    delete: (filePath) => ipcRenderer.invoke('files:delete', filePath),
    /** Rename a file or directory */
    rename: (data) => ipcRenderer.invoke('files:rename', data),
    /** Copy a file */
    copy: (data) => ipcRenderer.invoke('files:copy', data),
    /** Move a file */
    move: (data) => ipcRenderer.invoke('files:move', data),
    /** Get recent action log */
    getActionLog: () => ipcRenderer.invoke('files:getActionLog'),
  },

  // ── System ──────────────────────────────────────────────
  system: {
    /** Execute a validated system command */
    execute: (command) => ipcRenderer.invoke('system:execute', command),
    /** Get system information */
    getInfo: () => ipcRenderer.invoke('system:getInfo'),
    /** Open a URL in external browser */
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
    /** Set auto-launch on boot */
    setAutoLaunch: (enable) => ipcRenderer.invoke('system:setAutoLaunch', enable),
  },

  // ── Dialogs ─────────────────────────────────────────────
  dialog: {
    /** Show a confirmation dialog */
    confirm: (opts) => ipcRenderer.invoke('dialog:confirm', opts),
  },

  // ── Event Listeners ─────────────────────────────────────
  on: {
    /** Listen for navigation events from main process */
    navigate: (callback) => ipcRenderer.on('navigate', (_, page) => callback(page)),
  },
});
