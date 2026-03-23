/**
 * ============================================================
 * POTTS Desktop — Electron Main Process
 * ============================================================
 * Handles window creation, IPC communication, system tray,
 * global hotkeys, and all Node.js-side operations.
 * ============================================================
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, dialog, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const securityGuard = require('./security-guard');
const notesManager = require('./notes-manager');
const { Settings } = require('./models/Settings');
const { FileAction } = require('./models/FileAction');

// ─── GLOBALS ────────────────────────────────────────────────

let mainWindow = null;
let tray = null;
let appSettings = null;
let actionLog = [];

const POTTS_DATA_DIR = path.join('D:', 'POTTS_Data');
const ACTION_LOG_PATH = path.join(POTTS_DATA_DIR, 'action_log.json');

// ─── DATA DIRECTORY SETUP ──────────────────────────────────

/**
 * Ensures all required data directories and files exist.
 */
function ensureDataStructure() {
  try {
    if (!fs.existsSync(POTTS_DATA_DIR)) {
      fs.mkdirSync(POTTS_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ACTION_LOG_PATH)) {
      fs.writeFileSync(ACTION_LOG_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[Main] Failed to ensure data structure:', err.message);
  }
}

// ─── ACTION LOG ────────────────────────────────────────────

/**
 * Loads the action log from disk.
 */
async function loadActionLog() {
  try {
    if (fs.existsSync(ACTION_LOG_PATH)) {
      const content = await fs.promises.readFile(ACTION_LOG_PATH, 'utf-8');
      actionLog = JSON.parse(content);
    }
  } catch (err) {
    actionLog = [];
  }
}

/**
 * Saves the action log to disk (keeps last 100 entries).
 */
async function saveActionLog() {
  try {
    const trimmed = actionLog.slice(0, 100);
    await fs.promises.writeFile(ACTION_LOG_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Main] Failed to save action log:', err.message);
  }
}

/**
 * Adds an entry to the action log.
 */
function addActionLog(type, filePath, success = true, message = '', destination = null) {
  const action = new FileAction({ type, path: filePath, destination, success, message });
  actionLog.unshift(action.toJSON());
  if (actionLog.length > 100) actionLog = actionLog.slice(0, 100);
  saveActionLog();
  return action;
}

// ─── WINDOW CREATION ───────────────────────────────────────

/**
 * Creates the main application window.
 */
async function createWindow() {
  appSettings = await Settings.load();

  mainWindow = new BrowserWindow({
    width: appSettings.windowWidth || 420,
    height: appSettings.windowHeight || 680,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    show: true,
    backgroundColor: '#0a0a0f',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (appSettings.alwaysOnTop) {
      mainWindow.setAlwaysOnTop(true);
    }
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Save window dimensions on resize
  mainWindow.on('resized', () => {
    const [width, height] = mainWindow.getSize();
    if (appSettings) {
      appSettings.windowWidth = width;
      appSettings.windowHeight = height;
      appSettings.save().catch(() => {});
    }
  });
}

/**
 * Returns the app icon path.
 */
function getIconPath() {
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(icoPath)) return icoPath;
  if (fs.existsSync(pngPath)) return pngPath;
  return undefined;
}

// ─── SYSTEM TRAY ───────────────────────────────────────────

/**
 * Creates the system tray icon and context menu.
 */
function createTray() {
  const iconPath = getIconPath();
  let trayIcon;
  
  if (iconPath && fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a simple default icon
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('POTTS Desktop — AI Assistant');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open POTTS',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('navigate', 'settings');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Restart',
      click: () => {
        app.isQuitting = true;
        app.relaunch();
        app.exit(0);
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── GLOBAL HOTKEY ─────────────────────────────────────────

/**
 * Registers the global hotkey to toggle the POTTS window.
 */
function registerGlobalHotkey() {
  const hotkey = appSettings?.globalHotkey || 'CommandOrControl+Space';
  
  try {
    globalShortcut.unregisterAll();
    globalShortcut.register(hotkey, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (err) {
    console.error('[Main] Failed to register global hotkey:', err.message);
  }
}

// ─── IPC HANDLERS ──────────────────────────────────────────

function setupIpcHandlers() {

  // ── Window Controls ───────────────────────────────────────
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.hide());

  // ── Settings ──────────────────────────────────────────────
  ipcMain.handle('settings:get', async () => {
    if (!appSettings) appSettings = await Settings.load();
    return appSettings.toJSON();
  });

  ipcMain.handle('settings:update', async (_, updates) => {
    try {
      appSettings.update(updates);
      await appSettings.save();

      // Apply live settings
      if (updates.alwaysOnTop !== undefined) {
        mainWindow?.setAlwaysOnTop(updates.alwaysOnTop);
      }
      if (updates.globalHotkey) {
        registerGlobalHotkey();
      }

      return { success: true, settings: appSettings.toJSON() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:reset', async () => {
    try {
      appSettings.resetToDefaults();
      await appSettings.save();
      mainWindow?.setAlwaysOnTop(false);
      registerGlobalHotkey();
      return { success: true, settings: appSettings.toJSON() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Security ──────────────────────────────────────────────
  ipcMain.handle('security:validate', async (_, { path: targetPath, command, action }) => {
    return await securityGuard.validate({ path: targetPath, command, action, source: 'renderer' });
  });

  ipcMain.handle('security:getLog', async () => {
    return await securityGuard.getSecurityLog();
  });

  ipcMain.handle('security:clearLog', async () => {
    return await securityGuard.clearSecurityLog();
  });

  ipcMain.handle('security:exportLog', async () => {
    return await securityGuard.exportSecurityLog();
  });

  ipcMain.handle('security:getDriveStatus', () => {
    return securityGuard.getDriveAccessStatus();
  });

  // ── Notes ─────────────────────────────────────────────────
  ipcMain.handle('notes:getAll', async (_, filterTag) => {
    return await notesManager.getAllNotes(filterTag);
  });

  ipcMain.handle('notes:create', async (_, { title, content, tags }) => {
    return await notesManager.createNote(title, content, tags);
  });

  ipcMain.handle('notes:update', async (_, { id, updates }) => {
    return await notesManager.updateNote(id, updates);
  });

  ipcMain.handle('notes:delete', async (_, id) => {
    return await notesManager.deleteNote(id);
  });

  ipcMain.handle('notes:search', async (_, query) => {
    return await notesManager.searchNotes(query);
  });

  ipcMain.handle('notes:export', async () => {
    return await notesManager.exportNotes();
  });

  ipcMain.handle('notes:count', async () => {
    return await notesManager.getNotesCount();
  });

  // ── File Operations ───────────────────────────────────────
  ipcMain.handle('files:list', async (_, dirPath) => {
    try {
      const validation = await securityGuard.validate({ path: dirPath, source: 'file-manager' });
      if (!validation.allowed) {
        addActionLog('list', dirPath, false, validation.message);
        return { success: false, error: validation.message };
      }

      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const items = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stats = await fs.promises.stat(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtime.toISOString(),
            extension: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase(),
          };
        } catch {
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: 0,
            modified: '',
            extension: '',
          };
        }
      }));

      addActionLog('list', dirPath, true, `Listed ${items.length} items`);
      return { success: true, items, currentPath: dirPath };
    } catch (err) {
      addActionLog('list', dirPath, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:read', async (_, filePath) => {
    try {
      const validation = await securityGuard.validate({ path: filePath, source: 'file-manager' });
      if (!validation.allowed) return { success: false, error: validation.message };

      const content = await fs.promises.readFile(filePath, 'utf-8');
      addActionLog('read', filePath, true);
      return { success: true, content };
    } catch (err) {
      addActionLog('read', filePath, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:create', async (_, { filePath, content, isDirectory }) => {
    try {
      const validation = await securityGuard.validate({ path: filePath, action: 'create', source: 'file-manager' });
      if (!validation.allowed) return { success: false, error: validation.message };

      if (isDirectory) {
        await fs.promises.mkdir(filePath, { recursive: true });
      } else {
        await fs.promises.writeFile(filePath, content || '', 'utf-8');
      }
      addActionLog('create', filePath, true);
      return { success: true };
    } catch (err) {
      addActionLog('create', filePath, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:write', async (_, { filePath, content }) => {
    try {
      const validation = await securityGuard.validate({ path: filePath, action: 'edit', source: 'file-manager' });
      if (!validation.allowed) return { success: false, error: validation.message };

      await fs.promises.writeFile(filePath, content, 'utf-8');
      addActionLog('edit', filePath, true);
      return { success: true };
    } catch (err) {
      addActionLog('edit', filePath, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:delete', async (_, filePath) => {
    try {
      const validation = await securityGuard.validate({ path: filePath, action: 'delete', source: 'file-manager' });
      if (!validation.allowed) return { success: false, error: validation.message };

      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        await fs.promises.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(filePath);
      }
      addActionLog('delete', filePath, true);
      return { success: true };
    } catch (err) {
      addActionLog('delete', filePath, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:rename', async (_, { oldPath, newName }) => {
    try {
      const validation = await securityGuard.validate({ path: oldPath, action: 'rename', source: 'file-manager' });
      if (!validation.allowed) return { success: false, error: validation.message };

      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, newName);

      const newValidation = await securityGuard.validate({ path: newPath, source: 'file-manager' });
      if (!newValidation.allowed) return { success: false, error: newValidation.message };

      await fs.promises.rename(oldPath, newPath);
      addActionLog('rename', oldPath, true, `Renamed to ${newName}`, newPath);
      return { success: true, newPath };
    } catch (err) {
      addActionLog('rename', oldPath, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:copy', async (_, { source, destination }) => {
    try {
      const srcValidation = await securityGuard.validate({ path: source, source: 'file-manager' });
      if (!srcValidation.allowed) return { success: false, error: srcValidation.message };

      const destValidation = await securityGuard.validate({ path: destination, source: 'file-manager' });
      if (!destValidation.allowed) return { success: false, error: destValidation.message };

      await fs.promises.copyFile(source, destination);
      addActionLog('copy', source, true, '', destination);
      return { success: true };
    } catch (err) {
      addActionLog('copy', source, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:move', async (_, { source, destination }) => {
    try {
      const srcValidation = await securityGuard.validate({ path: source, action: 'move', source: 'file-manager' });
      if (!srcValidation.allowed) return { success: false, error: srcValidation.message };

      const destValidation = await securityGuard.validate({ path: destination, source: 'file-manager' });
      if (!destValidation.allowed) return { success: false, error: destValidation.message };

      await fs.promises.rename(source, destination);
      addActionLog('move', source, true, '', destination);
      return { success: true };
    } catch (err) {
      addActionLog('move', source, false, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('files:getActionLog', async () => {
    return actionLog.slice(0, 10);
  });

  // ── System Commands ───────────────────────────────────────
  ipcMain.handle('system:execute', async (_, command) => {
    try {
      const validation = await securityGuard.validate({ command, source: 'system-control' });
      if (!validation.allowed) {
        return { success: false, error: validation.message };
      }

      return new Promise((resolve) => {
        exec(command, { timeout: 10000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, output: stdout || stderr });
          }
        });
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('system:getInfo', async () => {
    const os = require('os');
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      userInfo: os.userInfo().username,
    };
  });

  ipcMain.handle('system:openExternal', async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Confirmation Dialog ───────────────────────────────────
  ipcMain.handle('dialog:confirm', async (_, { title, message }) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: title || 'Confirm Action',
      message: message || 'Are you sure you want to proceed?',
      buttons: ['Cancel', 'Confirm'],
      defaultId: 0,
      cancelId: 0,
    });
    return result.response === 1;
  });
}

// ─── AUTO-LAUNCH ───────────────────────────────────────────

/**
 * Configures auto-launch on Windows boot.
 */
async function configureAutoLaunch(enable) {
  try {
    const AutoLaunch = require('auto-launch');
    const autoLauncher = new AutoLaunch({
      name: 'POTTS Desktop',
      path: app.getPath('exe'),
    });

    if (enable) {
      await autoLauncher.enable();
    } else {
      await autoLauncher.disable();
    }
  } catch (err) {
    console.error('[Main] Auto-launch config failed:', err.message);
  }
}

// ─── APP LIFECYCLE ─────────────────────────────────────────

app.whenReady().then(async () => {
  ensureDataStructure();
  await loadActionLog();
  await createWindow();
  createTray();
  registerGlobalHotkey();
  setupIpcHandlers();

  // Handle auto launch setting
  ipcMain.handle('system:setAutoLaunch', async (_, enable) => {
    await configureAutoLaunch(enable);
    return { success: true };
  });
});

app.on('window-all-closed', () => {
  // Don't quit — keep in tray
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
