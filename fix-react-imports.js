#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Find all TypeScript/TSX files in src directory
const files = glob.sync('src/**/*.{ts,tsx}', { cwd: process.cwd() });

console.log(`Found ${files.length} files to process...`);

let totalFixed = 0;

files.forEach(filePath => {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Fix import statements
    if (content.includes('import * as React from "react"')) {
      // Check if the file uses React.forwardRef or React.createContext
      if (content.includes('React.forwardRef') || content.includes('React.createContext') || content.includes('React.useContext')) {
        // Replace with named imports
        const imports = [];
        if (content.includes('React.forwardRef')) imports.push('forwardRef');
        if (content.includes('React.createContext')) imports.push('createContext');
        if (content.includes('React.useContext')) imports.push('useContext');
        
        // Add React import if it's used elsewhere
        if (content.includes('React.FC') || content.includes('React.ReactNode') || content.includes('React.HTMLAttributes') || content.includes('React.ButtonHTMLAttributes') || content.includes('React.memo')) {
          imports.push('React');
        }
        
        const importStatement = `import React${imports.length > 0 ? `, { ${imports.join(', ')} }` : ''} from "react";`;
        content = content.replace(/import \* as React from "react";/, importStatement);
        modified = true;
      }
    }

    // Fix React.forwardRef calls
    if (content.includes('React.forwardRef')) {
      content = content.replace(/React\.forwardRef/g, 'forwardRef');
      modified = true;
    }

    // Fix React.createContext calls
    if (content.includes('React.createContext')) {
      content = content.replace(/React\.createContext/g, 'createContext');
      modified = true;
    }

    // Fix React.useContext calls
    if (content.includes('React.useContext')) {
      content = content.replace(/React\.useContext/g, 'useContext');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      totalFixed++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files!`);
