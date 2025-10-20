#!/usr/bin/env node

// Script to fix unused variables and parameters
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src');

function fixUnusedVariables(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // Fix unused error parameters in catch blocks
  newContent = newContent.replace(
    /catch\s*\(\s*error\s*\)\s*\{\s*\}/g,
    'catch (_error) {}'
  );

  // Fix unused error parameters in catch blocks with content
  newContent = newContent.replace(
    /catch\s*\(\s*error\s*\)\s*\{([^}]*)\}/g,
    (match, body) => {
      if (body.trim() === '') {
        return 'catch (_error) {}';
      }
      return match;
    }
  );

  // Fix unused variables in function parameters
  newContent = newContent.replace(
    /function\s+\w+\s*\(\s*([^)]*)\s*\)/g,
    (match, params) => {
      const paramList = params.split(',').map(param => {
        const trimmed = param.trim();
        if (trimmed && !trimmed.includes(':')) {
          // Check if this parameter is used in the function body
          const paramName = trimmed.split('=')[0].trim();
          if (paramName && !newContent.includes(paramName)) {
            return `_${paramName}`;
          }
        }
        return trimmed;
      });
      return match.replace(params, paramList.join(', '));
    }
  );

  // Fix unused arrow function parameters
  newContent = newContent.replace(
    /\(\s*([^)]*)\s*\)\s*=>/g,
    (match, params) => {
      const paramList = params.split(',').map(param => {
        const trimmed = param.trim();
        if (trimmed && !trimmed.includes(':')) {
          const paramName = trimmed.split('=')[0].trim();
          if (paramName && !newContent.includes(paramName)) {
            return `_${paramName}`;
          }
        }
        return trimmed;
      });
      return match.replace(params, paramList.join(', '));
    }
  );

  // Fix unused variables in destructuring
  newContent = newContent.replace(
    /const\s+\{\s*([^}]*)\s*\}\s*=/g,
    (match, destructured) => {
      const vars = destructured.split(',').map(v => {
        const trimmed = v.trim();
        if (trimmed && !newContent.includes(trimmed)) {
          return `_${trimmed}`;
        }
        return trimmed;
      });
      return match.replace(destructured, vars.join(', '));
    }
  );

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed unused variables in ${path.relative(srcDir, filePath)}`);
    modified = true;
  }

  return modified;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalFixed += processDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (fixUnusedVariables(filePath)) {
        totalFixed++;
      }
    }
  }

  return totalFixed;
}

console.log('Fixing unused variables and parameters...');
const totalFixed = processDirectory(srcDir);
console.log(`Fixed unused variables in ${totalFixed} files!`);
