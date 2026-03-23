/**
 * ============================================================
 * POTTS Desktop — Notes Manager Unit Tests
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substring(7),
}));

// Use a temp directory for test data
const TEST_DATA_DIR = path.join(__dirname, '..', 'test_data_temp');
const TEST_NOTES_FILE = path.join(TEST_DATA_DIR, 'notes.json');

// Override the notes manager paths before requiring
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn((p) => {
      if (p.includes('POTTS_Data')) {
        return actualFs.existsSync(p.replace(/D:\\POTTS_Data/g, TEST_DATA_DIR));
      }
      return actualFs.existsSync(p);
    }),
    mkdirSync: jest.fn((p, opts) => {
      const newPath = p.replace(/D:\\POTTS_Data/g, TEST_DATA_DIR);
      return actualFs.mkdirSync(newPath, opts);
    }),
    writeFileSync: jest.fn((p, data, enc) => {
      const newPath = p.replace(/D:\\POTTS_Data/g, TEST_DATA_DIR);
      const dir = path.dirname(newPath);
      if (!actualFs.existsSync(dir)) {
        actualFs.mkdirSync(dir, { recursive: true });
      }
      return actualFs.writeFileSync(newPath, data, enc);
    }),
    promises: {
      readFile: jest.fn(async (p, enc) => {
        const newPath = p.replace(/D:\\POTTS_Data/g, TEST_DATA_DIR);
        return actualFs.promises.readFile(newPath, enc);
      }),
      writeFile: jest.fn(async (p, data, enc) => {
        const newPath = p.replace(/D:\\POTTS_Data/g, TEST_DATA_DIR);
        const dir = path.dirname(newPath);
        if (!actualFs.existsSync(dir)) {
          actualFs.mkdirSync(dir, { recursive: true });
        }
        return actualFs.promises.writeFile(newPath, data, enc);
      }),
      appendFile: jest.fn(async (p, data, enc) => {
        const newPath = p.replace(/D:\\POTTS_Data/g, TEST_DATA_DIR);
        return actualFs.promises.appendFile(newPath, data, enc);
      }),
    },
  };
});

const notesManager = require('../notes-manager');

// Setup and teardown
beforeAll(() => {
  const actualFs = jest.requireActual('fs');
  if (!actualFs.existsSync(TEST_DATA_DIR)) {
    actualFs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  actualFs.writeFileSync(path.join(TEST_DATA_DIR, 'notes.json'), '[]', 'utf-8');
});

afterAll(() => {
  const actualFs = jest.requireActual('fs');
  try {
    actualFs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {}
});

beforeEach(() => {
  const actualFs = jest.requireActual('fs');
  actualFs.writeFileSync(path.join(TEST_DATA_DIR, 'notes.json'), '[]', 'utf-8');
});

describe('Notes Manager — Tag Extraction', () => {

  test('should extract valid tags from content', () => {
    const tags = notesManager.extractTags('This is #personal and #work related');
    expect(tags).toContain('personal');
    expect(tags).toContain('work');
  });

  test('should ignore invalid tags', () => {
    const tags = notesManager.extractTags('This is #random and #invalid');
    expect(tags).toHaveLength(0);
  });

  test('should extract #todo tag', () => {
    const tags = notesManager.extractTags('Need to #todo this task');
    expect(tags).toContain('todo');
  });

  test('should deduplicate tags', () => {
    const tags = notesManager.extractTags('#personal stuff #personal again');
    expect(tags).toHaveLength(1);
  });

  test('should handle empty/null content', () => {
    expect(notesManager.extractTags('')).toHaveLength(0);
    expect(notesManager.extractTags(null)).toHaveLength(0);
  });
});

describe('Notes Manager — CRUD Operations', () => {

  test('should create a note', async () => {
    const note = await notesManager.createNote('Test Note', 'Test content');
    expect(note).toBeDefined();
    expect(note.title).toBe('Test Note');
    expect(note.content).toBe('Test content');
    expect(note.id).toBeDefined();
  });

  test('should require a title', async () => {
    await expect(notesManager.createNote('', 'content')).rejects.toThrow();
  });

  test('should get all notes', async () => {
    await notesManager.createNote('Note 1', 'Content 1');
    await notesManager.createNote('Note 2', 'Content 2');
    const notes = await notesManager.getAllNotes();
    expect(notes.length).toBeGreaterThanOrEqual(2);
  });

  test('should delete a note', async () => {
    const note = await notesManager.createNote('ToDelete', 'Will be deleted');
    const result = await notesManager.deleteNote(note.id);
    expect(result).toBe(true);
  });

  test('should throw when deleting non-existent note', async () => {
    await expect(notesManager.deleteNote('non-existent-id')).rejects.toThrow('Note not found');
  });

  test('should update a note', async () => {
    const note = await notesManager.createNote('Original', 'Original content');
    const updated = await notesManager.updateNote(note.id, {
      title: 'Updated',
      content: 'New content',
    });
    expect(updated.title).toBe('Updated');
    expect(updated.content).toBe('New content');
  });
});

describe('Notes Manager — Search', () => {

  test('should search by title', async () => {
    await notesManager.createNote('Unique Search Title', 'Regular content');
    const results = await notesManager.searchNotes('Unique Search Title');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('Unique Search Title');
  });

  test('should search by content', async () => {
    await notesManager.createNote('Regular Title', 'Special unicorn content xyz');
    const results = await notesManager.searchNotes('unicorn');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('should return all notes for empty query', async () => {
    const all = await notesManager.getAllNotes();
    const searched = await notesManager.searchNotes('');
    expect(searched.length).toBe(all.length);
  });
});

describe('Notes Manager — Count', () => {

  test('should return correct count', async () => {
    // Reset
    const actualFs = jest.requireActual('fs');
    actualFs.writeFileSync(path.join(TEST_DATA_DIR, 'notes.json'), '[]', 'utf-8');

    await notesManager.createNote('Count1', 'c1');
    await notesManager.createNote('Count2', 'c2');
    await notesManager.createNote('Count3', 'c3');
    const count = await notesManager.getNotesCount();
    expect(count).toBe(3);
  });
});
