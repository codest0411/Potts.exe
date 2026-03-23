/**
 * ============================================================
 * POTTS Desktop — Security Guard Module
 * ============================================================
 * Hardcoded security rules that CANNOT be bypassed.
 * Blocks all access to C:\ drive and dangerous system commands.
 * Logs all blocked attempts to D:\POTTS_Data\security.log
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// ─── CONSTANTS ─────────────────────────────────────────────

/** Data directory for POTTS on the safe drive */
const POTTS_DATA_DIR = path.join('D:', 'POTTS_Data');

/** Security log file path */
const SECURITY_LOG_PATH = path.join(POTTS_DATA_DIR, 'security.log');

/** 
 * Blocked path patterns — any path containing these strings is denied.
 * All comparisons are case-insensitive.
 */
const BLOCKED_PATH_PATTERNS = [
  'c:\\',
  'c:/',
  '\\windows\\',
  '/windows/',
  '\\system32\\',
  '/system32/',
  '\\program files\\',
  '/program files/',
  '\\program files (x86)\\',
  '/program files (x86)/',
  '\\users\\',
  '/users/',
  '\\appdata\\',
  '/appdata/',
  '%systemroot%',
  '%windir%',
  '%programfiles%',
  '%programdata%',
  '%userprofile%',
  '%homedrive%',
  '%homepath%',
];

/**
 * Dangerous command patterns — any command containing these is blocked.
 * Matched case-insensitively against full command string.
 */
const DANGEROUS_COMMAND_PATTERNS = [
  'format ',
  'format\t',
  'del /s /q c:',
  'del /s /q "c:',
  'rmdir /s c:',
  'rmdir /s "c:',
  'rmdir /s /q c:',
  'rmdir /s /q "c:',
  'reg delete',
  'bcdedit',
  'diskpart',
  'netsh firewall',
  'netsh advfirewall',
  'taskkill /im explorer',
  'taskkill /f /im explorer',
  'rd /s /q c:',
  'rd /s /q "c:',
  'cipher /w:c:',
  'sfc /scannow',
  'takeown /f c:',
  'icacls c:',
  'powershell -command remove-item c:',
  'remove-item c:\\',
  'remove-item "c:\\',
  'rm -rf c:',
  'rm -rf /c',
  'del /f /s /q c:',
  'shutdown',
  'restart',
];

/**
 * Commands that require explicit user confirmation before execution.
 */
const DESTRUCTIVE_ACTIONS = [
  'delete',
  'remove',
  'move',
  'shutdown',
  'restart',
  'format',
  'rename',
];

// ─── ACCESS DENIED MESSAGE ─────────────────────────────────

const ACCESS_DENIED_MESSAGE = "Access Denied: C:\\ drive is restricted for your protection, Sir.";
const DANGEROUS_CMD_MESSAGE = "Command Blocked: This command has been flagged as dangerous and cannot be executed, Sir.";

// ─── HELPER FUNCTIONS ──────────────────────────────────────

/**
 * Ensures the POTTS_Data directory exists on D:\
 * @returns {void}
 */
function ensureDataDirectory() {
  try {
    if (!fs.existsSync(POTTS_DATA_DIR)) {
      fs.mkdirSync(POTTS_DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[SecurityGuard] Failed to create data directory:', err.message);
  }
}

/**
 * Logs a security event to the security log file.
 * @param {string} eventType - Type of event (BLOCKED_PATH, BLOCKED_CMD, etc.)
 * @param {string} detail - Details of the blocked action
 * @param {string} [source='unknown'] - Source of the action (voice, file-manager, etc.)
 * @returns {Promise<void>}
 */
async function logSecurityEvent(eventType, detail, source = 'unknown') {
  try {
    ensureDataDirectory();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${eventType}] [Source: ${source}] ${detail}\n`;
    await fs.promises.appendFile(SECURITY_LOG_PATH, logEntry, 'utf-8');
  } catch (err) {
    console.error('[SecurityGuard] Failed to write security log:', err.message);
  }
}

/**
 * Reads all security log entries.
 * @returns {Promise<string[]>} Array of log lines
 */
async function getSecurityLog() {
  try {
    ensureDataDirectory();
    if (!fs.existsSync(SECURITY_LOG_PATH)) {
      return [];
    }
    const content = await fs.promises.readFile(SECURITY_LOG_PATH, 'utf-8');
    return content.split('\n').filter(line => line.trim().length > 0);
  } catch (err) {
    console.error('[SecurityGuard] Failed to read security log:', err.message);
    return [];
  }
}

/**
 * Clears the security log file.
 * @returns {Promise<boolean>}
 */
async function clearSecurityLog() {
  try {
    ensureDataDirectory();
    await fs.promises.writeFile(SECURITY_LOG_PATH, '', 'utf-8');
    return true;
  } catch (err) {
    console.error('[SecurityGuard] Failed to clear security log:', err.message);
    return false;
  }
}

/**
 * Exports the security log to D:\POTTS_Data\security_export.log
 * @returns {Promise<string>} Path to the exported file
 */
async function exportSecurityLog() {
  try {
    const exportPath = path.join(POTTS_DATA_DIR, 'security_export.log');
    const logContent = await fs.promises.readFile(SECURITY_LOG_PATH, 'utf-8');
    const header = `POTTS Desktop — Security Log Export\nGenerated: ${new Date().toISOString()}\n${'='.repeat(60)}\n\n`;
    await fs.promises.writeFile(exportPath, header + logContent, 'utf-8');
    return exportPath;
  } catch (err) {
    console.error('[SecurityGuard] Failed to export security log:', err.message);
    throw new Error('Failed to export security log');
  }
}

// ─── CORE VALIDATION FUNCTIONS ─────────────────────────────

/**
 * Checks if a file path targets a blocked/protected location.
 * @param {string} targetPath - The path to validate
 * @returns {{ safe: boolean, message: string }}
 */
function validatePath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    return { safe: false, message: 'Invalid path provided.' };
  }

  const normalizedPath = targetPath.toLowerCase().replace(/\//g, '\\');

  // Check if path starts with C:\ 
  if (normalizedPath.startsWith('c:\\') || normalizedPath.startsWith('c:/') || normalizedPath === 'c:') {
    return { safe: false, message: ACCESS_DENIED_MESSAGE };
  }

  // Check against all blocked patterns
  for (const pattern of BLOCKED_PATH_PATTERNS) {
    if (normalizedPath.includes(pattern.toLowerCase())) {
      return { safe: false, message: ACCESS_DENIED_MESSAGE };
    }
  }

  // Only allow D:\ and E:\ drives
  const driveMatch = normalizedPath.match(/^([a-z]):/);
  if (driveMatch) {
    const drive = driveMatch[1];
    if (drive !== 'd' && drive !== 'e') {
      return { 
        safe: false, 
        message: `Access Denied: Drive ${drive.toUpperCase()}:\\ is not in the allowed list. Only D:\\ and E:\\ are permitted, Sir.` 
      };
    }
  }

  return { safe: true, message: 'Path is safe.' };
}

/**
 * Checks if a command string contains dangerous patterns.
 * @param {string} command - The command to validate
 * @returns {{ safe: boolean, message: string }}
 */
function validateCommand(command) {
  if (!command || typeof command !== 'string') {
    return { safe: false, message: 'Invalid command provided.' };
  }

  const normalizedCmd = command.toLowerCase().trim();

  // Check against dangerous command patterns
  for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
    if (normalizedCmd.includes(pattern.toLowerCase())) {
      return { safe: false, message: DANGEROUS_CMD_MESSAGE };
    }
  }

  // Also check if the command targets C:\ in any way
  const pathCheck = validatePath(command);
  if (!pathCheck.safe) {
    return { safe: false, message: DANGEROUS_CMD_MESSAGE };
  }

  return { safe: true, message: 'Command is safe.' };
}

/**
 * Checks if an action requires user confirmation (destructive action).
 * @param {string} action - The action type to check
 * @returns {boolean}
 */
function requiresConfirmation(action) {
  if (!action || typeof action !== 'string') return true;
  const normalizedAction = action.toLowerCase().trim();
  return DESTRUCTIVE_ACTIONS.some(da => normalizedAction.includes(da));
}

/**
 * Master validation — validates both path and command in one call.
 * Use this as the single entry point for security checks.
 * @param {Object} options
 * @param {string} [options.path] - File path to validate
 * @param {string} [options.command] - Command to validate
 * @param {string} [options.action] - Action type (delete, move, etc.)
 * @param {string} [options.source] - Source of the request
 * @returns {Promise<{ allowed: boolean, message: string, needsConfirmation: boolean }>}
 */
async function validate({ path: targetPath, command, action, source = 'unknown' } = {}) {
  // Validate path if provided
  if (targetPath) {
    const pathResult = validatePath(targetPath);
    if (!pathResult.safe) {
      await logSecurityEvent('BLOCKED_PATH', `Path: ${targetPath} | ${pathResult.message}`, source);
      return { allowed: false, message: pathResult.message, needsConfirmation: false };
    }
  }

  // Validate command if provided
  if (command) {
    const cmdResult = validateCommand(command);
    if (!cmdResult.safe) {
      await logSecurityEvent('BLOCKED_CMD', `Command: ${command} | ${cmdResult.message}`, source);
      return { allowed: false, message: cmdResult.message, needsConfirmation: false };
    }
  }

  // Check if action needs confirmation
  const needsConfirmation = action ? requiresConfirmation(action) : false;

  return { allowed: true, message: 'Action permitted.', needsConfirmation };
}

/**
 * Returns the current drive access status for the Security Dashboard.
 * @returns {Object} Drive status map
 */
function getDriveAccessStatus() {
  return {
    'C:\\': { status: 'blocked', icon: '🔒', label: 'Permanently Blocked' },
    'D:\\': { status: 'allowed', icon: '✅', label: 'Full Access' },
    'E:\\': { status: 'allowed', icon: '✅', label: 'Full Access' },
  };
}

// ─── INITIALIZATION ────────────────────────────────────────

// Ensure data directory exists on module load
ensureDataDirectory();

// ─── EXPORTS ───────────────────────────────────────────────

module.exports = {
  // Core validation
  validate,
  validatePath,
  validateCommand,
  requiresConfirmation,

  // Logging
  logSecurityEvent,
  getSecurityLog,
  clearSecurityLog,
  exportSecurityLog,

  // Status
  getDriveAccessStatus,

  // Constants (for testing)
  BLOCKED_PATH_PATTERNS,
  DANGEROUS_COMMAND_PATTERNS,
  DESTRUCTIVE_ACTIONS,
  ACCESS_DENIED_MESSAGE,
  DANGEROUS_CMD_MESSAGE,
  POTTS_DATA_DIR,
  SECURITY_LOG_PATH,
};
