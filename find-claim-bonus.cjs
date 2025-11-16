const fs = require('fs');
const content = fs.readFileSync('server/routes.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('app.post("/api/user/claim-bonus"'));
console.log('Found at line:', idx + 1);
console.log('\n--- Code Block ---\n');
console.log(lines.slice(idx, idx + 20).join('\n'));
