
import fs from 'fs';
const buf = fs.readFileSync('src/ai_planner.js');
// Find line 21 approx (button class="close-modal")
const searchStr = 'close-modal';
const index = buf.indexOf(searchStr);
if (index !== -1) {
    const context = buf.slice(index, index + 100);
    console.log(context.toString('hex'));
}
