
import fs from 'fs';
const content = fs.readFileSync('src/new-styles.css', 'utf8');

const completeFix = `
/* GLOBAL MODAL PRIORITY */
.modal {
  z-index: 100000 !important;
}

/* FINAL REFINED DROPDOWN SYSTEM */
.selection-area {
  position: relative !important;
  z-index: 500 !important;
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
  box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
  padding: 12px !important;
  border-radius: 20px !important;
}

.week-option-item {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 14px 18px !important;
  margin-bottom: 10px !important;
  background: #242429 !important;
  border-radius: 14px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
  opacity: 1 !important;
}

.week-option-item:last-child {
  margin-bottom: 0 !important;
}

.week-option-item:hover {
  background: #2d2d35 !important;
  transform: translateX(4px);
}

.week-option-item.active {
  background: linear-gradient(135deg, #d81b60, #ff8a65) !important;
  box-shadow: 0 4px 15px rgba(216, 27, 96, 0.2);
}

.option-name {
  font-weight: 600 !important;
  font-size: 1rem !important;
  color: white !important;
}

.option-date {
  font-size: 0.75rem !important;
  color: #94a3b8 !important;
  background: rgba(255, 255, 255, 0.08) !important;
  padding: 4px 10px !important;
  border-radius: 10px !important;
}

.week-option-item.active .option-date {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}
`;

// Clean up previous fix blocks
let cleaned = content;
const fixBlocks = [
  '/* FIX FOR DROPDOWN OVERLAPPING */',
  '/* REFINED DROPDOWN FOCUS EFFECT */',
  '/* GLOBAL MODAL PRIORITY */',
  '/* FINAL REFINED DROPDOWN SYSTEM */'
];

fixBlocks.forEach(block => {
  cleaned = cleaned.split(block)[0];
});

fs.writeFileSync('src/new-styles.css', cleaned.trim() + "\n" + completeFix, 'utf8');
