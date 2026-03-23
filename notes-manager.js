/**
 * ============================================================
 * POTTS Desktop — Notes Manager Module
 * ============================================================
 * Full CRUD operations for notes with JSON file storage.
 * Supports tags, search, and export functionality.
 * All notes stored at D:\POTTS_Data\notes.json
 * ============================================================
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ─── CONSTANTS ─────────────────────────────────────────────

/** Data directory path */
const POTTS_DATA_DIR = path.join('D:', 'POTTS_Data');

/** Notes JSON file path */
const NOTES_FILE_PATH = path.join(POTTS_DATA_DIR, 'notes.json');

/** Notes export text file path */
const NOTES_EXPORT_PATH = path.join(POTTS_DATA_DIR, 'notes.txt');

/** Valid tag names */
const VALID_TAGS = ['personal', 'work', 'todo'];

// ─── HELPER FUNCTIONS ──────────────────────────────────────

/**
 * Ensures the POTTS_Data directory and notes file exist.
 * @returns {void}
 */
function ensureNotesFile() {
  try {
    if (!fs.existsSync(POTTS_DATA_DIR)) {
      fs.mkdirSync(POTTS_DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(NOTES_FILE_PATH)) {
      fs.writeFileSync(NOTES_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[NotesManager] Failed to initialize notes file:', err.message);
  }
}

/**
 * Reads all notes from the JSON file.
 * @returns {Promise<Array>} Array of note objects
 */
async function readNotesFile() {
  try {
    ensureNotesFile();
    const content = await fs.promises.readFile(NOTES_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[NotesManager] Failed to read notes file:', err.message);
    return [];
  }
}

/**
 * Writes the notes array to the JSON file.
 * @param {Array} notes - Array of note objects
 * @returns {Promise<void>}
 */
async function writeNotesFile(notes) {
  try {
    ensureNotesFile();
    await fs.promises.writeFile(NOTES_FILE_PATH, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (err) {
    console.error('[NotesManager] Failed to write notes file:', err.message);
    throw new Error('Failed to save notes.');
  }
}

/**
 * Extracts hashtags from note content.
 * @param {string} content - Note content text
 * @returns {string[]} Array of tag names (without #)
 */
function extractTags(content) {
  if (!content || typeof content !== 'string') return [];
  const tagRegex = /#(\w+)/g;
  const tags = [];
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    if (VALID_TAGS.includes(tag)) {
      tags.push(tag);
    }
  }
  return [...new Set(tags)];
}

// ─── CRUD OPERATIONS ───────────────────────────────────────

/**
 * Creates a new note.
 * @param {string} title - Note title
 * @param {string} content - Note content
 * @param {string[]} [tags=[]] - Optional tags array
 * @returns {Promise<Object>} The created note object
 */
async function createNote(title, content, tags = []) {
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Note title is required.');
  }
  if (!content || typeof content !== 'string') {
    content = '';
  }

  // Extract tags from content if not provided
  const extractedTags = extractTags(content);
  const allTags = [...new Set([...tags, ...extractedTags])].filter(t => VALID_TAGS.includes(t));

  const note = {
    id: uuidv4(),
    title: title.trim(),
    content: content.trim(),
    tags: allTags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const notes = await readNotesFile();
  notes.unshift(note); // Add to beginning (newest first)
  await writeNotesFile(notes);

  return note;
}

/**
 * Retrieves all notes, optionally filtered by tag.
 * @param {string} [filterTag] - Optional tag to filter by
 * @returns {Promise<Array>} Array of note objects
 */
async function getAllNotes(filterTag) {
  const notes = await readNotesFile();
  if (filterTag && typeof filterTag === 'string') {
    return notes.filter(n => n.tags && n.tags.includes(filterTag.toLowerCase()));
  }
  return notes;
}

/**
 * Retrieves a single note by ID.
 * @param {string} id - Note UUID
 * @returns {Promise<Object|null>} Note object or null
 */
async function getNoteById(id) {
  if (!id) return null;
  const notes = await readNotesFile();
  return notes.find(n => n.id === id) || null;
}

/**
 * Updates an existing note.
 * @param {string} id - Note UUID
 * @param {Object} updates - Fields to update (title, content, tags)
 * @returns {Promise<Object>} Updated note object
 */
async function updateNote(id, updates = {}) {
  if (!id) throw new Error('Note ID is required for update.');

  const notes = await readNotesFile();
  const index = notes.findIndex(n => n.id === id);
  
  if (index === -1) {
    throw new Error('Note not found.');
  }

  const note = notes[index];

  if (updates.title !== undefined) {
    note.title = String(updates.title).trim();
  }
  if (updates.content !== undefined) {
    note.content = String(updates.content).trim();
    // Re-extract tags from updated content
    const extractedTags = extractTags(note.content);
    const manualTags = updates.tags ? updates.tags.filter(t => VALID_TAGS.includes(t)) : note.tags || [];
    note.tags = [...new Set([...manualTags, ...extractedTags])];
  }
  if (updates.tags !== undefined && updates.content === undefined) {
    note.tags = updates.tags.filter(t => VALID_TAGS.includes(t));
  }

  note.updatedAt = new Date().toISOString();
  notes[index] = note;
  await writeNotesFile(notes);

  return note;
}

/**
 * Deletes a note by ID.
 * @param {string} id - Note UUID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteNote(id) {
  if (!id) throw new Error('Note ID is required for deletion.');

  const notes = await readNotesFile();
  const index = notes.findIndex(n => n.id === id);

  if (index === -1) {
    throw new Error('Note not found.');
  }

  notes.splice(index, 1);
  await writeNotesFile(notes);

  return true;
}

/**
 * Searches notes by keyword in title and content.
 * @param {string} query - Search query string
 * @returns {Promise<Array>} Matching notes
 */
async function searchNotes(query) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return await getAllNotes();
  }

  const normalizedQuery = query.toLowerCase().trim();
  const notes = await readNotesFile();

  return notes.filter(note => {
    const titleMatch = note.title && note.title.toLowerCase().includes(normalizedQuery);
    const contentMatch = note.content && note.content.toLowerCase().includes(normalizedQuery);
    const tagMatch = note.tags && note.tags.some(t => t.includes(normalizedQuery));
    return titleMatch || contentMatch || tagMatch;
  });
}

/**
 * Exports all notes to a human-readable text file.
 * @returns {Promise<string>} Path to the exported file
 */
async function exportNotes() {
  try {
    ensureNotesFile();
    const notes = await readNotesFile();

    let output = '╔══════════════════════════════════════════════════╗\n';
    output +=    '║          POTTS Desktop — Notes Export            ║\n';
    output +=    '╚══════════════════════════════════════════════════╝\n\n';
    output +=    `Generated: ${new Date().toISOString()}\n`;
    output +=    `Total Notes: ${notes.length}\n`;
    output +=    '─'.repeat(50) + '\n\n';

    notes.forEach((note, idx) => {
      output += `[Note ${idx + 1}] ${note.title}\n`;
      output += `Tags: ${note.tags && note.tags.length > 0 ? note.tags.map(t => '#' + t).join(' ') : 'none'}\n`;
      output += `Created: ${note.createdAt}\n`;
      output += `Updated: ${note.updatedAt}\n`;
      output += `─`.repeat(40) + '\n';
      output += `${note.content}\n\n`;
      output += '═'.repeat(50) + '\n\n';
    });

    await fs.promises.writeFile(NOTES_EXPORT_PATH, output, 'utf-8');
    return NOTES_EXPORT_PATH;
  } catch (err) {
    console.error('[NotesManager] Failed to export notes:', err.message);
    throw new Error('Failed to export notes.');
  }
}

/**
 * Returns the total count of notes.
 * @returns {Promise<number>}
 */
async function getNotesCount() {
  const notes = await readNotesFile();
  return notes.length;
}

// ─── INITIALIZATION ────────────────────────────────────────

ensureNotesFile();

// ─── EXPORTS ───────────────────────────────────────────────

module.exports = {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
  searchNotes,
  exportNotes,
  getNotesCount,
  extractTags,
  VALID_TAGS,
  NOTES_FILE_PATH,
  NOTES_EXPORT_PATH,
};
