const fs = require('fs');
let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

text = text.replace(/headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\}/g, 'headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }');

text = text.replace(/await fetch\(`\/api\/shops\/\$\{slug\}\/portfolio\/\$\{i\}`,\s*\{\s*method:\s*"DELETE"\s*\}\);/g, 'await fetch(`/api/shops/${slug}/portfolio/${i}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });');

fs.writeFileSync('src/pages/Dashboard.tsx', text, 'utf8');
console.log("Fixed headers in Dashboard.tsx!");
