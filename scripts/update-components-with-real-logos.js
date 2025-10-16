#!/usr/bin/env node

/**
 * Update Icon Components with Real Logos
 * Reads the real SVG files and updates the React components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logosDir = path.join(__dirname, '..', 'logos');
const componentsDir = path.join(__dirname, '..', 'src', 'components', 'ui');

// Read real logo files
const realLogos = {
  meta: fs.readFileSync(path.join(logosDir, 'meta-real.svg'), 'utf8'),
  googleAds: fs.readFileSync(path.join(logosDir, 'googleAds-real.svg'), 'utf8'),
  googleSheets: fs.readFileSync(path.join(logosDir, 'googleSheets-real.svg'), 'utf8'),
  goHighLevel: fs.readFileSync(path.join(logosDir, 'goHighLevel-official.svg'), 'utf8'),
  googleAI: fs.readFileSync(path.join(logosDir, 'googleAI-official.svg'), 'utf8')
};

// Extract SVG content (remove XML declaration and outer svg tags)
function extractSVGContent(svgContent) {
  // Remove XML declaration
  const content = svgContent.replace(/<\?xml[^>]*\?>/g, '');
  
  // Extract content between <svg> tags
  const svgMatch = content.match(/<svg[^>]*>(.*)<\/svg>/s);
  if (svgMatch) {
    return svgMatch[1];
  }
  
  return content;
}

// Update MetaIcon component
const metaContent = `import React from 'react';

interface MetaIconProps {
  className?: string;
  size?: number;
}

export const MetaIcon: React.FC<MetaIconProps> = ({ 
  className = '', 
  size = 16
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      className={className}
    >
      {/* Official Meta Logo */}
      ${extractSVGContent(realLogos.meta)}
    </svg>
  );
};`;

// Update GoogleAdsIcon component
const googleAdsContent = `import React from 'react';

interface GoogleAdsIconProps {
  className?: string;
  size?: number;
}

export const GoogleAdsIcon: React.FC<GoogleAdsIconProps> = ({ 
  className = '', 
  size = 16
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      className={className}
    >
      {/* Official Google Ads Logo */}
      ${extractSVGContent(realLogos.googleAds)}
    </svg>
  );
};`;

// Update GoogleSheetsIcon component
const googleSheetsContent = `import React from 'react';

interface GoogleSheetsIconProps {
  className?: string;
  size?: number;
}

export const GoogleSheetsIcon: React.FC<GoogleSheetsIconProps> = ({ 
  className = '', 
  size = 16
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      className={className}
    >
      {/* Official Google Sheets Logo */}
      ${extractSVGContent(realLogos.googleSheets)}
    </svg>
  );
};`;

// Update GoHighLevelIcon component
const goHighLevelContent = `import React from 'react';

interface GoHighLevelIconProps {
  className?: string;
  size?: number;
}

export const GoHighLevelIcon: React.FC<GoHighLevelIconProps> = ({ 
  className = '', 
  size = 16
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      className={className}
    >
      {/* Official GoHighLevel Logo */}
      ${extractSVGContent(realLogos.goHighLevel)}
    </svg>
  );
};`;

// Update GoogleAIStudioIcon component
const googleAIContent = `import React from 'react';

interface GoogleAIStudioIconProps {
  size?: number;
  className?: string;
}

export const GoogleAIStudioIcon: React.FC<GoogleAIStudioIconProps> = ({ 
  size = 24, 
  className = '' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Official Google AI Studio Logo */}
      ${extractSVGContent(realLogos.googleAI)}
    </svg>
  );
};`;

// Write updated components
fs.writeFileSync(path.join(componentsDir, 'MetaIcon.tsx'), metaContent, 'utf8');
fs.writeFileSync(path.join(componentsDir, 'GoogleAdsIcon.tsx'), googleAdsContent, 'utf8');
fs.writeFileSync(path.join(componentsDir, 'GoogleSheetsIcon.tsx'), googleSheetsContent, 'utf8');
fs.writeFileSync(path.join(componentsDir, 'GoHighLevelIcon.tsx'), goHighLevelContent, 'utf8');
fs.writeFileSync(path.join(componentsDir, 'GoogleAIStudioIcon.tsx'), googleAIContent, 'utf8');

console.log('✅ Updated all icon components with real logos!');
console.log('📁 Components updated:');
console.log('   - MetaIcon.tsx');
console.log('   - GoogleAdsIcon.tsx');
console.log('   - GoogleSheetsIcon.tsx');
console.log('   - GoHighLevelIcon.tsx');
console.log('   - GoogleAIStudioIcon.tsx');
