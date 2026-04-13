
import fs from 'fs';
let content = fs.readFileSync('src/new-styles.css', 'utf8');
content = content.replace(/transform:\s+translateY\(0\);/g, 'transform: none;');
fs.writeFileSync('src/new-styles.css', content, 'utf8');
