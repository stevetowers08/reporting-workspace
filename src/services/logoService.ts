/**
 * Logo Management Service
 * Handles official logos for integrations with proper metadata and storage
 */

export interface LogoMetadata {
  id: string;
  platform: string;
  name: string;
  version: string;
  lastUpdated: string;
  source: 'official' | 'custom';
  formats: {
    svg?: string;
    png?: string;
    webp?: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  brandGuidelines?: {
    minSize: number;
    maxSize: number;
    backgroundColor?: string;
    usage: string[];
  };
}

export interface IntegrationLogo {
  platform: string;
  name: string;
  logo: LogoMetadata;
  status: 'active' | 'deprecated' | 'pending';
}

class LogoService {
  private static instance: LogoService;
  private logos: Map<string, LogoMetadata> = new Map();

  private constructor() {
    this.initializeOfficialLogos();
  }

  public static getInstance(): LogoService {
    if (!LogoService.instance) {
      LogoService.instance = new LogoService();
    }
    return LogoService.instance;
  }

  private initializeOfficialLogos(): void {
    // Official Meta/Facebook Logo
    this.logos.set('meta', {
      id: 'meta-official-2024',
      platform: 'meta',
      name: 'Meta',
      version: '2024.1',
      lastUpdated: '2024-01-15',
      source: 'official',
      formats: {
        svg: 'inline-svg'
      },
      dimensions: { width: 24, height: 24 },
      brandGuidelines: {
        minSize: 16,
        maxSize: 200,
        backgroundColor: '#FFFFFF',
        usage: ['agency-panel', 'dashboard', 'integration-cards', 'client-form', 'client-table']
      }
    });

    // Official Google Ads Logo
    this.logos.set('googleAds', {
      id: 'google-ads-official-2024',
      platform: 'googleAds',
      name: 'Google Ads',
      version: '2024.1',
      lastUpdated: '2024-01-15',
      source: 'official',
      formats: {
        svg: 'inline-svg'
      },
      dimensions: { width: 24, height: 24 },
      brandGuidelines: {
        minSize: 16,
        maxSize: 200,
        backgroundColor: '#FFFFFF',
        usage: ['agency-panel', 'dashboard', 'integration-cards', 'client-form', 'client-table']
      }
    });

    // Official GoHighLevel Logo
    this.logos.set('goHighLevel', {
      id: 'gohighlevel-official-2024',
      platform: 'goHighLevel',
      name: 'GoHighLevel',
      version: '2024.1',
      lastUpdated: '2024-01-15',
      source: 'official',
      formats: {
        svg: 'inline-svg'
      },
      dimensions: { width: 24, height: 24 },
      brandGuidelines: {
        minSize: 16,
        maxSize: 200,
        backgroundColor: '#FFFFFF',
        usage: ['agency-panel', 'dashboard', 'integration-cards', 'client-form', 'client-table']
      }
    });

    // Official Google Sheets Logo
    this.logos.set('googleSheets', {
      id: 'google-sheets-official-2024',
      platform: 'googleSheets',
      name: 'Google Sheets',
      version: '2024.1',
      lastUpdated: '2024-01-15',
      source: 'official',
      formats: {
        svg: 'inline-svg'
      },
      dimensions: { width: 24, height: 24 },
      brandGuidelines: {
        minSize: 16,
        maxSize: 200,
        backgroundColor: '#FFFFFF',
        usage: ['agency-panel', 'dashboard', 'integration-cards', 'client-form', 'client-table']
      }
    });

    // Official Google AI Studio Logo
    this.logos.set('googleAI', {
      id: 'google-ai-studio-official-2024',
      platform: 'googleAI',
      name: 'Google AI Studio',
      version: '2024.1',
      lastUpdated: '2024-01-15',
      source: 'official',
      formats: {
        svg: 'inline-svg'
      },
      dimensions: { width: 24, height: 24 },
      brandGuidelines: {
        minSize: 16,
        maxSize: 200,
        backgroundColor: '#FFFFFF',
        usage: ['agency-panel', 'dashboard', 'integration-cards', 'client-form', 'client-table']
      }
    });
  }

  /**
   * Get logo metadata for a platform
   */
  public getLogoMetadata(platform: string): LogoMetadata | null {
    return this.logos.get(platform) || null;
  }

  /**
   * Get all available logos
   */
  public getAllLogos(): LogoMetadata[] {
    return Array.from(this.logos.values());
  }

  /**
   * Get logos for specific platforms
   */
  public getLogosForPlatforms(platforms: string[]): IntegrationLogo[] {
    return platforms.map(platform => {
      const logo = this.getLogoMetadata(platform);
      return {
        platform,
        name: logo?.name || platform,
        logo: logo!,
        status: logo ? 'active' : 'pending'
      };
    }).filter(item => item.logo);
  }

  /**
   * Check if logo exists for platform
   */
  public hasLogo(platform: string): boolean {
    return this.logos.has(platform);
  }

  /**
   * Get logo component name for platform
   */
  public getLogoComponentName(platform: string): string {
    const componentMap: Record<string, string> = {
      'meta': 'MetaIcon',
      'facebookAds': 'MetaIcon',
      'googleAds': 'GoogleAdsIcon',
      'goHighLevel': 'GoHighLevelIcon',
      'googleSheets': 'GoogleSheetsIcon',
      'googleAI': 'GoogleAIStudioIcon',
      'google-ai': 'GoogleAIStudioIcon'
    };
    
    return componentMap[platform] || 'DefaultIcon';
  }

  /**
   * Validate logo usage according to brand guidelines
   */
  public validateLogoUsage(platform: string, size: number, context: string): {
    valid: boolean;
    warnings: string[];
  } {
    const logo = this.getLogoMetadata(platform);
    const warnings: string[] = [];

    if (!logo) {
      return { valid: false, warnings: ['Logo not found for platform'] };
    }

    if (!logo.brandGuidelines) {
      return { valid: true, warnings: [] };
    }

    const { minSize, maxSize, usage } = logo.brandGuidelines;

    if (size < minSize) {
      warnings.push(`Logo size ${size}px is below minimum recommended size of ${minSize}px`);
    }

    if (size > maxSize) {
      warnings.push(`Logo size ${size}px exceeds maximum recommended size of ${maxSize}px`);
    }

    if (!usage.includes(context)) {
      warnings.push(`Logo usage in context '${context}' may not be approved by brand guidelines`);
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Get recommended logo size for context
   */
  public getRecommendedSize(platform: string, context: string): number {
    const logo = this.getLogoMetadata(platform);
    if (!logo?.brandGuidelines) return 24;

    const contextSizes: Record<string, number> = {
      'agency-panel': 20,
      'dashboard': 24,
      'integration-cards': 32,
      'client-form': 20,
      'client-table': 16,
      'header': 40,
      'sidebar': 16
    };

    const recommendedSize = contextSizes[context] || 24;
    const { minSize, maxSize } = logo.brandGuidelines;

    return Math.max(minSize, Math.min(maxSize, recommendedSize));
  }
}

export const logoService = LogoService.getInstance();
