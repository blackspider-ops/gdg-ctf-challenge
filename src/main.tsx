import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 MAIN.TSX LOADED');
console.log('🔍 Root element:', document.getElementById("root"));

try {
  const root = document.getElementById("root");
  if (!root) {
    console.error('❌ ROOT ELEMENT NOT FOUND!');
  } else {
    console.log('✅ Root element found, creating React root...');
    createRoot(root).render(<App />);
    console.log('✅ React app rendered!');
  }
} catch (error) {
  console.error('❌ ERROR RENDERING APP:', error);
}

