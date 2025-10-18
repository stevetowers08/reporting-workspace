import { debugLogger } from '@/lib/debug';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

export class PlaywrightPDFService {
  private static readonly PLAYWRIGHT_API_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1/generate-pdf';

  /**
   * Generate PDF using client-side screenshots
   * Perfect fidelity - exactly as displayed on screen at 1920x1080 resolution
   */
  static async generateDashboardPDF(options: PDFGenerationOptions): Promise<PDFGenerationResult> {
    try {
      console.log('🚀 Starting client-side screenshot PDF generation:', options.clientName);

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

      // Create PDF with high-resolution screenshots
      console.log('📸 Capturing dashboard screenshots...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add cover page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${options.clientName} - Event Analytics Dashboard`, 105, 50, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Report Period: ${options.dateRange}`, 105, 70, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 85, { align: 'center' });

      // Define tab configurations
      const tabConfigs = [
        { id: 'summary', name: 'Summary' },
        { id: 'meta', name: 'Meta Ads' },
        { id: 'google', name: 'Google Ads' },
        { id: 'leads', name: 'Lead Analytics' }
      ];

      // Capture each tab separately
      for (const tabConfig of tabConfigs) {
        console.log(`📸 Capturing ${tabConfig.name} tab...`);
        
        try {
          // Click on the tab to activate it
          let tabButton: HTMLElement | null = null;
          
          // Find tab button by text content (most reliable method)
          const allButtons = document.querySelectorAll('button, [role="tab"]');
          for (const button of allButtons) {
            if (button.textContent?.includes(tabConfig.name)) {
              tabButton = button as HTMLElement;
              break;
            }
          }
          
          // Also try data attributes
          if (!tabButton) {
            tabButton = document.querySelector(`[data-value="${tabConfig.id}"]`) as HTMLElement ||
                       document.querySelector(`button[data-value="${tabConfig.id}"]`) as HTMLElement;
          }
          
          if (tabButton) {
            tabButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for content to load
          } else {
            console.log(`⚠️ Could not find tab button for ${tabConfig.name}`);
          }

          // Take screenshot of the tab content at 1920x1080 resolution
          const canvas = await html2canvas(dashboardContainer as HTMLElement, {
            scale: 2, // High resolution (2x = 1920x1080 equivalent)
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 1920,
            height: 1080,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1920,
            windowHeight: 1080,
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

          // Add new page for this tab
          pdf.addPage();
          
          // Add tab title
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text(tabConfig.name, 20, 30);

          // Add the screenshot
          const imgData = canvas.toDataURL('image/png', 1.0);
          
          // Calculate dimensions for A4 page
          const imgWidth = 170; // A4 width minus margins
          const pageHeight = 250; // Available height
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Scale image to fit page
          const scaleFactor = Math.min(imgWidth / canvas.width, pageHeight / imgHeight);
          const finalWidth = canvas.width * scaleFactor;
          const finalHeight = canvas.height * scaleFactor;
          
          pdf.addImage(imgData, 'PNG', 20, 40, finalWidth, finalHeight);

        } catch (error) {
          console.log(`⚠️ Could not capture ${tabConfig.name} tab:`, error.message);
          // Continue with other tabs
        }
      }

      // Restore hidden elements
      this.restoreElementsAfterExport();

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
   * Hide elements that shouldn't appear in PDF export
   */
  private static hideElementsForExport(): void {
    // Hide headers, navigation, and interactive elements
    const elementsToHide = [
      'header',
      'nav',
      '.agency-header',
      '.client-facing-header',
      '.internal-agency-header',
      '[data-testid="agency-header"]',
      '[data-testid="client-facing-header"]',
      '[data-testid="internal-agency-header"]',
      '.export-button',
      '.pdf-export-button',
      '[data-testid="export-button"]',
      '.navigation',
      '.sidebar',
      '.menu',
      '.toolbar',
      '.action-buttons',
      '.floating-elements'
    ];

    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const el = element as HTMLElement;
        el.style.display = 'none';
        el.setAttribute('data-pdf-hidden', 'true');
      });
    });
  }

  /**
   * Restore elements that were hidden for PDF export
   */
  private static restoreElementsAfterExport(): void {
    const hiddenElements = document.querySelectorAll('[data-pdf-hidden="true"]');
    hiddenElements.forEach(element => {
      const el = element as HTMLElement;
      el.style.display = '';
      el.removeAttribute('data-pdf-hidden');
    });
  }

  /**
   * Generate PDF and trigger download
   */
  static async generateAndDownloadPDF(options: PDFGenerationOptions): Promise<void> {
    const result = await this.generateDashboardPDF(options);
    
    if (!result.success) {
      throw new Error(result.error || 'Playwright PDF generation failed');
    }

    if (result.pdfUrl) {
      // Trigger download
      const link = document.createElement('a');
      link.href = result.pdfUrl;
      link.download = `${options.clientName.replace(/[^a-z0-9]/gi, '_')}_dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Get current dashboard URL with all parameters
   */
  private static getCurrentDashboardUrl(): string {
    const baseUrl = window.location.origin;
    const pathname = window.location.pathname;
    const search = window.location.search;
    
    return `${baseUrl}${pathname}${search}`;
  }

  /**
   * Check if Playwright service is available
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.PLAYWRIGHT_API_URL, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      return response.ok;
    } catch (error) {
      debugLogger.warn('PlaywrightPDFService', 'Service availability check failed', error);
      return false;
    }
  }

  /**
   * Get Supabase auth token
   */
  private static getAuthToken(): string | null {
    try {
      // Try to get token from Supabase client
      const supabaseToken = localStorage.getItem('supabase.auth.token');
      if (supabaseToken) {
        return supabaseToken;
      }

      // Fallback: try to get from session storage
      const sessionToken = sessionStorage.getItem('supabase.auth.token');
      return sessionToken;
    } catch (error) {
      debugLogger.warn('PlaywrightPDFService', 'Could not get auth token', error);
      return null;
    }
  }
}