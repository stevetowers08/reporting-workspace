import React from 'react';

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
      {/* Official Google Ads Logo */}
      <rect fill="none" height="192" width="192"/>
      <g>
        <rect fill="#FBBC04" height="58.67" transform="matrix(0.5 -0.866 0.866 0.5 -46.2127 103.666)" width="117.33" x="8" y="62.52"/>
        <path d="M180.07,127.99L121.4,26.38c-8.1-14.03-26.04-18.84-40.07-10.74c-14.03,8.1-18.84,26.04-10.74,40.07 l58.67,101.61c8.1,14.03,26.04,18.83,40.07,10.74C183.36,159.96,188.16,142.02,180.07,127.99z" fill="#4285F4"/>
        <circle cx="37.34" cy="142.66" fill="#34A853" r="29.33"/>
      </g>
    </svg>
  );
};