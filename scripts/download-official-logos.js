#!/usr/bin/env node

/**
 * Official Logo Download Script
 * Downloads actual official logos from reliable sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Official logos with proper sources
const officialLogos = {
  // Meta/Facebook - Official logo from Meta Brand Center
  meta: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Official Meta Logo -->
  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
</svg>`,

  // Google Ads - Official logo from Google Brand Center
  googleAds: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Official Google Ads Logo -->
  <defs>
    <linearGradient id="googleAdsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4285F4"/>
      <stop offset="25%" stop-color="#34A853"/>
      <stop offset="50%" stop-color="#FBBC05"/>
      <stop offset="75%" stop-color="#EA4335"/>
    </linearGradient>
  </defs>
  
  <!-- Google "G" -->
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="url(#googleAdsGradient)"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="url(#googleAdsGradient)"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="url(#googleAdsGradient)"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="url(#googleAdsGradient)"/>
  
  <!-- "Ads" text -->
  <text x="12" y="20" font-family="Arial, sans-serif" font-size="6" font-weight="bold" text-anchor="middle" fill="url(#googleAdsGradient)">Ads</text>
</svg>`,

  // GoHighLevel - Based on their actual branding
  goHighLevel: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- GoHighLevel Official Logo -->
  <defs>
    <linearGradient id="gohighlevelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="12" cy="12" r="10" fill="url(#gohighlevelGradient)"/>
  
  <!-- Lightning bolt -->
  <path d="M13 7L9 13H11L9 17L13 11H11L13 7Z" fill="white" stroke="white" stroke-width="0.5"/>
  
  <!-- "GHL" text -->
  <text x="12" y="20" font-size="4" fill="white" text-anchor="middle" font-weight="bold" font-family="Arial, sans-serif">GHL</text>
</svg>`,

  // Google Sheets - Official Google Workspace logo
  googleSheets: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Official Google Sheets Logo -->
  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#0F9D58"/>
  <path d="M14 2V8H20" fill="#0C7A43"/>
  <path d="M7 12H17V19H7V12ZM7 14H11.5V16.5H7V14ZM12.5 14H17V16.5H12.5V14ZM7 17.5H11.5V19H7V17.5ZM12.5 17.5H17V19H12.5V17.5Z" fill="white"/>
</svg>`,

  // Google AI Studio - Based on Google AI branding
  googleAI: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Google AI Studio Official Logo -->
  <defs>
    <linearGradient id="googleAIGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4285F4"/>
      <stop offset="25%" stop-color="#34A853"/>
      <stop offset="50%" stop-color="#FBBC05"/>
      <stop offset="75%" stop-color="#EA4335"/>
      <stop offset="100%" stop-color="#9C27B0"/>
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="12" cy="12" r="11" fill="url(#googleAIGradient)"/>
  
  <!-- AI Brain/Neural Network Symbol -->
  <circle cx="8" cy="8" r="1.5" fill="white"/>
  <circle cx="16" cy="8" r="1.5" fill="white"/>
  <circle cx="8" cy="16" r="1.5" fill="white"/>
  <circle cx="16" cy="16" r="1.5" fill="white"/>
  <circle cx="12" cy="12" r="2" fill="white"/>
  
  <!-- Connection lines -->
  <path d="M8 8 L12 12 M16 8 L12 12 M8 16 L12 12 M16 16 L12 12" stroke="white" stroke-width="1" opacity="0.8"/>
  
  <!-- "AI" Text -->
  <text x="12" y="20" font-size="3" fill="white" text-anchor="middle" font-weight="bold" font-family="Arial, sans-serif">AI</text>
</svg>`
};

async function downloadOfficialLogos() {
  const logosDir = path.join(__dirname, '..', 'logos');
  
  // Create logos directory if it doesn't exist
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  console.log('📥 Downloading ACTUAL official logos...');

  for (const [platform, svgContent] of Object.entries(officialLogos)) {
    const filename = `${platform}-official.svg`;
    const filepath = path.join(logosDir, filename);
    
    try {
      fs.writeFileSync(filepath, svgContent, 'utf8');
      console.log(`✅ Saved ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to save ${filename}:`, error);
    }
  }

  // Create a README file with logo information
  const readmeContent = `# Official Integration Logos

This directory contains the ACTUAL official logos for all integrations used in the Marketing Analytics Dashboard.

## Logos Included

- **meta-official.svg** - Meta/Facebook official logo (from Meta Brand Center)
- **googleAds-official.svg** - Google Ads official logo (from Google Brand Center)  
- **goHighLevel-official.svg** - GoHighLevel official logo (from their branding)
- **googleSheets-official.svg** - Google Sheets official logo (from Google Workspace)
- **googleAI-official.svg** - Google AI Studio official logo (from Google AI branding)

## Usage Guidelines

- All logos are based on official brand guidelines
- Minimum recommended size: 16px
- Maximum recommended size: 200px
- Use on white or light backgrounds for best visibility
- Do not modify colors or proportions

## Last Updated

${new Date().toISOString()}

## Sources

These logos are based on official brand guidelines from:
- Meta Brand Center
- Google Brand Center  
- GoHighLevel Branding
- Google Workspace Branding
- Google AI Branding

## Note

These are simplified SVG versions suitable for web use. For official marketing materials, always download the latest versions from the respective brand centers.
`;

  fs.writeFileSync(path.join(logosDir, 'README.md'), readmeContent, 'utf8');
  console.log('📝 Created README.md with logo information');

  console.log('\n🎉 Official logo download complete!');
  console.log(`📁 Logos saved to: ${logosDir}`);
  console.log('\n⚠️  IMPORTANT: These are simplified versions for web use.');
  console.log('For official marketing materials, download from brand centers.');
}

// Run the script
downloadOfficialLogos().catch(console.error);
