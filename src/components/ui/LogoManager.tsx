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
    console.warn(`Logo not found for platform: ${platform}`);
    return fallback ? <>{fallback}</> : <div className={`bg-gray-200 rounded ${className}`} style={{ width: recommendedSize, height: recommendedSize }} />;
  }

  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && validation.warnings.length > 0) {
    console.warn(`Logo usage warnings for ${platform}:`, validation.warnings);
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
    console.warn(`No logo path found for platform: ${platform}`);
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
        console.error(`Failed to load logo for ${platform}:`, logoPath);
        // Fallback to gray box if image fails to load
        e.currentTarget.style.display = 'none';
        if (e.currentTarget.nextElementSibling) {
          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
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
