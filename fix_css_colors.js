
import fs from 'fs';
const content = fs.readFileSync('src/new-styles.css', 'utf8');

// Use a regex to find the last added fix block and replace it with a more refined version
const refinedFix = `
/* REFINED DROPDOWN FOCUS EFFECT */
.selection-area {
  position: relative !important;
  z-index: 6000 !important;
}

.week-options-container {
  background: #1a1a1e !important; /* Color de panel oficial de la app */
  opacity: 1 !important;
  z-index: 9999 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 0 100vmax rgba(0,0,0,0.3) !important;
  padding: 8px !important;
}

.week-option-item {
  background: #242429 !important; /* Un tono ligeramente más claro para los items */
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  margin-bottom: 6px !important;
}

.week-option-item:hover {
  background: #2d2d35 !important;
}

.week-option-item.active {
  background: linear-gradient(135deg, #d81b60, #ff8a65) !important;
}
`;

// Clean up existing fix blocks (both the broken and the working ones at the end)
let cleaned = content.split('/* FIX FOR DROPDOWN OVERLAPPING */')[0];
cleaned = cleaned.split('/* REFINED DROPDOWN FOCUS EFFECT */')[0];

fs.writeFileSync('src/new-styles.css', cleaned.trim() + "\n" + refinedFix, 'utf8');
