const fs = require('fs');
const path = require('path');

function checkFileForReact(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasReactImport = content.includes("import React");
    const hasUseState = content.includes("useState");
    
    if (hasUseState && !hasReactImport) {
      console.log(`❌ ${filePath}: useState без импорта React`);
      return false;
    }
    return true;
  } catch (error) {
    console.log(`⚠️  ${filePath}: ${error.message}`);
    return false;
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      checkFileForReact(fullPath);
    }
  });
}

console.log('🔍 Поиск проблемных файлов...');
scanDirectory('./src');
console.log('✅ Проверка завершена');