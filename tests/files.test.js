/**
 * ============================================================
 * POTTS Desktop — File Operations Unit Tests
 * ============================================================
 * Tests security validation integration with file operations.
 * ============================================================
 */

const { validatePath, validateCommand, validate } = require('../security-guard');

describe('File Operations — Path Security', () => {

  test('should allow D:\\ file operations', () => {
    expect(validatePath('D:\\Projects\\test.txt').safe).toBe(true);
    expect(validatePath('D:\\POTTS_Data\\notes.json').safe).toBe(true);
  });

  test('should allow E:\\ file operations', () => {
    expect(validatePath('E:\\Backups\\data.zip').safe).toBe(true);
    expect(validatePath('E:\\Media\\video.mp4').safe).toBe(true);
  });

  test('should block C:\\ file operations', () => {
    expect(validatePath('C:\\temp\\test.txt').safe).toBe(false);
    expect(validatePath('C:\\Users\\Admin\\file.doc').safe).toBe(false);
  });

  test('should block all system directories', () => {
    const systemPaths = [
      'C:\\Windows\\explorer.exe',
      'C:\\Windows\\System32\\cmd.exe',
      'C:\\Program Files\\App\\app.exe',
      'C:\\Program Files (x86)\\App\\app.exe',
      'C:\\Users\\Admin\\Desktop\\file.txt',
      'C:\\Users\\Admin\\AppData\\Local\\config.json',
    ];

    systemPaths.forEach(p => {
      const result = validatePath(p);
      expect(result.safe).toBe(false);
    });
  });

  test('should handle UNC-style paths', () => {
    // Should not crash on unusual paths
    const result = validatePath('\\\\server\\share\\file.txt');
    expect(typeof result.safe).toBe('boolean');
  });

  test('should handle relative paths safely', () => {
    // Relative paths without drive letter
    const result = validatePath('..\\..\\Windows\\System32');
    // This contains \\Windows\\ so should be blocked
    expect(result.safe).toBe(false);
  });
});

describe('File Operations — Command Security for File Ops', () => {

  test('should allow dir on D:\\', () => {
    expect(validateCommand('dir D:\\Projects').safe).toBe(true);
  });

  test('should allow copy between D:\\ and E:\\', () => {
    expect(validateCommand('copy D:\\file.txt E:\\backup\\file.txt').safe).toBe(true);
  });

  test('should block del on C:\\', () => {
    expect(validateCommand('del /s /q C:\\temp\\*').safe).toBe(false);
  });

  test('should block rmdir on C:\\', () => {
    expect(validateCommand('rmdir /s /q C:\\old_folder').safe).toBe(false);
  });

  test('should block PowerShell Remove-Item on C:\\', () => {
    expect(validateCommand('powershell -command Remove-Item C:\\temp -Recurse').safe).toBe(false);
  });
});

describe('File Operations — Master Validate Integration', () => {

  test('should allow file read on D:\\', async () => {
    const result = await validate({
      path: 'D:\\Documents\\report.pdf',
      action: 'read',
      source: 'test',
    });
    expect(result.allowed).toBe(true);
    expect(result.needsConfirmation).toBe(false);
  });

  test('should allow file create on E:\\', async () => {
    const result = await validate({
      path: 'E:\\NewFolder\\file.txt',
      action: 'create',
      source: 'test',
    });
    expect(result.allowed).toBe(true);
  });

  test('should flag delete for confirmation', async () => {
    const result = await validate({
      path: 'D:\\OldFile.txt',
      action: 'delete',
      source: 'test',
    });
    expect(result.allowed).toBe(true);
    expect(result.needsConfirmation).toBe(true);
  });

  test('should flag move for confirmation', async () => {
    const result = await validate({
      path: 'D:\\file.txt',
      action: 'move',
      source: 'test',
    });
    expect(result.allowed).toBe(true);
    expect(result.needsConfirmation).toBe(true);
  });

  test('should block C:\\ path even with safe action', async () => {
    const result = await validate({
      path: 'C:\\important.sys',
      action: 'read',
      source: 'test',
    });
    expect(result.allowed).toBe(false);
  });

  test('should block dangerous command even with safe path', async () => {
    const result = await validate({
      path: 'D:\\safe.txt',
      command: 'format D:',
      source: 'test',
    });
    expect(result.allowed).toBe(false);
  });
});
