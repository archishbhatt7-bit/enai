const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/(import|export)\s+(?:(?:.|\n)*?)\s+from\s+['\"](\.\.?\/[^'\"]+?)['\"]/g, (match, p1, p2) => {
        if (!p2.endsWith('.js') && !p2.endsWith('.json')) {
          const targetPath = path.resolve(path.dirname(fullPath), p2);
          try {
            if (fs.statSync(targetPath).isDirectory()) {
              return match.replace(p2, p2 + '/index.js');
            }
          } catch(e) {}
          return match.replace(p2, p2 + '.js');
        }
        return match;
      });
      // also match side-effect imports like import "./health"
      content = content.replace(/import\s+['\"](\.\.?\/[^'\"]+?)['\"]/g, (match, p1) => {
        if (!p1.endsWith('.js') && !p1.endsWith('.json')) {
          const targetPath = path.resolve(path.dirname(fullPath), p1);
          try {
            if (fs.statSync(targetPath).isDirectory()) {
              return match.replace(p1, p1 + '/index.js');
            }
          } catch(e) {}
          return match.replace(p1, p1 + '.js');
        }
        return match;
      });

      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.resolve('src'));
console.log('Fixed imports!');
