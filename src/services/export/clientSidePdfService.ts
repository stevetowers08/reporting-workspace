
export interface PDFGenerationOptions {
  clientName: string;
  dateRange: string;
  tabs?: string[];
  authToken?: string;
}

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

export class ClientSidePDFService {
  /**
   * Generate PDF using html2canvas + jsPDF for perfect fidelity
   * Captures exactly what's displayed on screen including charts, colors, styling
   */
  static async generateDashboardPDF(options: PDFGenerationOptions): Promise<PDFGenerationResult> {
    try {
      console.log('🚀 Starting high-fidelity PDF generation:', options.clientName);

      // Find the main dashboard container
      const dashboardContainer = document.querySelector('[data-testid="dashboard-content"]') || 
                                document.querySelector('main') || 
                                document.querySelector('.dashboard-content') ||
                                document.querySelector('#dashboard') ||
                                document.body;

      if (!dashboardContainer) {
        throw new Error('Could not find dashboard content to export');
      }

      console.log('📄 Found dashboard container:', dashboardContainer.tagName);

      // Hide unwanted elements temporarily
      this.hideElementsForExport();

      // Show all tab content
      this.showAllTabContent();

      // Wait for content to settle
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture the dashboard as high-quality image
      console.log('📸 Capturing dashboard as image...');
      const canvas = await html2canvas(dashboardContainer as HTMLElement, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: dashboardContainer.scrollWidth,
        height: dashboardContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        onclone: (clonedDoc) => {
          // Ensure all styles are applied in the cloned document
          const clonedContainer = clonedDoc.querySelector('main, .dashboard-content, #dashboard') || clonedDoc.body;
          if (clonedContainer) {
            // Force visibility of all content
            const allElements = clonedContainer.querySelectorAll('*');
            allElements.forEach(el => {
              const element = el as HTMLElement;
              if (element.style.display === 'none') {
                element.style.display = 'block';
              }
            });
          }
        }
      });

      // Restore hidden elements
      this.restoreElementsAfterExport();

      // Create PDF with the captured image
      console.log('📄 Creating PDF document...');
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Calculate dimensions for A4 page
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > pageHeight ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${options.clientName} - Event Analytics Dashboard`, 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Report Period: ${options.dateRange}`, 105, 30, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 35, { align: 'center' });

      // Add the dashboard image
      let yPosition = 45;
      let remainingHeight = imgHeight;
      let pageNumber = 1;

      while (remainingHeight > 0) {
        if (pageNumber > 1) {
          pdf.addPage();
        }

        const pageImgHeight = Math.min(remainingHeight, pageHeight - yPosition - 20);
        const sourceY = (imgHeight - remainingHeight) * canvas.height / imgHeight;
        const sourceHeight = pageImgHeight * canvas.height / imgHeight;

        // Create a temporary canvas for this page
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        if (pageCtx) {
          pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
          
          pdf.addImage(pageImgData, 'PNG', 10, yPosition, imgWidth - 20, pageImgHeight);
        }

        remainingHeight -= pageImgHeight;
        yPosition = 10; // Start from top for next page
        pageNumber++;
      }

      // Generate filename and download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${options.clientName.replace(/[^a-z0-9]/gi, '_')}_dashboard_${timestamp}.pdf`;
      
      console.log('💾 Downloading PDF...');
      pdf.save(filename);

      console.log('✅ PDF generated and downloaded successfully');

      return {
        success: true,
        pdfUrl: undefined // File is downloaded directly
      };

    } catch (error) {
      console.error('💥 PDF generation error:', error);
      
      // Restore elements in case of error
      this.restoreElementsAfterExport();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Hide elements that shouldn't be in the PDF
   */
  private static hideElementsForExport(): void {
    const elementsToHide = [
      '[role="tablist"]',
      '.tabs-list',
      '.tab-list',
      '[role="tab"]',
      '.tabs-trigger',
      '.tab-trigger',
      'button',
      '.btn',
      'nav',
      '.export-button',
      '.share-button',
      '.navigation',
      '.nav',
      '.controls',
      '.action-buttons',
      '.toolbar'
    ];

    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const el = element as HTMLElement;
        el.dataset.originalDisplay = el.style.display;
        el.style.display = 'none';
      });
    });
  }

  /**
   * Show all tab content
   */
  private static showAllTabContent(): void {
    const tabPanels = document.querySelectorAll('[role="tabpanel"]');
    tabPanels.forEach(panel => {
      const el = panel as HTMLElement;
      el.dataset.originalDisplay = el.style.display;
      el.style.display = 'block';
      panel.removeAttribute('aria-hidden');
    });

    const tabContents = document.querySelectorAll('.tabs-content > div, .tab-content > div');
    tabContents.forEach(content => {
      const el = content as HTMLElement;
      el.dataset.originalDisplay = el.style.display;
      el.style.display = 'block';
      content.removeAttribute('data-state');
    });
  }

  /**
   * Restore elements after export
   */
  private static restoreElementsAfterExport(): void {
    const allElements = document.querySelectorAll('[data-original-display]');
    allElements.forEach(element => {
      const el = element as HTMLElement;
      el.style.display = el.dataset.originalDisplay || '';
      delete el.dataset.originalDisplay;
    });
  }

  /**
   * Generate PDF and trigger download
   */
  static async generateAndDownloadPDF(options: PDFGenerationOptions): Promise<void> {
    const result = await this.generateDashboardPDF(options);
    
    if (!result.success) {
      throw new Error(result.error || 'Client-side PDF generation failed');
    }
  }
}