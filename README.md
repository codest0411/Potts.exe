# POTTS Desktop — AI Voice Assistant

<p align="center">
  <strong>◆ POTTS Desktop v1.0.0</strong><br>
  A voice-controlled AI desktop assistant powered by Google Gemini.<br>
  Launch apps, manage files, take notes, and control Windows — all hands-free.
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎤 **Voice Assistant** | Speak commands using Web Speech API → processed by Gemini AI |
| 📁 **File Manager** | Browse, create, edit, copy, move, rename, delete files on D:\ and E:\ |
| 📝 **Notes Manager** | Create, search, tag, edit, and export notes with #personal #work #todo |
| ⚙️ **Settings** | API key, voice speed/pitch, theme, hotkeys, auto-start |
| 🛡️ **Security** | C:\ permanently blocked, dangerous commands blocked, full audit log |
| 🖥️ **System Controls** | Volume, lock screen, shutdown/restart, weather, battery, time |
| 📌 **System Tray** | Minimizes to tray, global hotkey (Ctrl+Space), right-click menu |

## 🎨 Themes

- **🌙 Dark Mode** — Default, cyan accent (#00D4FF)
- **☀️ Light Mode** — Clean white UI
- **🔴 Iron Man** — Red accent, dark warm tones

---

## 📋 Prerequisites

- **Node.js** v18+ — [https://nodejs.org](https://nodejs.org)
- **npm** v9+
- **Windows 10/11** (64-bit)
- **Gemini API Key** (free) — [https://ai.google.dev](https://ai.google.dev)

---

## 🚀 Quick Start

### 1. Clone / Download

```bash
cd d:\projects\Windows\Potts
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Rebuild Native Modules

```bash
npm run rebuild
```

> This rebuilds RobotJS for Electron's Node.js version.

### 4. Add Your Gemini API Key

Either:
- Open the app → **Settings** → paste your API key, or
- Edit `D:\POTTS_Data\settings.json` directly:

```json
{
  "geminiApiKey": "YOUR_API_KEY_HERE"
}
```

### 5. Launch the App

```bash
npm start
```

---

## 🏗️ Build Installer (.exe)

### NSIS Installer (recommended)
```bash
npm run build
```
Output: `dist/POTTS-Desktop-1.0.0-Setup.exe`

### Portable Executable
```bash
npm run build:portable
```
Output: `dist/POTTS-Desktop-1.0.0-Portable.exe`

---

## 🧪 Run Tests

```bash
npm test                   # Run all tests
npm run test:security      # Security guard tests only
npm run test:notes         # Notes manager tests only
npm run test:files         # File operations tests only
```

---

## 📁 Project Structure

```
POTTS-Desktop/
├── package.json              # Dependencies and build config
├── main.js                   # Electron main process (IPC, tray, hotkeys)
├── preload.js                # Secure context bridge (window.potts API)
├── index.html                # App shell + all screen templates
├── styles.css                # Complete UI design system (3 themes)
├── renderer.js               # AI brain, voice, screens, intent executor
├── security-guard.js         # C:\ blocker + command sanitizer
├── notes-manager.js          # Notes CRUD + JSON storage
├── assets/
│   └── icon.png              # App icon (tray + taskbar)
├── models/
│   ├── Note.js               # Note data model
│   ├── FileAction.js         # File action log model
│   └── Settings.js           # App settings model
├── viewmodels/
│   ├── HomeViewModel.js      # Home dashboard logic
│   ├── FilesViewModel.js     # File browser logic
│   ├── NotesViewModel.js     # Notes list logic
│   └── SettingsViewModel.js  # Settings logic
├── tests/
│   ├── security.test.js      # Security guard unit tests
│   ├── notes.test.js         # Notes CRUD unit tests
│   └── files.test.js         # File operations unit tests
└── D:\POTTS_Data/            # Auto-created at first launch
    ├── notes.json            # Notes storage
    ├── settings.json         # App settings
    ├── action_log.json       # File operation log
    └── security.log          # Blocked attempts log
```

---

## 🔒 Security Rules (Hardcoded)

### Blocked Paths
All access to these locations is **permanently denied**:
- `C:\` drive (entire drive)
- `\Windows\`, `\System32\`, `\Program Files\`
- `\Users\`, `\AppData\`
- `%SystemRoot%`, `%WINDIR%`

### Blocked Commands
These patterns are **permanently blocked**:
- `format`, `del /s /q C:`, `rmdir /s C:`
- `reg delete`, `bcdedit`, `diskpart`
- `netsh firewall`, `taskkill /im explorer`

### Destructive Action Confirmation
These actions require explicit user confirmation:
- Delete, Move, Rename files
- Shutdown, Restart system

---

## 🎤 Voice Commands (Examples)

| Command | Action |
|---------|--------|
| "What time is it?" | Speaks current time |
| "Open Calculator" | Launches Calculator |
| "Create a note called Shopping List" | Creates a new note |
| "Search notes for meeting" | Searches notes |
| "Volume up" / "Volume down" / "Mute" | Controls system volume |
| "Lock the screen" | Locks Windows |
| "What's the weather in London?" | Fetches weather (Open-Meteo) |
| "Shutdown" | Asks for confirmation, then shuts down |

---

## 🛠️ Configuration

All settings are stored at `D:\POTTS_Data\settings.json`:

```json
{
  "geminiApiKey": "",
  "voiceSpeed": 1.0,
  "voicePitch": 1.0,
  "globalHotkey": "CommandOrControl+Space",
  "autoStartOnBoot": false,
  "alwaysOnTop": false,
  "confirmDestructiveActions": true,
  "defaultDrive": "D:\\",
  "theme": "dark"
}
```

---

## 📜 License

MIT License — free for personal and commercial use.

---

<p align="center">
  Built with ❤️ using Electron + Gemini AI<br>
  <strong>◆ POTTS Desktop v1.0.0</strong>
</p>
