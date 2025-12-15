import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

console.log('🚀 Starting TaskFlow application...');
console.log('React version:', React.version);
console.log('Environment:', process.env.NODE_ENV);

// Проверяем наличие корневого элемента
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<h1>Error: Root element not found!</h1>';
} else {
  console.log('✅ Root element found');
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ Application rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering application:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Error rendering application</h1>
        <pre>${error.toString()}</pre>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}