/**
 * Скрипт для проверки импортов в проекте
 * Запускать: node check-imports.js
 */

const fs = require('fs');
const path = require('path');

// Получаем правильный путь к src директории
const projectRoot = process.cwd(); // Текущая директория где запускается скрипт
const srcPath = path.join(projectRoot, 'src');

console.log('📍 Текущая директория:', projectRoot);
console.log('📍 Путь к src:', srcPath);

// Проверяем существование директории
if (!fs.existsSync(srcPath)) {
  console.error('❌ Директория src не найдена! Проверьте путь:', srcPath);
  console.log('Содержимое текущей директории:');
  try {
    const files = fs.readdirSync(projectRoot);
    console.log(files);
  } catch (err) {
    console.error('Ошибка при чтении директории:', err.message);
  }
  process.exit(1);
}

function checkFileImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n📄 Файл: ${path.relative(projectRoot, filePath)}`);
    
    lines.forEach((line, index) => {
      if (line.includes('import') || line.includes('require')) {
        const trimmedLine = line.trim();
        console.log(`   Строка ${index + 1}: ${trimmedLine}`);
        
        // Проверяем импорты из node_modules
        if (trimmedLine.includes('from') || trimmedLine.includes('require')) {
          const match = trimmedLine.match(/['"]([^'"]+)['"]/);
          if (match) {
            const importPath = match[1];
            
            // Проверяем локальные импорты
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
              const importDir = path.dirname(filePath);
              const fullImportPath = path.resolve(importDir, importPath);
              
              // Проверяем существование файла
              let exists = false;
              const extensions = ['.js', '.jsx', '.json', ''];
              
              for (const ext of extensions) {
                const testPath = fullImportPath + ext;
                if (fs.existsSync(testPath)) {
                  exists = true;
                  break;
                }
              }
              
              if (!exists) {
                console.error(`   ❌ Импорт не найден: ${importPath}`);
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error(`❌ Ошибка при чтении файла ${filePath}:`, error.message);
  }
}

function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Пропускаем node_modules и другие системные директории
        if (!item.includes('node_modules') && 
            !item.includes('.git') && 
            !item.includes('dist') && 
            !item.includes('build')) {
          scanDirectory(fullPath);
        }
      } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
        checkFileImports(fullPath);
      }
    });
  } catch (error) {
    console.error(`❌ Ошибка при сканировании ${dirPath}:`, error.message);
  }
}

console.log('🔍 Проверка импортов в проекте...\n');
scanDirectory(srcPath);
console.log('\n✅ Проверка завершена');