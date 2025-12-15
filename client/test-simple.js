import React from 'react';
import ReactDOM from 'react-dom/client';

// Тест 1: Просто React
console.log('✅ Test 1: React доступен');

// Тест 2: Компонент без импортов
const TestComponent = () => {
  const [state] = React.useState('test');
  return <div>{state}</div>;
};
console.log('✅ Test 2: Компонент создан');

// Тест 3: Попробуем импортировать проблемные модули
console.log('🔍 Test 3: Импорт websocket...');
try {
  const ws = require('./src/services/websocket');
  console.log('✅ websocket загружен');
} catch (e) {
  console.log('❌ websocket ошибка:', e.message);
}

console.log('🔍 Test 4: Импорт commentService...');
try {
  const cs = require('./src/services/commentService');
  console.log('✅ commentService загружен');
} catch (e) {
  console.log('❌ commentService ошибка:', e.message);
}

console.log('🔍 Test 5: Импорт store...');
try {
  const store = require('./src/store/store');
  console.log('✅ store загружен');
} catch (e) {
  console.log('❌ store ошибка:', e.message);
}