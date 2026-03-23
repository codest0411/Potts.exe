/**
 * ============================================================
 * POTTS Desktop — Security Guard Unit Tests
 * ============================================================
 */

const {
  validatePath,
  validateCommand,
  requiresConfirmation,
  validate,
  BLOCKED_PATH_PATTERNS,
  DANGEROUS_COMMAND_PATTERNS,
  ACCESS_DENIED_MESSAGE,
  DANGEROUS_CMD_MESSAGE,
} = require('../security-guard');

describe('Security Guard — Path Validation', () => {

  test('should block C:\\ drive root', () => {
    const result = validatePath('C:\\');
    expect(result.safe).toBe(false);
    expect(result.message).toBe(ACCESS_DENIED_MESSAGE);
  });

  test('should block C:/ (forward slash)', () => {
    const result = validatePath('C:/Users/test');
    expect(result.safe).toBe(false);
  });

  test('should block paths containing \\Windows\\', () => {
    const result = validatePath('C:\\Windows\\System32\\cmd.exe');
    expect(result.safe).toBe(false);
  });

  test('should block paths containing \\System32\\', () => {
    const result = validatePath('C:\\Windows\\System32\\');
    expect(result.safe).toBe(false);
  });

  test('should block paths containing \\Program Files\\', () => {
    const result = validatePath('C:\\Program Files\\MyApp');
    expect(result.safe).toBe(false);
  });

  test('should block paths containing \\Users\\', () => {
    const result = validatePath('C:\\Users\\Admin\\Desktop');
    expect(result.safe).toBe(false);
  });

  test('should block paths containing \\AppData\\', () => {
    const result = validatePath('C:\\Users\\Admin\\AppData\\Local');
    expect(result.safe).toBe(false);
  });

  test('should block %SystemRoot%', () => {
    const result = validatePath('%SystemRoot%\\System32');
    expect(result.safe).toBe(false);
  });

  test('should block %WINDIR%', () => {
    const result = validatePath('%WINDIR%\\temp');
    expect(result.safe).toBe(false);
  });

  test('should allow D:\\ drive', () => {
    const result = validatePath('D:\\MyFiles\\document.txt');
    expect(result.safe).toBe(true);
  });

  test('should allow E:\\ drive', () => {
    const result = validatePath('E:\\Projects\\code.js');
    expect(result.safe).toBe(true);
  });

  test('should block other drives (F:\\)', () => {
    const result = validatePath('F:\\data');
    expect(result.safe).toBe(false);
  });

  test('should block null/empty paths', () => {
    expect(validatePath(null).safe).toBe(false);
    expect(validatePath('').safe).toBe(false);
    expect(validatePath(undefined).safe).toBe(false);
  });

  test('should be case-insensitive', () => {
    expect(validatePath('c:\\windows\\system32').safe).toBe(false);
    expect(validatePath('C:\\WINDOWS\\SYSTEM32').safe).toBe(false);
    expect(validatePath('c:\\USERS\\admin').safe).toBe(false);
  });
});

describe('Security Guard — Command Validation', () => {

  test('should block "format" command', () => {
    const result = validateCommand('format C:');
    expect(result.safe).toBe(false);
  });

  test('should block "del /s /q C:" command', () => {
    const result = validateCommand('del /s /q C:\\*');
    expect(result.safe).toBe(false);
  });

  test('should block "rmdir /s C:" command', () => {
    const result = validateCommand('rmdir /s C:\\temp');
    expect(result.safe).toBe(false);
  });

  test('should block "reg delete" command', () => {
    const result = validateCommand('reg delete HKCU\\Software');
    expect(result.safe).toBe(false);
  });

  test('should block "bcdedit" command', () => {
    const result = validateCommand('bcdedit /set test');
    expect(result.safe).toBe(false);
  });

  test('should block "diskpart" command', () => {
    const result = validateCommand('diskpart');
    expect(result.safe).toBe(false);
  });

  test('should block "taskkill /im explorer" command', () => {
    const result = validateCommand('taskkill /im explorer.exe');
    expect(result.safe).toBe(false);
  });

  test('should allow safe commands on D:\\', () => {
    const result = validateCommand('dir D:\\MyFiles');
    expect(result.safe).toBe(true);
  });

  test('should allow "echo" command', () => {
    const result = validateCommand('echo hello world');
    expect(result.safe).toBe(true);
  });

  test('should block null/empty commands', () => {
    expect(validateCommand(null).safe).toBe(false);
    expect(validateCommand('').safe).toBe(false);
  });

  test('should be case-insensitive', () => {
    expect(validateCommand('FORMAT C:').safe).toBe(false);
    expect(validateCommand('DISKPART').safe).toBe(false);
    expect(validateCommand('REG DELETE').safe).toBe(false);
  });
});

describe('Security Guard — Destructive Action Confirmation', () => {

  test('delete action requires confirmation', () => {
    expect(requiresConfirmation('delete')).toBe(true);
  });

  test('move action requires confirmation', () => {
    expect(requiresConfirmation('move')).toBe(true);
  });

  test('shutdown requires confirmation', () => {
    expect(requiresConfirmation('shutdown')).toBe(true);
  });

  test('restart requires confirmation', () => {
    expect(requiresConfirmation('restart')).toBe(true);
  });

  test('read action does not require confirmation', () => {
    expect(requiresConfirmation('read')).toBe(false);
  });

  test('list action does not require confirmation', () => {
    expect(requiresConfirmation('list')).toBe(false);
  });

  test('null/empty action requires confirmation (safe default)', () => {
    expect(requiresConfirmation(null)).toBe(true);
    expect(requiresConfirmation('')).toBe(true);
  });
});

describe('Security Guard — Master Validation', () => {

  test('should block paths targeting C:', async () => {
    const result = await validate({ path: 'C:\\secret.txt', source: 'test' });
    expect(result.allowed).toBe(false);
  });

  test('should block dangerous commands', async () => {
    const result = await validate({ command: 'format D:', source: 'test' });
    expect(result.allowed).toBe(false);
  });

  test('should allow safe D:\\ path', async () => {
    const result = await validate({ path: 'D:\\safe\\file.txt', source: 'test' });
    expect(result.allowed).toBe(true);
  });

  test('should flag destructive actions for confirmation', async () => {
    const result = await validate({ path: 'D:\\file.txt', action: 'delete', source: 'test' });
    expect(result.allowed).toBe(true);
    expect(result.needsConfirmation).toBe(true);
  });

  test('should not flag read actions for confirmation', async () => {
    const result = await validate({ path: 'D:\\file.txt', action: 'read', source: 'test' });
    expect(result.allowed).toBe(true);
    expect(result.needsConfirmation).toBe(false);
  });
});
