import { logoService } from '@/services/logoService';
import React from 'react';

interface LogoManagerProps {
  platform: string;
  size?: number;
  className?: string;
  context?: string;
  fallback?: React.ReactNode;
}

export const LogoManager: React.FC<LogoManagerProps> = ({
  platform,
  size,
  className = '',
  context = 'default',
  fallback
}) => {
  const logoMetadata = logoService.getLogoMetadata(platform);
  const recommendedSize = size || logoService.getRecommendedSize(platform, context);
  
  // Validate logo usage
  const validation = logoService.validateLogoUsage(platform, recommendedSize, context);
  
  if (!logoMetadata) {
    // Silently return fallback without console warnings
    return fallback ? <>{fallback}</> : <div className={`bg-gray-200 rounded ${className}`} style={{ width: recommendedSize, height: recommendedSize }} />;
  }

  // Only log warnings in development for critical issues
  if (process.env.NODE_ENV === 'development' && validation.warnings.length > 0) {
    // Filter out non-critical warnings
    const criticalWarnings = validation.warnings.filter(warning => 
      !warning.includes('may not be approved by brand guidelines')
    );
    if (criticalWarnings.length > 0) {
      debugLogger.warn('LogoManager', `Logo usage warnings for ${platform}`, criticalWarnings);
    }
  }

  // Map platform to logo file path
  const getLogoPath = (platform: string): string => {
    const logoMap: Record<string, string> = {
      'meta': '/logos/meta-real.svg',
      'facebookAds': '/logos/meta-real.svg',
      'googleAds': '/logos/googleAds-real.svg',
      'goHighLevel': '/logos/goHighLevel-official.png',
      'googleSheets': '/logos/googleSheets-real.svg',
      'googleAI': '/logos/googleAI-official.svg',
      'google-ai': '/logos/googleAI-official.svg'
    };
    
    return logoMap[platform] || '';
  };

  const logoPath = getLogoPath(platform);
  
  if (!logoPath) {
    // Silently return fallback without console warnings
    return fallback ? <>{fallback}</> : <div className={`bg-gray-200 rounded ${className}`} style={{ width: recommendedSize, height: recommendedSize }} />;
  }

  return (
    <img
      src={logoPath}
      alt={`${logoMetadata.name} logo`}
      width={recommendedSize}
      height={recommendedSize}
      className={className}
      style={{ width: recommendedSize, height: recommendedSize }}
      onError={(e) => {
        // Silently handle image loading errors without console spam
        e.currentTarget.style.display = 'none';
        // Create fallback element if it doesn't exist
        if (!e.currentTarget.nextElementSibling) {
          const fallbackDiv = document.createElement('div');
          fallbackDiv.className = `bg-gray-200 rounded ${className}`;
          fallbackDiv.style.width = `${recommendedSize}px`;
          fallbackDiv.style.height = `${recommendedSize}px`;
          e.currentTarget.parentNode?.appendChild(fallbackDiv);
        }
      }}
    />
  );
};

// Convenience components for each platform
export const MetaLogo: React.FC<Omit<LogoManagerProps, 'platform'>> = (props) => (
  <LogoManager platform="meta" {...props} />
);

export const GoogleAdsLogo: React.FC<Omit<LogoManagerProps, 'platform'>> = (props) => (
  <LogoManager platform="googleAds" {...props} />
);

export const GoHighLevelLogo: React.FC<Omit<LogoManagerProps, 'platform'>> = (props) => (
  <LogoManager platform="goHighLevel" {...props} />
);

export const GoogleSheetsLogo: React.FC<Omit<LogoManagerProps, 'platform'>> = (props) => (
  <LogoManager platform="googleSheets" {...props} />
);

export const GoogleAIStudioLogo: React.FC<Omit<LogoManagerProps, 'platform'>> = (props) => (
  <LogoManager platform="googleAI" {...props} />
);
