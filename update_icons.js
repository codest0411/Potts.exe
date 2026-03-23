const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf8');
let rendererJs = fs.readFileSync('renderer.js', 'utf8');

const iconMap = {
  '🏠': '<i data-lucide="home"></i>',
  '🎤': '<i data-lucide="mic"></i>',
  '📁': '<i data-lucide="folder"></i>',
  '📝': '<i data-lucide="file-text"></i>',
  '⚙️': '<i data-lucide="settings"></i>',
  '🛡️': '<i data-lucide="shield"></i>',
  '👁️': '<i data-lucide="eye"></i>',
  '⬆️': '<i data-lucide="arrow-up"></i>',
  '🔄': '<i data-lucide="refresh-cw"></i>',
  '📄': '<i data-lucide="file"></i>',
  '🗑️': '<i data-lucide="trash-2"></i>',
  '✏️': '<i data-lucide="edit-2"></i>',
  '🔍': '<i data-lucide="search"></i>',
  '📤': '<i data-lucide="upload"></i>',
  '💾': '<i data-lucide="save"></i>',
  '🚀': '<i data-lucide="rocket"></i>',
  '⏱️': '<i data-lucide="timer"></i>',
  '🔵': '<i data-lucide="circle" class="text-blue"></i>',
  '🟢': '<i data-lucide="circle" class="text-green"></i>',
  '🟡': '<i data-lucide="circle" class="text-yellow"></i>',
  '🌙': '<i data-lucide="moon"></i>',
  '☀️': '<i data-lucide="sun"></i>',
  '🔴': '<i data-lucide="circle" class="text-red"></i>',
  '⚠️': '<i data-lucide="alert-triangle"></i>',
  '❌': '<i data-lucide="x-circle"></i>',
  '✅': '<i data-lucide="check-circle"></i>',
  '🚫': '<i data-lucide="ban"></i>',
  '💛': '<i data-lucide="file-code"></i>',
  '💙': '<i data-lucide="file-code"></i>',
  '🐍': '<i data-lucide="file-code"></i>',
  '🌐': '<i data-lucide="globe"></i>',
  '🎨': '<i data-lucide="palette"></i>',
  '📦': '<i data-lucide="package"></i>',
  '🖼️': '<i data-lucide="image"></i>',
  '🎵': '<i data-lucide="music"></i>',
  '🎬': '<i data-lucide="video"></i>',
  '📕': '<i data-lucide="book"></i>',
  '📘': '<i data-lucide="book"></i>',
  '📗': '<i data-lucide="book"></i>',
  '📋': '<i data-lucide="clipboard"></i>'
};

// Add Lucide script
if (!indexHtml.includes('unpkg.com/lucide')) {
  indexHtml = indexHtml.replace(
    '  <script src="renderer.js"></script>',
    '  <script src="https://unpkg.com/lucide@latest"></script>\n  <script src="renderer.js"></script>'
  );
}

// Update CSP
if (!indexHtml.includes('unpkg.com')) {
  indexHtml = indexHtml.replace(
    'https://api.groq.com;">',
    'https://api.groq.com https://unpkg.com;">'
  );
}

// Add MutationObserver for icons
const observerScript = `
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      lucide.createIcons();
      const observer = new MutationObserver(() => {
        lucide.createIcons();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  </script>
`;

if (!indexHtml.includes('MutationObserver')) {
  indexHtml = indexHtml.replace('</body>', observerScript + '\n</body>');
}

// Replace all emojis
for (const [emoji, lucideHtml] of Object.entries(iconMap)) {
  indexHtml = indexHtml.split(emoji).join(lucideHtml);
  rendererJs = rendererJs.split(emoji).join(lucideHtml);
}

fs.writeFileSync('index.html', indexHtml);
fs.writeFileSync('renderer.js', rendererJs);

// Add CSS properties for the new icons
let stylesCss = fs.readFileSync('styles.css', 'utf8');
if (!stylesCss.includes('.lucide {')) {
  stylesCss += `

/* Lucide Icons */
.lucide {
  width: 1.1em;
  height: 1.1em;
  vertical-align: -0.125em;
  stroke-width: 2;
}
.text-blue { color: #3b82f6; }
.text-green { color: #22c55e; }
.text-yellow { color: #eab308; }
.text-red { color: #ef4444; }
.nav-rail .lucide {
  width: 1.4em;
  height: 1.4em;
  margin-bottom: 4px;
}
.qa-icon .lucide, .stat-icon .lucide {
  width: 1.5em;
  height: 1.5em;
}
`;
  fs.writeFileSync('styles.css', stylesCss);
}

console.log('Update Complete - Lucide icons installed!');
