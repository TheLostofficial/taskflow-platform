const fs = require('fs');
const path = require('path');

const importGraph = {};

function extractImports(filePath, content) {
  const imports = [];
  const importRegex = /import\s+(?:(?:[\w*{},\s]+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    let importPath = match[1];
    
    // Пропускаем библиотеки и абсолютные пути
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      continue;
    }
    
    // Обрабатываем относительные пути
    if (importPath.startsWith('.')) {
      const dir = path.dirname(filePath);
      const fullImportPath = path.resolve(dir, importPath);
      
      // Добавляем расширения .js или .jsx если нужно
      let resolvedPath = fullImportPath;
      if (!fs.existsSync(resolvedPath) && !fs.existsSync(resolvedPath + '.js') && !fs.existsSync(resolvedPath + '.jsx')) {
        // Пробуем найти index.js в папке
        resolvedPath = path.join(fullImportPath, 'index.js');
      }
      
      imports.push(resolvedPath);
    }
  }
  
  return imports;
}

function buildImportGraph(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      buildImportGraph(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(process.cwd(), fullPath);
        const imports = extractImports(fullPath, content);
        
        importGraph[relativePath] = imports.map(imp => 
          path.relative(process.cwd(), imp)
        );
      } catch (error) {
        console.log(`Ошибка чтения ${fullPath}: ${error.message}`);
      }
    }
  });
}

function findCycles() {
  console.log('🔍 Поиск циклических зависимостей...');
  
  const visited = {};
  const recursionStack = {};
  const cycles = [];

  function dfs(node, path) {
    if (recursionStack[node]) {
      // Найден цикл
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart);
      cycles.push([...cycle, node]);
      return;
    }

    if (visited[node]) {
      return;
    }

    visited[node] = true;
    recursionStack[node] = true;

    const neighbors = importGraph[node] || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, node]);
    }

    recursionStack[node] = false;
  }

  for (const node in importGraph) {
    if (!visited[node]) {
      dfs(node, []);
    }
  }

  return cycles;
}

// Запускаем анализ
console.log('📊 Построение графа импортов...');
buildImportGraph('./src');
console.log(`📈 Проанализировано ${Object.keys(importGraph).length} файлов`);

const cycles = findCycles();

if (cycles.length > 0) {
  console.log('\n❌ Найдены циклические зависимости:');
  cycles.forEach((cycle, index) => {
    console.log(`\nЦикл ${index + 1}:`);
    cycle.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file}`);
    });
  });
} else {
  console.log('✅ Циклических зависимостей не найдено!');
}

// Выводим статистику
console.log('\n📊 Статистика импортов:');
const topImported = Object.entries(importGraph)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

console.log('\nТоп-10 файлов по количеству импортов:');
topImported.forEach(([file, imports], index) => {
  console.log(`${index + 1}. ${file}: ${imports.length} импортов`);
});