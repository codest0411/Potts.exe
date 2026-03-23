/**
 * ============================================================
 * POTTS Desktop — Renderer Process (AI Brain)
 * ============================================================
 * Handles all UI logic, screen navigation, voice recognition,
 * Gemini AI integration, text-to-speech, and intent parsing.
 * ============================================================
 */

// ─── APP STATE ──────────────────────────────────────────────

window.addEventListener('error', (event) => {
  try { window.potts.files.write({ filePath: 'D:\\POTTS_Data\\ui-error.txt', content: event.message + '\n' + event.error?.stack }); } catch(e){}
});
window.addEventListener('unhandledrejection', (event) => {
  try { window.potts.files.write({ filePath: 'D:\\POTTS_Data\\ui-error.txt', content: 'Unhandled Promise: ' + event.reason }); } catch(e){}
});

const APP = {
  currentScreen: 'home',
  status: 'idle',        // idle | listening | processing | error
  recognition: null,     // SpeechRecognition instance
  isListening: false,
  settings: {},
  chatHistory: [],
};

// ─── INITIALIZATION ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  initializeNavigation();
  initializeWindowControls();
  renderScreen('home');

  // Listen for navigation events from main process (tray menu)
  window.potts.on.navigate((page) => {
    navigateTo(page);
  });
});

/**
 * Loads app settings from the main process.
 */
async function loadSettings() {
  try {
    APP.settings = await window.potts.settings.get();
    // Apply saved theme
    if (APP.settings.theme) {
      document.documentElement.setAttribute('data-theme', APP.settings.theme);
    }
  } catch (err) {
    console.error('[Renderer] Failed to load settings:', err);
  }
}

// ─── NAVIGATION ─────────────────────────────────────────────

/**
 * Sets up the nav rail click handlers.
 */
function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-screen]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.getAttribute('data-screen');
      navigateTo(screen);
    });
  });
}

/**
 * Navigates to a specific screen.
 * @param {string} screenName - Screen identifier
 */
function navigateTo(screenName) {
  if (screenName === APP.currentScreen && document.getElementById(`screen-${screenName}`).classList.contains('active')) {
    return;
  }
  
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-screen="${screenName}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Hide all screens, show target
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(`screen-${screenName}`);
  if (targetScreen) targetScreen.classList.add('active');

  APP.currentScreen = screenName;
  renderScreen(screenName);
}

/**
 * Renders the content of a screen from its template.
 * @param {string} screenName
 */
function renderScreen(screenName) {
  const screenEl = document.getElementById(`screen-${screenName}`);
  const template = document.getElementById(`tmpl-${screenName}`);

  if (!screenEl || !template) return;

  // Only render if empty (avoid re-rendering)
  if (screenEl.children.length === 0) {
    screenEl.appendChild(template.content.cloneNode(true));
  }

  // Initialize screen-specific logic
  switch (screenName) {
    case 'home': initHomeScreen(); break;
    case 'voice': initVoiceScreen(); break;
    case 'files': initFilesScreen(); break;
    case 'notes': initNotesScreen(); break;
    case 'settings': initSettingsScreen(); break;
    case 'security': initSecurityScreen(); break;
  }
}

// ─── WINDOW CONTROLS ────────────────────────────────────────

function initializeWindowControls() {
  document.getElementById('btn-minimize')?.addEventListener('click', () => window.potts.window.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.potts.window.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => window.potts.window.close());
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────

/**
 * Shows a toast notification.
 * @param {string} message - Toast message
 * @param {string} [type='info'] - success, error, warning, info
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ─── TEXT-TO-SPEECH ─────────────────────────────────────────

/**
 * Speaks text aloud using SpeechSynthesis API.
 * @param {string} text - Text to speak
 */
function speak(text) {
  if (!text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = APP.settings.voiceSpeed || 1.0;
    utterance.pitch = APP.settings.voicePitch || 1.0;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[TTS] Failed:', err);
  }
}

/**
 * Speaks text aloud and adds it as an AI chat bubble.
 * Use this when overriding the default response (like time/weather).
 */
function speakAndChat(text) {
  if (!text) return;
  addChatBubble(text, 'ai');
  APP.chatHistory.push({ role: 'assistant', text: text });
  speak(text);
}

// ─── GEMINI AI INTEGRATION ──────────────────────────────────

/**
 * Sends a prompt to the selected AI provider (Gemini or Groq) and gets a response.
 * @param {string} userMessage - The user's message
 * @returns {Promise<Object>} AI response with text and optional intent
 */
async function queryAI(userMessage) {
  const provider = APP.settings.aiProvider || 'gemini';
  const apiKey = provider === 'groq' ? APP.settings.groqApiKey : APP.settings.geminiApiKey;

  if (!apiKey) {
    return {
      text: `I need a ${provider === 'groq' ? 'Groq' : 'Gemini'} API key to function. Please add one in Settings, Sir.`,
      intent: null,
    };
  }

  const systemPrompt = `You are POTTS, a professional AI desktop assistant (like JARVIS). You help the user manage their Windows computer. You are polite, efficient, and call the user "Sir".

When the user asks you to perform an action, respond with a JSON object in this format:
{
  "reply": "Your spoken response to the user",
  "intent": {
    "action": "action_type",
    "params": { ... }
  }
}

CRITICAL: Return ONLY ONE JSON object per message. DO NOT chain responses or include multiple actions.

Available actions:
- "open_app": { "name": "app name" } — Open an application
- "volume_up", "volume_down", "volume_mute" — Volume controls
- "lock_screen" — Lock the computer
- "shutdown" — Shutdown (REQUIRES confirmation)
- "restart" — Restart (REQUIRES confirmation)
- "get_time" — Get current time
- "get_date" — Get current date
- "get_battery" — Get battery level
- "get_weather": { "city": "city name" } — Get weather
- "create_note": { "title": "title", "content": "content" } — Create a note
- "search_notes": { "query": "search term" } — Search notes
- "open_file": { "path": "full path" } — Open a file or folder by path
- "open_file_location": { "path": "full path" } — Open the folder and highlight the file in Explorer
- "create_file": { "path": "full path", "content": "text" } — Create a new file with content
- "list_files": { "path": "directory path" } — List files on computer
- "open_web": { "url": "https://url.com" } — Open a specific website or a new tab (use google.com if not specified)
- "search_web": { "query": "search term" } — Search the internet for information

If the user is just chatting or asking a question (no action needed), respond with:
{
  "reply": "Your conversational response",
  "intent": null
}

CRITICAL SECURITY RULES:
- NEVER perform any action on C:\\ drive
- NEVER execute format, del, rmdir, or any destructive system commands
- ALWAYS refuse shutdown/restart without explicit confirmation
- Only allow file operations on D:\\ and E:\\ drives`;

  try {
    let rawText = '';

    if (provider === 'groq') {
      const model = APP.settings.groqModel || 'llama-3.3-70b-versatile';
      const messages = [
        { role: 'system', content: systemPrompt },
        ...APP.chatHistory.slice(-10).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })),
        { role: 'user', content: userMessage }
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Groq API error: ${response.status}`);
      }

      const data = await response.json();
      rawText = data.choices?.[0]?.message?.content || '';

    } else {
      // Gemini
      const model = APP.settings.geminiModel || 'gemini-2.0-flash';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: systemPrompt }] },
              ...APP.chatHistory.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }],
              })),
              { role: 'user', parts: [{ text: userMessage }] },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Try to parse as JSON
    let parsed;
    try {
      // Improved extraction: Find the FIRST valid JSON block
      const jsonStr = rawText.match(/\{(?:[^{}]|(\{(?:[^{}]|(\{[^{}]*\}))*\}))*\}/);
      if (jsonStr) {
        parsed = JSON.parse(jsonStr[0]);
      } else {
        parsed = { reply: rawText, intent: null };
      }
    } catch (err) {
      console.warn('[Parser] JSON parse error, falling back to raw text:', err);
      parsed = { reply: rawText, intent: null };
    }

    return {
      text: (parsed && parsed.reply) ? parsed.reply : rawText,
      intent: (parsed && parsed.intent) ? parsed.intent : null,
    };
  } catch (err) {
    console.error('[Gemini] API error:', err);
    return {
      text: `I'm having trouble connecting to my AI service: ${err.message}`,
      intent: null,
    };
  }
}

// ─── INTENT EXECUTOR ────────────────────────────────────────

/**
 * Executes a parsed intent from the AI response.
 * @param {Object} intent - { action, params }
 */
async function executeIntent(intent) {
  if (!intent || !intent.action) return;

  try {
    switch (intent.action) {
      case 'open_app': {
        const appName = intent.params?.name;
        if (!appName) break;

        const appMap = {
          'google chrome': 'chrome', 'chrome': 'chrome', 'edge': 'msedge',
          'notepad': 'notepad', 'calc': 'calc', 'calculator': 'calc',
          'word': 'winword', 'excel': 'excel', 'powerpoint': 'powerpnt',
          'vs code': 'code', 'visual studio code': 'code',
          'terminal': 'wt', 'explorer': 'explorer', 'brave': 'brave',
          'firefox': 'firefox', 'spotify': 'spotify', 'whatsapp': 'whatsapp:',
          'store': 'ms-windows-store:', 'paint': 'mspaint', 'vlc': 'vlc',
          'steam': 'steam', 'discord': 'discord', 'obs': 'obs64'
        };

        const execName = appMap[appName.toLowerCase()] || appName;
        
        // Step 1: Try direct start (fastest for commands in PATH)
        const directRes = await window.potts.system.execute(`start "" "${execName}"`);
        if (directRes.success) {
          showToast(`Opening ${appName}...`, 'success');
          break;
        }

        // Step 2: PowerShell StartApps Search (Handles UWP and Start Menu apps)
        showToast(`Searching for ${appName}...`, 'info');
        const safeAppName = appName.replace(/'/g, "''");
        const psSearch = `powershell -c "$name = '${safeAppName}'; $app = Get-StartApps | Where-Object { $_.Name -match $name -or $_.AppID -match $name } | Select-Object -First 1; if ($app) { echo $app.AppID } else { exit 1 }"`;
        const searchRes = await window.potts.system.execute(psSearch);
        
        if (searchRes.success && searchRes.output.trim()) {
          const appId = searchRes.output.trim();
          await window.potts.system.execute(`explorer shell:AppsFolder\\${appId}`);
          showToast(`Launched ${appName} from Start Menu`, 'success');
        } else {
          // Step 3: Try searching for the .exe in common locations (Last Resort)
          const findExe = `powershell -c "$name = '${safeAppName}'; $paths = @('$env:ProgramFiles', '${process.env['ProgramFiles(x86)']}', '$env:LocalAppData\\Programs'); $exe = Get-ChildItem -Path $paths -Filter \\"*$name*.exe\\" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1; if ($exe) { echo $exe.FullName } else { exit 1 }"`;
          const findRes = await window.potts.system.execute(findExe);
          
          if (findRes.success && findRes.output.trim()) {
            const fullPath = findRes.output.trim();
            await window.potts.system.execute(`start "" "${fullPath}"`);
            showToast(`Found and opened ${appName}`, 'success');
          } else {
            showToast(`Could not find or open: ${appName}`, 'error');
          }
        }
        break;
      }
      case 'volume_up':
        await window.potts.system.execute('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"');
        showToast('Volume increased', 'success');
        break;
      case 'volume_down':
        await window.potts.system.execute('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"');
        showToast('Volume decreased', 'success');
        break;
      case 'volume_mute':
        await window.potts.system.execute('powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
        showToast('Volume toggled', 'success');
        break;
      case 'lock_screen':
        await window.potts.system.execute('rundll32.exe user32.dll,LockWorkStation');
        break;
      case 'shutdown': {
        const confirmed = await window.potts.dialog.confirm({
          title: 'Shutdown Computer',
          message: 'Are you sure you want to shut down this computer?',
        });
        if (confirmed) {
          await window.potts.system.execute('shutdown /s /t 5');
          showToast('Shutting down in 5 seconds...', 'warning');
        }
        break;
      }
      case 'restart': {
        const confirmed = await window.potts.dialog.confirm({
          title: 'Restart Computer',
          message: 'Are you sure you want to restart this computer?',
        });
        if (confirmed) {
          await window.potts.system.execute('shutdown /r /t 5');
          showToast('Restarting in 5 seconds...', 'warning');
        }
        break;
      }
      case 'get_time': {
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        speakAndChat(`The current time is ${time}, Sir.`);
        return true;
      }
      case 'get_date': {
        const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        speakAndChat(`Today is ${date}, Sir.`);
        return true;
      }
      case 'get_weather': {
        const city = intent.params?.city || 'London';
        await getWeather(city);
        return true;
      }
      case 'get_battery': {
        const result = await window.potts.system.execute('powershell -c "(Get-WmiObject -Class Win32_Battery).EstimatedChargeRemaining"');
        const level = result.success ? result.output.trim() : null;
        if (level) {
          speakAndChat(`The battery is at ${level} percent, Sir.`);
        } else {
          speakAndChat('I cannot retrieve the battery status right now, Sir.');
        }
        return true;
      }
      case 'create_note': {
        const { title, content } = intent.params || {};
        if (title) {
          await window.potts.notes.create({ title, content: content || '', tags: [] });
          showToast(`Note "${title}" created!`, 'success');
        }
        break;
      }
      case 'open_web': {
        const url = intent.params?.url;
        if (url) {
          // Add protocol if missing
          const fullUrl = url.startsWith('http') ? url : `https://${url}`;
          await window.potts.system.execute(`start chrome "${fullUrl}"`);
          showToast(`Opening ${url}...`, 'success');
        }
        break;
      }
      case 'search_web': {
        const query = intent.params?.query;
        if (query) {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          await window.potts.system.execute(`start chrome "${searchUrl}"`);
          showToast(`Searching for "${query}"...`, 'info');
        }
        break;
      }
      case 'search_notes': {
        const query = intent.params?.query;
        if (query) {
          navigateTo('notes');
          const searchInput = document.getElementById('notes-search');
          if (searchInput) {
            searchInput.value = query;
            // Trigger input event to filter list
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          showToast(`Searching notes for "${query}"`, 'info');
        }
        return true;
      }
      case 'list_files': {
        const filePath = intent.params?.path || 'D:\\';
        navigateTo('files');
        break;
      }
      case 'open_file': {
        const filePath = intent.params?.path;
        if (filePath) {
          const validation = await window.potts.security.validate({ path: filePath, action: 'open', source: 'system-control' });
          if (!validation.allowed) {
            showToast(validation.message, 'error');
            break;
          }
          await window.potts.system.execute(`start "" "${filePath}"`);
          showToast(`Opening ${filePath}...`, 'success');
        }
        break;
      }
      case 'create_file': {
        const { path: filePath, content } = intent.params || {};
        if (filePath) {
          const res = await window.potts.files.create({ filePath, content: content || '', isDirectory: false });
          if (res.success) {
            showToast(`File created at ${filePath}`, 'success');
          } else {
            showToast(`Failed to create file: ${res.error}`, 'error');
          }
        }
        break;
      }
      case 'open_file_location': {
        const filePath = intent.params?.path;
        if (filePath) {
          await openInExplorer(filePath);
        }
        break;
      }
      default:
        console.log('[Intent] Unknown action:', intent.action);
        return false;
    }
    return false; // Default: didn't take over speaking
  } catch (err) {
    console.error('[Intent] Execution error:', err);
    showToast(`Failed to execute: ${err.message}`, 'error');
    return false;
  }
}

/**
 * Fetches weather from Open-Meteo API.
 * @param {string} city - City name
 */
async function getWeather(city) {
  try {
    // First geocode the city
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      speakAndChat(`I couldn't find weather data for ${city}, Sir.`);
      return;
    }

    const { latitude, longitude, name } = geoData.results[0];
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
    const weatherData = await weatherRes.json();

    const temp = weatherData.current_weather?.temperature;
    const windSpeed = weatherData.current_weather?.windspeed;

    const msg = `Currently in ${name}: ${temp}°C with wind at ${windSpeed} km/h, Sir.`;
    speakAndChat(msg);
    showToast(msg, 'info');
  } catch (err) {
    speakAndChat(`Sorry, I couldn't fetch the weather right now, Sir.`);
  }
}

// ─── SPEECH RECOGNITION ─────────────────────────────────────

/**
 * Initializes the Web Speech API recognition.
 */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Speech recognition is not supported in this environment.', 'error');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    APP.isListening = true;
    setStatus('listening');
  };

  recognition.onend = () => {
    APP.isListening = false;
    setStatus('idle');
  };

  recognition.onerror = (event) => {
    console.error('[Speech] Error:', event.error);
    APP.isListening = false;
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      setStatus('error');
      showToast(`Speech error: ${event.error}`, 'error');
    } else {
      setStatus('idle');
    }
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript) {
      handleUserMessage(finalTranscript.trim());
    }
  };

  return recognition;
}

/**
 * Toggles speech recognition on/off.
 */
function toggleListening() {
  if (!APP.recognition) {
    APP.recognition = initSpeechRecognition();
  }
  if (!APP.recognition) return;

  if (APP.isListening) {
    APP.recognition.stop();
  } else {
    try {
      APP.recognition.start();
    } catch (err) {
      // Already started
      APP.recognition.stop();
      setTimeout(() => APP.recognition.start(), 100);
    }
  }
}

// ─── MESSAGE HANDLING ───────────────────────────────────────

/**
 * Processes a user message — sends to AI and handles response.
 * @param {string} message - User's text
 */
async function handleUserMessage(message) {
  if (!message || message.trim().length === 0) return;

  // Add to chat
  addChatBubble(message, 'user');
  APP.chatHistory.push({ role: 'user', text: message });

  setStatus('processing');

  // Query AI
  const response = await queryAI(message);

  // Add AI response to chat
  addChatBubble(response.text, 'ai');
  APP.chatHistory.push({ role: 'assistant', text: response.text });

  // Execute intent if present
  let intentHandled = false;
  if (response.intent) {
    intentHandled = await executeIntent(response.intent);
  }

  // Speak the response if intent didn't take over speaking
  if (!intentHandled) {
    speak(response.text);
  }

  setStatus('idle');
}

/**
 * Adds a chat bubble to the voice chat container.
 * @param {string} text
 * @param {string} sender - 'user' or 'ai'
 */
function addChatBubble(text, sender) {
  const container = document.getElementById('chat-container');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;

  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  if (sender === 'ai') {
    // AI bubble with copy button
    bubble.innerHTML = `
      <div class="chat-bubble-header">
        <span class="ai-response-text"></span>
        <button class="chat-copy-btn" title="Copy text" onclick="copyChatText('${escapeAttr(text)}')"><i data-lucide="copy"></i></button>
      </div>
      <div class="chat-time">${time}</div>
    `;
    container.appendChild(bubble);
    typewriterEffect(bubble.querySelector('.ai-response-text'), text);
  } else {
    bubble.innerHTML = `${escapeHtml(text)}<div class="chat-time">${time}</div>`;
    container.appendChild(bubble);
  }

  container.scrollTop = container.scrollHeight;
}

/**
 * Typewriter animation for AI responses.
 */
function typewriterEffect(element, text, speed = 20) {
  let i = 0;
  element.classList.add('typewriter');
  const interval = setInterval(() => {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      const chatBox = document.getElementById('chat-container');
      if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      element.classList.remove('typewriter');
      clearInterval(interval);
    }
  }, speed);
}

/**
 * Copies text to system clipboard.
 */
function copyChatText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── STATUS MANAGEMENT ──────────────────────────────────────

/**
 * Updates the global status indicators across screens.
 * @param {string} status - idle, listening, processing, error
 */
function setStatus(status) {
  APP.status = status;

  const labels = {
    idle: 'Idle — Awaiting command',
    listening: '<i data-lucide="mic"></i> Listening...',
    processing: '⏳ Processing...',
    error: '<i data-lucide="x-circle"></i> Error occurred',
  };

  // Update all status dots and labels
  document.querySelectorAll('.status-dot').forEach(dot => {
    dot.className = `status-dot ${status}`;
  });
  document.querySelectorAll('.status-label').forEach(label => {
    label.textContent = labels[status] || status;
  });

  // Update mic button
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) {
    micBtn.classList.toggle('active', status === 'listening');
  }
}

// ─── HOME SCREEN ────────────────────────────────────────────

let homeInitialized = false;

async function initHomeScreen() {
  if (homeInitialized) {
    // Just refresh stats
    await refreshHomeStats();
    return;
  }
  
  homeInitialized = true; // Set early to prevent race conditions
  await refreshHomeStats();

  // Set greeting
  const hour = new Date().getHours();
  let greeting;
  if (hour < 12) greeting = 'Good Morning, Sir';
  else if (hour < 17) greeting = 'Good Afternoon, Sir';
  else if (hour < 21) greeting = 'Good Evening, Sir';
  else greeting = 'Good Night, Sir';

  const greetEl = document.getElementById('home-greeting');
  if (greetEl) greetEl.textContent = greeting;

  // Quick action buttons
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'voice') navigateTo('voice');
      else if (action === 'notes') { navigateTo('notes'); }
      else if (action === 'files') navigateTo('files');
      else if (action === 'security') navigateTo('security');
    });
  });

  // Command input
  const cmdInput = document.getElementById('home-command-input');
  const cmdSend = document.getElementById('home-command-send');
  if (cmdInput && cmdSend) {
    cmdSend.addEventListener('click', () => {
      const msg = cmdInput.value.trim();
      if (msg) {
        handleUserMessage(msg);
        cmdInput.value = '';
      }
    });
    cmdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        cmdSend.click();
      }
    });
  }
}

async function refreshHomeStats() {
  try {
    const [sysInfo, notesCount, secLog] = await Promise.all([
      window.potts.system.getInfo(),
      window.potts.notes.count(),
      window.potts.security.getLog(),
    ]);

    const memPercent = Math.round(((sysInfo.totalMemory - sysInfo.freeMemory) / sysInfo.totalMemory) * 100);
    const uptimeH = Math.floor(sysInfo.uptime / 3600);
    const uptimeM = Math.floor((sysInfo.uptime % 3600) / 60);

    // Get Battery & CPU
    let batteryVal = '--';
    let cpuVal = '--';
    try {
      const [batRes, cpuRes] = await Promise.all([
        window.potts.system.execute('powershell -c "(Get-WmiObject -Class Win32_Battery).EstimatedChargeRemaining"'),
        window.potts.system.execute('powershell -c "(Get-CimInstance Win32_Processor).LoadPercentage"')
      ]);
      if (batRes.success && batRes.output.trim()) batteryVal = batRes.output.trim() + '%';
      if (cpuRes.success && cpuRes.output.trim()) cpuVal = cpuRes.output.trim() + '%';
    } catch {}

    setElementText('stat-notes', notesCount);
    setElementText('stat-security', secLog.length);
    setElementText('stat-memory', memPercent + '%');
    setElementText('stat-cpu', cpuVal);
    setElementText('stat-battery', batteryVal);
    setElementText('stat-uptime', `${uptimeH}h ${uptimeM}m`);
    setElementText('stat-hostname', sysInfo.hostname || 'POTTS');
  } catch (err) {
    console.error('[Home] Stats error:', err);
  }
}

// ─── VOICE SCREEN ───────────────────────────────────────────

let voiceInitialized = false;

function initVoiceScreen() {
  if (voiceInitialized) return;
  voiceInitialized = true; // Set early to prevent race conditions

  const micBtn = document.getElementById('mic-btn');
  const textInput = document.getElementById('voice-text-input');
  const sendBtn = document.getElementById('voice-send-btn');

  if (micBtn) {
    micBtn.addEventListener('click', toggleListening);
  }

  if (textInput && sendBtn) {
    sendBtn.addEventListener('click', () => {
      const msg = textInput.value.trim();
      if (msg) {
        handleUserMessage(msg);
        textInput.value = '';
      }
    });
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn.click();
    });
  }
}

// ─── FILES SCREEN ───────────────────────────────────────────

let filesInitialized = false;
let currentFilePath = 'D:\\';
let fileItems = [];

async function initFilesScreen() {
  if (filesInitialized) return;
  filesInitialized = true; // Set early to prevent race conditions during async loads

  const driveSelect = document.getElementById('files-drive-select');
  if (driveSelect) {
    driveSelect.value = APP.settings.defaultDrive || 'D:\\';
    currentFilePath = driveSelect.value;
    driveSelect.addEventListener('change', () => {
      currentFilePath = driveSelect.value;
      loadDirectory(currentFilePath);
    });
  }

  document.getElementById('breadcrumb-up')?.addEventListener('click', navigateUpDirectory);
  document.getElementById('files-new-file')?.addEventListener('click', () => showNewItemDialog(false));
  document.getElementById('files-new-folder')?.addEventListener('click', () => showNewItemDialog(true));
  document.getElementById('files-refresh')?.addEventListener('click', () => loadDirectory(currentFilePath));

  await loadDirectory(currentFilePath);
  await loadFileActionLog();
}

async function loadDirectory(dirPath) {
  const fileList = document.getElementById('file-list');
  if (!fileList) return;

  fileList.innerHTML = '<div class="spinner"></div>';

  try {
    const result = await window.potts.files.list(dirPath);
    if (!result.success) {
      fileList.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="alert-triangle"></i></div><div class="empty-title">Access Denied</div><div class="empty-desc">${escapeHtml(result.error)}</div></div>`;
      speak(result.error);
      return;
    }

    currentFilePath = result.currentPath;
    fileItems = result.items;
    updateBreadcrumbs();

    if (fileItems.length === 0) {
      fileList.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><div class="empty-title">Empty folder</div><div class="empty-desc">No files or folders here.</div></div>';
      return;
    }

    fileList.innerHTML = fileItems.map(item => `
      <div class="file-item" data-path="${escapeHtml(item.path)}" data-is-dir="${item.isDirectory}" data-name="${escapeHtml(item.name)}">
        <span class="file-icon">${getFileIcon(item)}</span>
        <span class="file-name">${escapeHtml(item.name)}</span>
        <span class="file-meta">${item.isDirectory ? '' : formatFileSize(item.size)}</span>
        <div class="file-actions">
          <button class="btn btn-sm btn-icon" onclick="openInExplorer('${escapeAttr(item.path)}')" title="Open Location"><i data-lucide="external-link"></i></button>
          <button class="btn btn-sm btn-icon" onclick="renameFileItem(event, '${escapeAttr(item.path)}', '${escapeAttr(item.name)}')" title="Rename"><i data-lucide="edit-2"></i></button>
          <button class="btn btn-sm btn-icon btn-danger" onclick="deleteFileItem(event, '${escapeAttr(item.path)}', '${escapeAttr(item.name)}')" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `).join('');

    // Attach click handlers for navigation
    fileList.querySelectorAll('.file-item').forEach(el => {
      el.addEventListener('dblclick', () => {
        const isDir = el.getAttribute('data-is-dir') === 'true';
        const filePath = el.getAttribute('data-path');
        if (isDir) {
          loadDirectory(filePath);
        } else {
          openFileViewer(filePath, el.getAttribute('data-name'));
        }
      });
    });
  } catch (err) {
    fileList.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="x-circle"></i></div><div class="empty-title">Error</div><div class="empty-desc">${escapeHtml(err.message)}</div></div>`;
  }
}

function updateBreadcrumbs() {
  const container = document.getElementById('breadcrumb-items');
  if (!container) return;

  const parts = currentFilePath.split('\\').filter(Boolean);
  let accum = '';
  container.innerHTML = parts.map((part, idx) => {
    accum += part + '\\';
    const fullPath = accum;
    return `<button class="breadcrumb-item" onclick="loadDirectory('${escapeAttr(fullPath)}')">${escapeHtml(part)}</button>${idx < parts.length - 1 ? '<span class="breadcrumb-sep">›</span>' : ''}`;
  }).join('');
}

function navigateUpDirectory() {
  const parent = currentFilePath.replace(/\\[^\\]+\\?$/, '');
  const drive = currentFilePath.match(/^[A-Z]:\\/i)?.[0] || 'D:\\';
  const target = parent.length >= drive.length ? parent : drive;
  loadDirectory(target.endsWith('\\') ? target : target + '\\');
}

function showNewItemDialog(isDirectory) {
  const name = prompt(isDirectory ? 'Enter folder name:' : 'Enter file name:');
  if (!name || name.trim().length === 0) return;

  const fullPath = currentFilePath + (currentFilePath.endsWith('\\') ? '' : '\\') + name.trim();
  window.potts.files.create({ filePath: fullPath, content: '', isDirectory }).then(result => {
    if (result.success) {
      showToast(`${isDirectory ? 'Folder' : 'File'} created: ${name}`, 'success');
      loadDirectory(currentFilePath);
      loadFileActionLog();
    } else {
      showToast(result.error, 'error');
    }
  });
}

async function deleteFileItem(event, filePath, name) {
  event.stopPropagation();
  const confirmed = await window.potts.dialog.confirm({
    title: 'Delete Confirmation',
    message: `Delete "${name}"?\n\nThis cannot be undone.`,
  });
  if (!confirmed) return;

  const result = await window.potts.files.delete(filePath);
  if (result.success) {
    showToast(`Deleted: ${name}`, 'success');
    loadDirectory(currentFilePath);
    loadFileActionLog();
  } else {
    showToast(result.error, 'error');
  }
}

async function renameFileItem(event, filePath, oldName) {
  event.stopPropagation();
  const newName = prompt('Enter new name:', oldName);
  if (!newName || newName.trim() === oldName) return;

  const result = await window.potts.files.rename({ oldPath: filePath, newName: newName.trim() });
  if (result.success) {
    showToast(`Renamed to: ${newName}`, 'success');
    loadDirectory(currentFilePath);
    loadFileActionLog();
  } else {
    showToast(result.error, 'error');
  }
}

async function openFileViewer(filePath, name) {
  const result = await window.potts.files.read(filePath);
  if (!result.success) {
    showToast(result.error, 'error');
    return;
  }

  // Show in modal
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-title"><i data-lucide="file"></i> ${escapeHtml(name)}</div>
    <textarea class="input" id="file-editor-content" style="min-height: 200px; font-family: var(--font-mono); font-size: 12px;">${escapeHtml(result.content)}</textarea>
    <div class="modal-footer">
      <button class="btn" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-save-file"><i data-lucide="save"></i> Save</button>
    </div>
  `;
  overlay.classList.add('active');

  document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('modal-save-file').addEventListener('click', async () => {
    const content = document.getElementById('file-editor-content').value;
    const writeResult = await window.potts.files.write({ filePath, content });
    if (writeResult.success) {
      showToast('File saved!', 'success');
      overlay.classList.remove('active');
      loadFileActionLog();
    } else {
      showToast(writeResult.error, 'error');
    }
  });
}

async function loadFileActionLog() {
  const logEl = document.getElementById('file-action-log');
  if (!logEl) return;

  try {
    const actions = await window.potts.files.getActionLog();
    if (actions.length === 0) {
      logEl.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 11px;">No recent actions.</div>';
      return;
    }
    logEl.innerHTML = actions.slice(0, 10).map(a => `
      <div class="log-entry">
        <span class="log-icon">${a.success ? '<i data-lucide="check-circle"></i>' : '<i data-lucide="x-circle"></i>'}</span>
        <span class="log-time">${new Date(a.timestamp).toLocaleTimeString()}</span>
        <span class="log-message">[${a.type.toUpperCase()}] ${escapeHtml(a.path || '')}</span>
      </div>
    `).join('');
  } catch {
    logEl.innerHTML = '';
  }
}

function getFileIcon(item) {
  if (item.isDirectory) return '<i data-lucide="folder"></i>';
  const ext = (item.extension || '').toLowerCase();
  const iconMap = {
    '.txt': '<i data-lucide="file"></i>', '.md': '<i data-lucide="file-text"></i>', '.log': '<i data-lucide="clipboard"></i>', '.js': '<i data-lucide="file-code"></i>', '.ts': '<i data-lucide="file-code"></i>',
    '.py': '<i data-lucide="file-code"></i>', '.html': '<i data-lucide="globe"></i>', '.css': '<i data-lucide="palette"></i>', '.json': '<i data-lucide="package"></i>',
    '.jpg': '<i data-lucide="image"></i>', '.jpeg': '<i data-lucide="image"></i>', '.png': '<i data-lucide="image"></i>', '.gif': '<i data-lucide="image"></i>',
    '.mp3': '<i data-lucide="music"></i>', '.wav': '<i data-lucide="music"></i>', '.mp4': '<i data-lucide="video"></i>', '.mkv': '<i data-lucide="video"></i>',
    '.zip': '<i data-lucide="package"></i>', '.rar': '<i data-lucide="package"></i>', '.exe': '<i data-lucide="settings"></i>', '.pdf': '<i data-lucide="book"></i>',
    '.doc': '<i data-lucide="book"></i>', '.docx': '<i data-lucide="book"></i>', '.xls': '<i data-lucide="book"></i>', '.xlsx': '<i data-lucide="book"></i>',
  };
  return iconMap[ext] || '<i data-lucide="file"></i>';
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

// ─── NOTES SCREEN ───────────────────────────────────────────

let notesInitialized = false;
let allNotes = [];
let notesFilter = null;

async function initNotesScreen() {
  if (notesInitialized) {
    await refreshNotes();
    return;
  }
  notesInitialized = true; // Set early to prevent race conditions during async loads

  // Search input
  document.getElementById('notes-search')?.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.trim()) {
      const results = await window.potts.notes.search(query);
      renderNotesList(results);
    } else {
      await refreshNotes();
    }
  });

  // Tag filters
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      notesFilter = btn.getAttribute('data-filter') || null;
      refreshNotes();
    });
  });

  // Add note button
  document.getElementById('notes-add-btn')?.addEventListener('click', showNewNoteDialog);

  // Export button
  document.getElementById('notes-export-btn')?.addEventListener('click', async () => {
    try {
      const path = await window.potts.notes.export();
      showToast(`Notes exported to ${path}`, 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  });

  await refreshNotes();
}

async function refreshNotes() {
  try {
    allNotes = await window.potts.notes.getAll(notesFilter);
    renderNotesList(allNotes);
    updateTagCounts();
  } catch (err) {
    console.error('[Notes] Refresh error:', err);
  }
}

function renderNotesList(notes) {
  const grid = document.getElementById('notes-grid');
  if (!grid) return;

  if (!notes || notes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon"><i data-lucide="file-text"></i></div>
        <div class="empty-title">No notes found</div>
        <div class="empty-desc">Create your first note to get started.</div>
      </div>`;
    return;
  }

  grid.innerHTML = notes.map(note => `
    <div class="note-card" data-note-id="${note.id}" ondblclick="editNoteDialog('${note.id}')">
      <button class="btn btn-sm btn-icon btn-danger note-delete-btn" onclick="deleteNoteItem(event, '${note.id}', '${escapeAttr(note.title)}')" title="Delete"><i data-lucide="trash-2"></i></button>
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-footer">
        <span class="note-date">${formatTimeAgo(note.updatedAt)}</span>
        <div class="note-tags">
          ${(note.tags || []).map(t => `<span class="tag tag-${t}">#${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function updateTagCounts() {
  const counts = { all: allNotes.length, personal: 0, work: 0, todo: 0 };
  // Count from unfiltered notes
  window.potts.notes.getAll().then(all => {
    counts.all = all.length;
    all.forEach(n => (n.tags || []).forEach(t => { if (counts[t] !== undefined) counts[t]++; }));
    setElementText('count-all', counts.all);
    setElementText('count-personal', counts.personal);
    setElementText('count-work', counts.work);
    setElementText('count-todo', counts.todo);
  });
}

function showNewNoteDialog() {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-title"><i data-lucide="file-text"></i> New Note</div>
    <div class="input-group">
      <label>Title</label>
      <input type="text" class="input" id="new-note-title" placeholder="Note title...">
    </div>
    <div class="input-group">
      <label>Content</label>
      <textarea class="input" id="new-note-content" placeholder="Write your note... Use #personal #work #todo for tags"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-save-note"><i data-lucide="save"></i> Save</button>
    </div>
  `;
  overlay.classList.add('active');

  document.getElementById('new-note-title').focus();
  document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('modal-save-note').addEventListener('click', async () => {
    const title = document.getElementById('new-note-title').value.trim();
    const content = document.getElementById('new-note-content').value.trim();
    if (!title) { showToast('Title is required', 'warning'); return; }

    try {
      await window.potts.notes.create({ title, content, tags: [] });
      showToast('Note created!', 'success');
      overlay.classList.remove('active');
      await refreshNotes();
    } catch (err) {
      showToast('Failed to create note', 'error');
    }
  });
}

async function editNoteDialog(noteId) {
  const notes = await window.potts.notes.getAll();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <div class="modal-title"><i data-lucide="edit-2"></i> Edit Note</div>
    <div class="input-group">
      <label>Title</label>
      <input type="text" class="input" id="edit-note-title" value="${escapeAttr(note.title)}">
    </div>
    <div class="input-group">
      <label>Content</label>
      <textarea class="input" id="edit-note-content">${escapeHtml(note.content)}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-update-note"><i data-lucide="save"></i> Update</button>
    </div>
  `;
  overlay.classList.add('active');

  document.getElementById('modal-cancel').addEventListener('click', () => overlay.classList.remove('active'));
  document.getElementById('modal-update-note').addEventListener('click', async () => {
    const title = document.getElementById('edit-note-title').value.trim();
    const content = document.getElementById('edit-note-content').value.trim();
    if (!title) { showToast('Title is required', 'warning'); return; }

    try {
      await window.potts.notes.update({ id: noteId, updates: { title, content } });
      showToast('Note updated!', 'success');
      overlay.classList.remove('active');
      await refreshNotes();
    } catch (err) {
      showToast('Failed to update note', 'error');
    }
  });
}

async function deleteNoteItem(event, id, title) {
  event.stopPropagation();
  const confirmed = await window.potts.dialog.confirm({
    title: 'Delete Note',
    message: `Delete "${title}"?\n\nThis cannot be undone.`,
  });
  if (!confirmed) return;

  try {
    await window.potts.notes.delete(id);
    showToast('Note deleted', 'success');
    await refreshNotes();
  } catch (err) {
    showToast('Failed to delete note', 'error');
  }
}

// ─── SETTINGS SCREEN ───────────────────────────────────────

let settingsInitialized = false;

async function initSettingsScreen() {
  if (settingsInitialized) return;
  settingsInitialized = true; // Set early to prevent race conditions

  // Load current settings into form
  const s = APP.settings;

  setSelectValue('settings-ai-provider', s.aiProvider || 'gemini');
  setInputValue('settings-api-key', s.geminiApiKey || '');
  setInputValue('settings-groq-key', s.groqApiKey || '');
  setSelectValue('settings-gemini-model', s.geminiModel || 'gemini-2.0-flash');
  setSelectValue('settings-groq-model', s.groqModel || 'llama-3.3-70b-versatile');
  setInputValue('settings-voice-speed', s.voiceSpeed || 1.0);
  setInputValue('settings-voice-pitch', s.voicePitch || 1.0);
  setInputValue('settings-hotkey', s.globalHotkey || 'CommandOrControl+Space');
  setChecked('settings-autostart', s.autoStartOnBoot);
  setChecked('settings-always-top', s.alwaysOnTop);
  setChecked('settings-confirm-destructive', s.confirmDestructiveActions !== false);
  setSelectValue('settings-default-drive', s.defaultDrive || 'D:\\');
  setSelectValue('settings-theme', s.theme || 'dark');

  setElementText('voice-speed-value', s.voiceSpeed || 1.0);
  setElementText('voice-pitch-value', s.voicePitch || 1.0);

  // Toggle API key visibility
  document.getElementById('settings-toggle-key')?.addEventListener('click', () => {
    const input = document.getElementById('settings-api-key');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('settings-toggle-groq-key')?.addEventListener('click', () => {
    const input = document.getElementById('settings-groq-key');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Providers UI sync
  const providerGroupToggle = () => {
    const provider = document.getElementById('settings-ai-provider')?.value || 'gemini';
    const geminiGrp = document.getElementById('settings-group-gemini');
    const groqGrp = document.getElementById('settings-group-groq');
    if (geminiGrp) geminiGrp.style.display = provider === 'gemini' ? 'block' : 'none';
    if (groqGrp) groqGrp.style.display = provider === 'groq' ? 'block' : 'none';
  };
  document.getElementById('settings-ai-provider')?.addEventListener('change', providerGroupToggle);
  providerGroupToggle();

  // Slider live updates
  document.getElementById('settings-voice-speed')?.addEventListener('input', (e) => {
    setElementText('voice-speed-value', e.target.value);
  });
  document.getElementById('settings-voice-pitch')?.addEventListener('input', (e) => {
    setElementText('voice-pitch-value', e.target.value);
  });

  // Theme live preview
  document.getElementById('settings-theme')?.addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-theme', e.target.value);
  });

  // Save button
  document.getElementById('settings-save-btn')?.addEventListener('click', async () => {
    const updates = {
      aiProvider: document.getElementById('settings-ai-provider')?.value || 'gemini',
      geminiApiKey: document.getElementById('settings-api-key')?.value || '',
      groqApiKey: document.getElementById('settings-groq-key')?.value || '',
      geminiModel: document.getElementById('settings-gemini-model')?.value || 'gemini-2.0-flash',
      groqModel: document.getElementById('settings-groq-model')?.value || 'llama-3.3-70b-versatile',
      voiceSpeed: parseFloat(document.getElementById('settings-voice-speed')?.value) || 1.0,
      voicePitch: parseFloat(document.getElementById('settings-voice-pitch')?.value) || 1.0,
      globalHotkey: document.getElementById('settings-hotkey')?.value || 'CommandOrControl+Space',
      autoStartOnBoot: document.getElementById('settings-autostart')?.checked || false,
      alwaysOnTop: document.getElementById('settings-always-top')?.checked || false,
      confirmDestructiveActions: document.getElementById('settings-confirm-destructive')?.checked !== false,
      defaultDrive: document.getElementById('settings-default-drive')?.value || 'D:\\',
      theme: document.getElementById('settings-theme')?.value || 'dark',
    };

    const result = await window.potts.settings.update(updates);
    if (result.success) {
      APP.settings = result.settings;
      showToast('Settings saved!', 'success');
    } else {
      showToast('Failed to save settings', 'error');
    }
  });

  // Reset button
  document.getElementById('settings-reset-btn')?.addEventListener('click', async () => {
    const confirmed = await window.potts.dialog.confirm({
      title: 'Reset Settings',
      message: 'Reset all settings to default values?',
    });
    if (!confirmed) return;

    const result = await window.potts.settings.reset();
    if (result.success) {
      APP.settings = result.settings;
      document.documentElement.setAttribute('data-theme', 'dark');
      showToast('Settings reset to defaults', 'success');
      settingsInitialized = false;
      initSettingsScreen();
    }
  });
}

// ─── SECURITY SCREEN ───────────────────────────────────────

let securityInitialized = false;

async function initSecurityScreen() {
  // Always refresh log
  await loadDriveStatus();
  await loadSecurityLog();

  if (securityInitialized) return;
  securityInitialized = true; // Set early to prevent race conditions during async loads

  document.getElementById('security-export-btn')?.addEventListener('click', async () => {
    try {
      const exportPath = await window.potts.security.exportLog();
      showToast(`Log exported to ${exportPath}`, 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  });

  document.getElementById('security-clear-btn')?.addEventListener('click', async () => {
    const confirmed = await window.potts.dialog.confirm({
      title: 'Clear Security Log',
      message: 'Clear all security log entries?',
    });
    if (!confirmed) return;

    await window.potts.security.clearLog();
    showToast('Security log cleared', 'success');
    await loadSecurityLog();
  });
}

async function loadDriveStatus() {
  const grid = document.getElementById('drive-status-grid');
  if (!grid) return;

  try {
    const status = await window.potts.security.getDriveStatus();
    grid.innerHTML = Object.entries(status).map(([drive, info]) => `
      <div class="drive-status-card ${info.status}">
        <div class="drive-icon">${info.icon}</div>
        <div class="drive-label">${drive}</div>
        <div class="drive-sublabel">${info.label}</div>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '<div>Unable to load drive status</div>';
  }
}

async function loadSecurityLog() {
  const logEl = document.getElementById('security-log');
  if (!logEl) return;

  try {
    const entries = await window.potts.security.getLog();
    if (!entries || entries.length === 0) {
      logEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="shield"></i></div>
          <div class="empty-title">No blocked attempts</div>
          <div class="empty-desc">All clear — no suspicious activity detected.</div>
        </div>`;
      return;
    }

    logEl.innerHTML = entries.reverse().slice(0, 50).map(entry => {
      const match = entry.match(/\[(.*?)\]\s*\[(.*?)\]\s*\[(.*?)\]\s*(.*)/);
      if (match) {
        return `
          <div class="log-entry">
            <span class="log-icon"><i data-lucide="ban"></i></span>
            <span class="log-time">${match[1]}</span>
            <span class="log-message"><strong>${match[2]}</strong> ${escapeHtml(match[4])}</span>
          </div>`;
      }
      return `<div class="log-entry"><span class="log-icon"><i data-lucide="ban"></i></span><span class="log-message">${escapeHtml(entry)}</span></div>`;
    }).join('');
  } catch {
    logEl.innerHTML = '<div>Unable to load security log</div>';
  }
}

// ─── UTILITY FUNCTIONS ──────────────────────────────────────

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setChecked(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = checked;
}

/**
 * Opens a file or folder in native Windows Explorer.
 */
async function openInExplorer(filePath) {
  if (!filePath) return;
  try {
    // '/select' opens the folder and highlights the file
    await window.potts.system.execute(`explorer /select,"${filePath}"`);
    showToast('Opening file location...', 'info');
  } catch (err) {
    showToast('Failed to open location', 'error');
  }
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\\/g, '\\\\');
}

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Make functions available globally for inline onclick handlers
window.loadDirectory = loadDirectory;
window.deleteFileItem = deleteFileItem;
window.renameFileItem = renameFileItem;
window.editNoteDialog = editNoteDialog;
window.deleteNoteItem = deleteNoteItem;
