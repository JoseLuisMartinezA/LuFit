
import fs from 'fs';
const content = fs.readFileSync('src/new-styles.css', 'utf8');

const modalFix = `
/* GLOBAL MODAL PRIORITY */
.modal {
  z-index: 100000 !important; /* Siempre por encima de todo */
}

/* REFINED DROPDOWN LAYERING */
.selection-area {
  position: relative !important;
  z-index: 500 !important; /* Encima de day-selector (100) pero debajo de modales */
}

.custom-week-dropdown {
  position: relative;
  z-index: 1000 !important; 
}

.week-options-container {
  background: #1a1a1e !important; 
  opacity: 1 !important;
  z-index: 9999 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important; /* Shadow reduced, removed vmin large shadow */
  padding: 12px !important;
  border-radius: 20px !important;
}
`;

// Clean up previous fix block
let cleaned = content.split('/* REFINED DROPDOWN FOCUS EFFECT */')[0];
cleaned = cleaned.split('/* GLOBAL MODAL PRIORITY */')[0];

fs.writeFileSync('src/new-styles.css', cleaned.trim() + "\n" + modalFix, 'utf8');
