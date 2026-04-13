
import fs from 'fs';
const content = fs.readFileSync('src/new-styles.css', 'utf8');

const finalRefinedFix = `
/* REFINED DROPDOWN FOCUS EFFECT */
.selection-area {
  position: relative !important;
  z-index: 6000 !important;
}

.week-options-container {
  background: #1a1a1e !important; 
  opacity: 1 !important;
  z-index: 9999 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 0 100vmax rgba(0,0,0,0.3) !important;
  padding: 12px !important;
  border-radius: 20px !important;
}

.week-option-item {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 14px 18px !important; /* Espaciado interno generoso */
  margin-bottom: 10px !important; /* Separación entre items */
  background: #242429 !important;
  border-radius: 14px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
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

let cleaned = content.split('/* REFINED DROPDOWN FOCUS EFFECT */')[0];
fs.writeFileSync('src/new-styles.css', cleaned.trim() + "\n" + finalRefinedFix, 'utf8');
