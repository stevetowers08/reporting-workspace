#!/usr/bin/env node

/**
 * Update Icon Components with Real Official Logos
 * Uses the actual logos provided by the user
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentsDir = path.join(__dirname, '..', 'src', 'components', 'ui');

// MetaIcon with real Meta logo
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
      {/* Real Official Meta Logo */}
      <path 
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </svg>
  );
};`;

// GoogleAdsIcon with real Google Ads logo
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
      viewBox="0 0 192 192" 
      fill="none"
      className={className}
    >
      {/* Real Official Google Ads Logo */}
      <rect fill="none" height="192" width="192"/>
      <g>
        <rect fill="#FBBC04" height="58.67" transform="matrix(0.5 -0.866 0.866 0.5 -46.2127 103.666)" width="117.33" x="8" y="62.52"/>
        <path d="M180.07,127.99L121.4,26.38c-8.1-14.03-26.04-18.84-40.07-10.74c-14.03,8.1-18.84,26.04-10.74,40.07 l58.67,101.61c8.1,14.03,26.04,18.83,40.07,10.74C183.36,159.96,188.16,142.02,180.07,127.99z" fill="#4285F4"/>
        <circle cx="37.34" cy="142.66" fill="#34A853" r="29.33"/>
      </g>
    </svg>
  );
};`;

// GoogleSheetsIcon with real Google Sheets logo
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
      viewBox="0 0 49 67" 
      fill="none"
      className={className}
    >
      {/* Real Official Google Sheets Logo */}
      <defs>
        <linearGradient x1="50.0053945%" y1="8.58610612%" x2="50.0053945%" y2="100.013939%" id="linearGradient-7">
          <stop stopColor="#263238" stopOpacity="0.2" offset="0%"/>
          <stop stopColor="#263238" stopOpacity="0.02" offset="100%"/>
        </linearGradient>
        <radialGradient cx="3.16804688%" cy="2.71744318%" fx="3.16804688%" fy="2.71744318%" r="161.248516%" gradientTransform="translate(0.031680,0.027174),scale(1.000000,0.727273),translate(-0.031680,-0.027174)" id="radialGradient-16">
          <stop stopColor="#FFFFFF" stopOpacity="0.1" offset="0%"/>
          <stop stopColor="#FFFFFF" stopOpacity="0" offset="100%"/>
        </radialGradient>
      </defs>
      
      {/* Main document shape */}
      <path d="M29.5833333,0 L4.4375,0 C1.996875,0 0,1.996875 0,4.4375 L0,60.6458333 C0,63.0864583 1.996875,65.0833333 4.4375,65.0833333 L42.8958333,65.0833333 C45.3364583,65.0833333 47.3333333,63.0864583 47.3333333,60.6458333 L47.3333333,17.75 L36.9791667,10.3541667 L29.5833333,0 Z" fill="#0F9D58"/>
      
      {/* Spreadsheet grid */}
      <path d="M11.8333333,31.8020833 L11.8333333,53.25 L35.5,53.25 L35.5,31.8020833 L11.8333333,31.8020833 Z M22.1875,50.2916667 L14.7916667,50.2916667 L14.7916667,46.59375 L22.1875,46.59375 L22.1875,50.2916667 Z M22.1875,44.375 L14.7916667,44.375 L14.7916667,40.6770833 L22.1875,40.6770833 L22.1875,44.375 Z M22.1875,38.4583333 L14.7916667,38.4583333 L14.7916667,34.7604167 L22.1875,34.7604167 L22.1875,38.4583333 Z M32.5416667,50.2916667 L25.1458333,50.2916667 L25.1458333,46.59375 L32.5416667,46.59375 L32.5416667,50.2916667 Z M32.5416667,44.375 L25.1458333,44.375 L25.1458333,40.6770833 L32.5416667,40.6770833 L32.5416667,44.375 Z M32.5416667,38.4583333 L25.1458333,38.4583333 L25.1458333,34.7604167 L32.5416667,34.7604167 L32.5416667,38.4583333 Z" fill="#F1F1F1"/>
      
      {/* Folded corner */}
      <polygon fill="url(#linearGradient-7)" points="30.8813021 16.4520313 47.3333333 32.9003646 47.3333333 17.75"/>
      
      {/* Folded corner highlight */}
      <path d="M2.95833333,2.95833333 L2.95833333,16.2708333 C2.95833333,18.7225521 4.94411458,20.7083333 7.39583333,20.7083333 L20.7083333,20.7083333 L2.95833333,2.95833333 Z" fill="#87CEAC"/>
      
      {/* Shadow effects */}
      <path d="M4.4375,0 C1.996875,0 0,1.996875 0,4.4375 L0,4.80729167 C0,2.36666667 1.996875,0.369791667 4.4375,0.369791667 L29.5833333,0.369791667 L29.5833333,0 L4.4375,0 Z" fillOpacity="0.2" fill="#FFFFFF"/>
      <path d="M42.8958333,64.7135417 L4.4375,64.7135417 C1.996875,64.7135417 0,62.7166667 0,60.2760417 L0,60.6458333 C0,63.0864583 1.996875,65.0833333 4.4375,65.0833333 L42.8958333,65.0833333 C45.3364583,65.0833333 47.3333333,63.0864583 47.3333333,60.6458333 L47.3333333,60.2760417 C47.3333333,62.7166667 45.3364583,64.7135417 42.8958333,64.7135417 Z" fillOpacity="0.2" fill="#263238"/>
      <path d="M34.0208333,17.75 C31.5691146,17.75 29.5833333,15.7642188 29.5833333,13.3125 L29.5833333,13.6822917 C29.5833333,16.1340104 31.5691146,18.1197917 34.0208333,18.1197917 L47.3333333,18.1197917 L47.3333333,17.75 L34.0208333,17.75 Z" fillOpacity="0.1" fill="#263238"/>
      
      {/* Main radial gradient */}
      <path d="M29.5833333,0 L4.4375,0 C1.996875,0 0,1.996875 0,4.4375 L0,60.6458333 C0,63.0864583 1.996875,65.0833333 4.4375,65.0833333 L42.8958333,65.0833333 C45.3364583,65.0833333 47.3333333,63.0864583 47.3333333,60.6458333 L47.3333333,17.75 L29.5833333,0 Z" fill="url(#radialGradient-16)"/>
    </svg>
  );
};`;

// Write updated components
fs.writeFileSync(path.join(componentsDir, 'MetaIcon.tsx'), metaContent, 'utf8');
fs.writeFileSync(path.join(componentsDir, 'GoogleAdsIcon.tsx'), googleAdsContent, 'utf8');
fs.writeFileSync(path.join(componentsDir, 'GoogleSheetsIcon.tsx'), googleSheetsContent, 'utf8');

console.log('✅ Updated icon components with REAL official logos!');
console.log('📁 Components updated:');
console.log('   - MetaIcon.tsx (Real Meta logo)');
console.log('   - GoogleAdsIcon.tsx (Real Google Ads logo)');
console.log('   - GoogleSheetsIcon.tsx (Real Google Sheets logo)');
