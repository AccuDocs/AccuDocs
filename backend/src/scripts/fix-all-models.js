const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.ts'));

let count = 0;
for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace "public " with "declare public ", but ignore "public static", "public async", etc.
  const regex = /^(\s+)public\s+(?!static\s|async\s|get\s|set\s|function\s|constructor\s)(.*)$/gm;
  
  const original = content;
  content = content.replace(regex, '$1declare public $2').replace(/declare public (.*?)!:/g, 'declare public $1:');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
    count++;
  }
}

console.log(`Finished updating ${count} files.`);
