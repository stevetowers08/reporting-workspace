#!/usr/bin/env node

// Enhanced script to remove ALL console.log statements from production code
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const filteredLines = [];
  let removedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip console.log lines and their eslint-disable comments
    if (line.includes('console.log') || 
        line.includes('console.error') ||
        line.includes('console.warn') ||
        line.includes('console.debug') ||
        line.includes('console.info') ||
        (line.includes('eslint-disable-next-line no-console') && i + 1 < lines.length && 
         (lines[i + 1].includes('console.log') || lines[i + 1].includes('console.error') || 
          lines[i + 1].includes('console.warn') || lines[i + 1].includes('console.debug') || 
          lines[i + 1].includes('console.info')))) {
      removedCount++;
      // Skip the eslint-disable line and the console line
      if (line.includes('eslint-disable-next-line no-console')) {
        i++; // Skip the next line (console statement)
      }
      continue;
    }
    
    filteredLines.push(line);
  }
  
  if (removedCount > 0) {
    fs.writeFileSync(filePath, filteredLines.join('\n'));
    console.log(`Removed ${removedCount} console statements from ${path.relative(srcDir, filePath)}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(filePath);
    }
  }
}

console.log('Removing ALL console statements from production code...');
processDirectory(srcDir);
console.log('Console statement removal completed!');
