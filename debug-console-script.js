// Debug script to run in browser console
// Copy and paste this into the browser console when on the dashboard page

console.log('🔍 PDF Export Debug Script Starting...');

// Function to analyze tab elements
function analyzeTabElements() {
  console.log('=== TAB ELEMENT ANALYSIS ===');
  
  // Find tab elements
  const tabSelectors = [
    '[data-tab="summary"]',
    '[data-tab="meta"]', 
    '[data-tab="google"]',
    '[data-tab="leads"]',
    '.tabs-content',
    '[role="tabpanel"]'
  ];
  
  tabSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`Found ${elements.length} elements with selector: ${selector}`);
    
    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      console.log(`Element ${index}:`, {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        dimensions: { width: rect.width, height: rect.height },
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        hasContent: element.innerHTML.trim().length > 0,
        childrenCount: element.children.length,
        innerHTML: element.innerHTML.substring(0, 200) + '...',
        // Dashboard specific elements
        cards: element.querySelectorAll('.card').length,
        charts: element.querySelectorAll('canvas, svg').length,
        metrics: element.querySelectorAll('.metric').length,
        grids: element.querySelectorAll('.grid').length,
        // Loading states
        loadingElements: element.querySelectorAll('.loading, .spinner').length,
        suspenseElements: element.querySelectorAll('[data-suspense]').length
      });
    });
  });
}

// Function to test html2canvas on a specific element
async function testHtml2Canvas(element) {
  console.log('=== HTML2CANVAS TEST ===');
  
  if (!window.html2canvas) {
    console.error('html2canvas not loaded!');
    return;
  }
  
  try {
    console.log('Capturing element:', element);
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: true,
      imageTimeout: 30000
    });
    
    console.log('Canvas created:', {
      width: canvas.width,
      height: canvas.height,
      dataURLLength: canvas.toDataURL('image/png').length
    });
    
    // Check canvas content
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let nonWhitePixels = 0;
    let sampleCount = 0;
    
    // Sample every 100th pixel
    for (let i = 0; i < data.length; i += 400) {
      sampleCount++;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (r < 250 || g < 250 || b < 250) {
        nonWhitePixels++;
      }
    }
    
    const contentPercentage = Math.round((nonWhitePixels / sampleCount) * 100);
    
    console.log('Canvas content analysis:', {
      totalPixels: data.length / 4,
      sampledPixels: sampleCount,
      nonWhitePixels: nonWhitePixels,
      contentPercentage: contentPercentage + '%',
      hasContent: nonWhitePixels > 10
    });
    
    if (nonWhitePixels < 10) {
      console.warn('🚨 CANVAS IS BLANK!');
    } else {
      console.log('✅ Canvas has content');
    }
    
    return canvas;
    
  } catch (error) {
    console.error('html2canvas error:', error);
  }
}

// Function to find and test all possible dashboard elements
async function testAllDashboardElements() {
  console.log('=== TESTING ALL DASHBOARD ELEMENTS ===');
  
  // Try different selectors
  const selectors = [
    '.tabs-content',
    '[role="tabpanel"]',
    '[data-tab]',
    '.dashboard-content',
    '.tab-content',
    'main',
    '.container'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`Testing selector: ${selector} (found ${elements.length} elements)`);
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const rect = element.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        console.log(`Testing element ${i} from ${selector}:`);
        await testHtml2Canvas(element);
      }
    }
  }
}

// Run the analysis
analyzeTabElements();
testAllDashboardElements();

console.log('🔍 Debug script completed. Check the logs above for details.');
