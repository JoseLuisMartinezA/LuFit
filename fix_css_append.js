
import fs from 'fs';
const content = fs.readFileSync('src/new-styles.css', 'utf8');
// Detect the messed up part (spaced characters) or just truncate and re-add
const parts = content.split('/* FIX FOR DROPDOWN OVERLAPPING */');
let cleaned = parts[0].replace(/\u0000/g, ''); // Remove null bytes if any

cleaned += `
/* FIX FOR DROPDOWN OVERLAPPING */
.selection-area {
  position: relative !important;
  z-index: 6000 !important;
}

.week-options-container {
  background: #000000 !important;
  opacity: 1 !important;
  z-index: 9999 !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 0 100vmax rgba(0,0,0,0.5) !important;
}
`;

fs.writeFileSync('src/new-styles.css', cleaned, 'utf8');
