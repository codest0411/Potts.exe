<div align="center">

```
██████╗  ██████╗ ████████╗████████╗███████╗
██╔══██╗██╔═══██╗╚══██╔══╝╚══██╔══╝██╔════╝
██████╔╝██║   ██║   ██║      ██║   ███████╗
██╔═══╝ ██║   ██║   ██║      ██║   ╚════██║
██║     ╚██████╔╝   ██║      ██║   ███████║
╚═╝      ╚═════╝    ╚═╝      ╚═╝   ╚══════╝
```

### **P**ersonal **O**perating **T**ask **T**echnology **S**ystem

<img src="https://img.shields.io/badge/version-1.0.0-00d4ff?style=for-the-badge&logo=electron&logoColor=white"/>
<img src="https://img.shields.io/badge/Electron-28.0-47848F?style=for-the-badge&logo=electron&logoColor=white"/>
<img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/Gemini_AI-1.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white"/>
<img src="https://img.shields.io/badge/Platform-Windows_10%2F11-0078D4?style=for-the-badge&logo=windows&logoColor=white"/>
<img src="https://img.shields.io/badge/License-MIT-00ff88?style=for-the-badge"/>

<br/>

> *"Sometimes you gotta run before you can walk."*
> **— Tony Stark**

<br/>

**POTTS is an Iron Man Jarvis-inspired AI desktop assistant for Windows.**
Voice-controlled. AI-powered. Fully hands-free.
Launch apps · Manage files · Take notes · Control your PC — all by voice.

<br/>

---

</div>

<br/>

## ◈ WHAT IS POTTS?

POTTS (**P**ersonal **O**perating **T**ask **T**echnology **S**ystem) is a native Windows desktop application that gives you complete voice control over your computer. Powered by **Google Gemini 1.5 Flash AI**, POTTS listens to your commands, understands intent, and executes actions — opening apps, reading and writing files, managing notes, controlling system settings, and more.

It sits silently in your **System Tray**, wakes with `Ctrl+Space`, and responds like a real AI assistant — not a glorified search bar.

> 🔒 **Security First**: The `C:\` drive is **permanently, hardcoded-blocked**. POTTS only operates on `D:\`, `E:\`, and external drives. Your Windows installation is always protected.

<br/>

---

## ◈ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                        POTTS DESKTOP v1.0.0                         │
│                    [ Electron + Node.js Runtime ]                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐   ┌───────▼──────┐   ┌──────▼──────┐
   │  RENDERER   │   │    MAIN      │   │   PRELOAD   │
   │  PROCESS    │   │   PROCESS    │   │   BRIDGE    │
   │             │   │              │   │             │
   │ renderer.js │   │   main.js    │   │ preload.js  │
   │ index.html  │   │              │   │             │
   │ styles.css  │   │ IPC Handlers │   │ contextBridge│
   └──────┬──────┘   └───────┬──────┘   └─────────────┘
          │                  │
          │    window.potts  │
          │◄─────────────────┤
          │                  │
   ┌──────▼──────────────────▼──────────────────────────┐
   │                   CORE MODULES                      │
   │                                                     │
   │  ┌─────────────────┐   ┌──────────────────────┐    │
   │  │ security-guard  │   │   notes-manager.js   │    │
   │  │      .js        │   │                      │    │
   │  │                 │   │  addNote()           │    │
   │  │ isPathBlocked() │   │  getNotes()          │    │
   │  │ isCmdBlocked()  │   │  editNote()          │    │
   │  │ logBlocked()    │   │  deleteNote()        │    │
   │  └────────┬────────┘   └──────────┬───────────┘    │
   │           │                       │                 │
   └───────────┼───────────────────────┼─────────────────┘
               │                       │
   ┌───────────▼───────────────────────▼─────────────────┐
   │                  DATA LAYER (D:\POTTS_Data\)         │
   │                                                     │
   │  notes.json   settings.json   action_log.json       │
   │  security.log                                       │
   └──────────────────────────────────────────────────────┘
```

<br/>

---

## ◈ VOICE COMMAND FLOW

```
  YOU SPEAK                   POTTS PROCESSES                 ACTION EXECUTES
  ─────────                   ────────────────                ───────────────

  🎤 Microphone          →    Web Speech API           →    Raw Transcript
      "Open VS Code"          (Built-in Chromium)           "Open VS Code"
                                      │
                                      ▼
                              Gemini 1.5 Flash          →    JSON Intent
                              (REST API call)                {
                              + System Prompt                  "action": "RUN_CMD",
                                                               "command": "code ."
                                                             }
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │   SECURITY GUARD       │
                         │   Check path/command   │
                         │   against blocklist    │
                         └────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │ SAFE                       │ BLOCKED
                    ▼                            ▼
             Intent Executor             🔒 "Access Denied"
             (IPC → main.js)             Log + Speak Error
                    │
                    ▼
          child_process / fs /
          RobotJS / Clipboard
                    │
                    ▼
          ✅ Action Performed
          🔊 TTS Response Spoken
          📋 Action Logged
```

<br/>

---

## ◈ FEATURE MAP

```
POTTS DESKTOP
│
├── 🎤  VOICE ASSISTANT
│   ├── Web Speech API (free, built-in Chromium)
│   ├── Google Gemini 1.5 Flash (AI brain)
│   ├── SpeechSynthesis TTS (free, built-in)
│   ├── Fallback: keyboard text input
│   └── Status: Idle → Listening → Processing → Response
│
├── 📁  FILE MANAGER
│   ├── READ   — read any file on D:\ or E:\
│   ├── WRITE  — create new files with content
│   ├── EDIT   — append / prepend / overwrite files
│   ├── DELETE — confirm first, then delete
│   ├── COPY   — duplicate files across drives
│   ├── MOVE   — relocate files
│   ├── RENAME — rename files and folders
│   ├── LIST   — browse directory contents
│   └── SEARCH — find files by pattern (*.pdf, etc.)
│
├── 📝  NOTES MANAGER
│   ├── ADD    — voice or type new notes
│   ├── READ   — list all / today / search
│   ├── EDIT   — update note by ID
│   ├── DELETE — remove note by ID (confirmed)
│   ├── TAG    — #personal #work #todo
│   ├── EXPORT — save to D:\POTTS_Data\notes.txt
│   └── CLEAR  — wipe all notes (backup created)
│
├── 🖥️  SYSTEM CONTROLS
│   ├── Volume: up / down / mute / set level
│   ├── Lock screen
│   ├── Shutdown / Restart (verbal confirm required)
│   ├── Time & Date
│   ├── Battery level
│   ├── Disk space info
│   └── Weather (Open-Meteo API — no key needed)
│
├── ⌨️  TYPING AUTOMATION (RobotJS)
│   ├── Type text into any focused window
│   └── Send keyboard shortcuts (Ctrl+S, Alt+F4, etc.)
│
├── 📋  CLIPBOARD
│   ├── Write to clipboard by voice
│   └── Read clipboard content aloud
│
├── ⚙️  SETTINGS
│   ├── Gemini API key (stored in settings.json)
│   ├── Global hotkey (default: Ctrl+Space)
│   ├── Voice speed + pitch sliders
│   ├── Auto-start on Windows boot
│   ├── Always on top toggle
│   ├── Theme: Dark / Light / Iron Man
│   └── Default drive selector
│
└── 🛡️  SECURITY
    ├── C:\ drive permanently blocked (hardcoded)
    ├── Dangerous command blocklist
    ├── Destructive action confirmation
    ├── Full audit log (action_log.json)
    └── Security incident log (security.log)
```

<br/>

---

## ◈ AI MODEL & API DETAILS

### 🤖 Google Gemini 1.5 Flash

| Property | Value |
|---|---|
| **Model ID** | `gemini-1.5-flash` |
| **Provider** | Google AI (Gemini API) |
| **Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent` |
| **Free Tier** | ✅ 15 requests/min · 1,000,000 tokens/day · $0 cost |
| **Get API Key** | [ai.google.dev](https://ai.google.dev) |
| **Input** | Voice transcript + system prompt + conversation history |
| **Output** | Plain text reply OR structured JSON intent |
| **Max Tokens** | 1,000 (per response, configurable) |
| **Temperature** | 0.7 (balanced between creative and precise) |

**Why Gemini 1.5 Flash?**
- Fastest response time in the Gemini family (~500ms average)
- Best-in-class JSON structured output for intent parsing
- Free tier is genuinely generous — no credit card required
- Supports system prompts natively for persona injection

### 🎤 Web Speech API (Voice Recognition)

| Property | Value |
|---|---|
| **API** | `window.SpeechRecognition` / `webkitSpeechRecognition` |
| **Provider** | Built into Chromium (Electron uses Chromium) |
| **Cost** | ✅ Completely free — no API key |
| **Language** | `en-US` (configurable) |
| **Mode** | Continuous + interim results |

### 🔊 SpeechSynthesis API (Text-to-Speech)

| Property | Value |
|---|---|
| **API** | `window.speechSynthesis` |
| **Provider** | Built into Chromium / Windows SAPI |
| **Cost** | ✅ Completely free |
| **Voices** | Uses all voices installed on Windows |
| **Rate / Pitch** | Configurable in Settings |

### 🌤️ Open-Meteo Weather API

| Property | Value |
|---|---|
| **Endpoint** | `https://api.open-meteo.com/v1/forecast` |
| **Cost** | ✅ Completely free — no API key required |
| **Data** | Temperature, weather code, wind speed |
| **Geocoding** | `https://geocoding-api.open-meteo.com/v1/search` |

<br/>

---

## ◈ SECURITY ARCHITECTURE

```
  EVERY FILE / CMD OPERATION
           │
           ▼
  ┌────────────────────────┐
  │    security-guard.js   │
  │                        │
  │  isPathBlocked(path)   │◄── Checks against BLOCKED_PATHS[]
  │  isCmdBlocked(cmd)     │◄── Checks against BLOCKED_COMMANDS[]
  └────────────┬───────────┘
               │
    ┌──────────┴──────────┐
    │ BLOCKED             │ SAFE
    ▼                     ▼
  Abort instantly     Execute operation
  Log to             Log to
  security.log       action_log.json
  Speak error        Speak success
  Show red UI        Show green UI
```

### 🔒 Permanently Blocked Paths
```
C:\          C:/          \Windows\      \System32\
\Program Files\           \Program Files (x86)\
\Users\      \AppData\    %SystemRoot%   %WINDIR%
%SYSTEMDRIVE%
```

### ⛔ Permanently Blocked Commands
```
format          del /s /q C:\     rmdir /s C:\
reg delete      bcdedit           diskpart
netsh firewall  cipher /w         taskkill /im explorer.exe
shutdown /r /f (without confirmation)
```

### ✅ Allowed Zones
```
D:\   E:\   F:\   and above
Mapped network drives (\\server\share)
App's own install directory
```

<br/>

---

## ◈ PROJECT STRUCTURE

```
POTTS-Desktop/
│
├── 📄 package.json              ← Dependencies + build config + scripts
├── 📄 main.js                   ← Electron main: tray, hotkey, IPC, fs ops
├── 📄 preload.js                ← Secure contextBridge (window.potts API)
├── 📄 index.html                ← App shell + 6 screen templates
├── 📄 styles.css                ← UI design system (3 themes, animations)
├── 📄 renderer.js               ← AI brain: voice, Gemini, TTS, executor
├── 📄 security-guard.js         ← C:\ blocker + command sanitizer
├── 📄 notes-manager.js          ← Notes CRUD + JSON persistence
│
├── 📁 assets/
│   ├── icon.ico                 ← Tray + taskbar icon
│   └── icon.png
│
├── 📁 models/
│   ├── Note.js                  ← Note data model {id, content, tags, dates}
│   ├── FileAction.js            ← Action log model
│   └── Settings.js              ← App settings model + defaults
│
├── 📁 viewmodels/
│   ├── HomeViewModel.js         ← Dashboard logic + recent activity
│   ├── FilesViewModel.js        ← File browser + operation handlers
│   ├── NotesViewModel.js        ← Notes list + search + filter
│   └── SettingsViewModel.js     ← Settings load/save + validation
│
├── 📁 tests/
│   ├── security.test.js         ← C:\ block + command sanitizer tests
│   ├── notes.test.js            ← Notes CRUD unit tests
│   └── files.test.js            ← File operation unit tests
│
└── 📁 D:\POTTS_Data\            ← Auto-created on first launch
    ├── notes.json               ← All notes storage
    ├── settings.json            ← User preferences
    ├── action_log.json          ← File operation audit trail
    └── security.log             ← Blocked attempt incident log
```

<br/>

---

## ◈ PREREQUISITES

| Requirement | Version | Download |
|---|---|---|
| **Node.js** | v18 or higher | [nodejs.org](https://nodejs.org) |
| **npm** | v9 or higher | Included with Node.js |
| **Windows** | 10 or 11 (64-bit) | — |
| **Gemini API Key** | Free | [ai.google.dev](https://ai.google.dev) |
| **Microphone** | Any | Required for voice mode |

<br/>

---

## ◈ QUICK START

### Step 1 — Clone or Download
```bash
git clone https://github.com/yourusername/potts-desktop.git
cd potts-desktop
```

### Step 2 — Install Dependencies
```bash
npm install
```

### Step 3 — Rebuild Native Modules
```bash
npm run rebuild
```
> ⚠️ This step is **required**. It recompiles RobotJS for your exact
> version of Electron's Node.js runtime. Skip this and keyboard
> injection will not work.

### Step 4 — Add Your Gemini API Key
**Option A** — Via the app UI:
```
Launch app → Click ⚙️ Settings → Paste API key → Save
```

**Option B** — Direct config edit:
```json
// D:\POTTS_Data\settings.json
{
  "geminiApiKey": "YOUR_GEMINI_API_KEY_HERE"
}
```

### Step 5 — Launch
```bash
npm start
```

> Press `Ctrl+Space` from anywhere to summon POTTS.

<br/>

---

## ◈ BUILD & DISTRIBUTION

### NSIS Installer (Recommended)
```bash
npm run build
# Output: dist/POTTS-Desktop-1.0.0-Setup.exe
```

### Portable Executable (No install required)
```bash
npm run build:portable
# Output: dist/POTTS-Desktop-1.0.0-Portable.exe
```

<br/>

---

## ◈ VOICE COMMAND REFERENCE

| Command | What Happens |
|---|---|
| `"Open Chrome"` | Launches Google Chrome |
| `"Open VS Code"` | Launches Visual Studio Code |
| `"Go to github.com"` | Opens URL in default browser |
| `"What time is it?"` | Speaks current time |
| `"What's the weather in Mumbai?"` | Fetches & speaks weather |
| `"Read D:\Projects\config.json"` | Reads and speaks file content |
| `"Create a file called report.txt"` | Creates new file on D:\ |
| `"Delete old-backup.zip from E drive"` | Confirms then deletes |
| `"Add a note: Call client at 3pm"` | Saves tagged note |
| `"Read my notes"` | Speaks all saved notes |
| `"Find notes about project"` | Searches and returns matches |
| `"Type: Dear Sir, I hope you are well"` | Types into active window |
| `"Press Ctrl S"` | Sends Ctrl+S to active window |
| `"Volume up"` / `"Mute"` | Controls system volume |
| `"Lock the screen"` | Locks Windows immediately |
| `"Shutdown"` | Asks confirmation, then shuts down |
| `"Open C:\Windows\System32"` | 🔒 **BLOCKED** — security error |

<br/>

---

## ◈ CONFIGURATION REFERENCE

All settings stored at `D:\POTTS_Data\settings.json`:

```json
{
  "geminiApiKey"              : "",
  "voiceSpeed"                : 1.0,
  "voicePitch"                : 1.0,
  "globalHotkey"              : "CommandOrControl+Space",
  "autoStartOnBoot"           : false,
  "alwaysOnTop"               : false,
  "confirmDestructiveActions" : true,
  "defaultDrive"              : "D:\\",
  "theme"                     : "dark",
  "language"                  : "en-US",
  "logActions"                : true,
  "maxLogEntries"             : 500
}
```

<br/>

---

## ◈ TESTING

```bash
npm test                   # Run all test suites
npm run test:security      # Security guard tests only
npm run test:notes         # Notes CRUD tests only
npm run test:files         # File operation tests only
```

**Test Coverage:**

| Suite | What's Tested |
|---|---|
| `security.test.js` | C:\ path blocking, command sanitizer, edge cases |
| `notes.test.js` | Add, get, edit, delete, search, export notes |
| `files.test.js` | Read, write, copy, move, rename, list directory |

<br/>

---

## ◈ IPC CHANNEL REFERENCE

| Channel | Direction | Purpose |
|---|---|---|
| `run-command` | renderer → main | Execute CMD/PowerShell |
| `type-text` | renderer → main | RobotJS keyboard inject |
| `press-key` | renderer → main | RobotJS shortcut inject |
| `fs-read` | renderer → main | Read file |
| `fs-write` | renderer → main | Create/overwrite file |
| `fs-edit` | renderer → main | Append/prepend/replace |
| `fs-delete` | renderer → main | Delete file or folder |
| `fs-list` | renderer → main | List directory |
| `fs-copy` | renderer → main | Copy file |
| `fs-move` | renderer → main | Move file |
| `fs-rename` | renderer → main | Rename file |
| `fs-search` | renderer → main | Search by pattern |
| `notes-add` | renderer → main | Add note |
| `notes-get` | renderer → main | Get notes |
| `notes-delete` | renderer → main | Delete note |
| `notes-edit` | renderer → main | Edit note |
| `notes-export` | renderer → main | Export notes |
| `clipboard-write` | renderer → main | Write clipboard |
| `clipboard-read` | renderer → main | Read clipboard |
| `system-info` | renderer → main | Battery/disk/time |
| `system-control` | renderer → main | Volume/lock/shutdown |
| `security-alert` | main → renderer | Broadcast blocked attempt |

<br/>

---

## ◈ DEPENDENCIES

| Package | Version | Purpose |
|---|---|---|
| `electron` | ^28.0.0 | Desktop app framework |
| `robotjs` | ^0.6.0 | Native keyboard/mouse injection |
| `electron-builder` | ^24.9.1 | Package to .exe installer |
| `electron-rebuild` | ^3.2.9 | Rebuild native modules for Electron |

**Zero external API dependencies for core voice + TTS** — both use
free, built-in Chromium APIs. Only Gemini requires an API key.

<br/>

---

## ◈ CONTRIBUTING

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Commit your changes
git commit -m "feat: add your feature description"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

**Commit Convention:** `feat:` · `fix:` · `security:` · `docs:` · `test:`

<br/>

---

## ◈ ROADMAP

- [ ] **v1.1** — Multi-language voice support (Hindi, Spanish, French)
- [ ] **v1.2** — Plugin system for custom voice commands
- [ ] **v1.3** — Screenshot + screen reading capability
- [ ] **v1.4** — Email integration (read/send via voice)
- [ ] **v2.0** — Local LLM support (Ollama / LM Studio — fully offline)

<br/>

---

## ◈ LICENSE

```
MIT License — free for personal and commercial use.
Copyright (c) 2025 POTTS Systems
```

<br/>

---

<div align="center">

```
  ◆ Built with Electron · Powered by AI · Secured by Design ◆
               "Your AI. Your Machine. Your Rules."
                      POTTS Desktop v1.0.0
```

<img src="https://img.shields.io/badge/Made_with-Electron-47848F?style=flat-square&logo=electron"/>
<img src="https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=flat-square&logo=google"/>
<img src="https://img.shields.io/badge/Voice-Web_Speech_API-00d4ff?style=flat-square"/>
<img src="https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows"/>

</div>