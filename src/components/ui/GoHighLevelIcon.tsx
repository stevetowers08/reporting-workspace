import React from 'react';

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
      <defs>
        <linearGradient id="gohighlevelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6"/>
          <stop offset="100%" stopColor="#A855F7"/>
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="12" cy="12" r="10" fill="url(#gohighlevelGradient)"/>

      {/* Lightning bolt */}
      <path d="M13 7L9 13H11L9 17L13 11H11L13 7Z" fill="white" stroke="white" strokeWidth="0.5"/>

      {/* "GHL" text */}
      <text x="12" y="20" fontSize="4" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial, sans-serif">GHL</text>
    </svg>
  );
};