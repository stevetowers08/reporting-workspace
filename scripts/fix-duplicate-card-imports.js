#!/usr/bin/env node

// Script to fix duplicate Card imports in dashboard components
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardDir = path.join(__dirname, '..', 'src', 'components', 'dashboard');
const files = fs.readdirSync(dashboardDir);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dashboardDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has duplicate Card imports
    const lines = content.split('\n');
    const cardImports = [];
    const otherImports = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("import") && lines[i].includes("Card")) {
        cardImports.push({ line: lines[i], index: i });
      } else if (lines[i].startsWith('import ')) {
        otherImports.push({ line: lines[i], index: i });
      }
    }
    
    if (cardImports.length > 1) {
      console.log(`Fixing duplicate Card imports in ${file}`);
      
      // Find the best Card import to keep (prefer the one with more exports)
      let bestImport = cardImports[0];
      for (const cardImport of cardImports) {
        if (cardImport.line.includes('CardContent') || cardImport.line.includes('CardHeader') || cardImport.line.includes('CardTitle')) {
          bestImport = cardImport;
          break;
        }
      }
      
      // Remove all Card imports
      const filteredLines = lines.filter((line, index) => {
        return !cardImports.some(ci => ci.index === index);
      });
      
      // Add the best Card import back in the right position
      const insertIndex = otherImports.length > 0 ? otherImports[otherImports.length - 1].index + 1 : 0;
      filteredLines.splice(insertIndex, 0, bestImport.line);
      
      fs.writeFileSync(filePath, filteredLines.join('\n'));
    }
  }
});

console.log('Duplicate Card import fixes completed!');
