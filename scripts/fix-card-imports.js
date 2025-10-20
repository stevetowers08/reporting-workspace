#!/usr/bin/env node

// Script to fix missing Card imports in dashboard components
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
    
    // Check if file uses Card but doesn't import it
    if (content.includes('<Card') && !content.includes("import { Card }")) {
      console.log(`Fixing Card import in ${file}`);
      
      // Find the first import line and add Card import after it
      const lines = content.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          break;
        }
      }
      
      // Insert Card import
      lines.splice(insertIndex, 0, "import { Card } from '@/components/ui/card';");
      
      fs.writeFileSync(filePath, lines.join('\n'));
    }
  }
});

console.log('Card import fixes completed!');
