
import fs from 'fs';
const content = fs.readFileSync('src/ai_planner.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('??')) {
        console.log(`${i+1}: ${line.trim()}`);
    }
});
