import React from 'react';

interface GoogleAIStudioIconProps {
  size?: number;
  className?: string;
}

export const GoogleAIStudioIcon: React.FC<GoogleAIStudioIconProps> = ({ 
  size = 24, 
  className = '' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Official Google AI Studio Logo */}
      <defs>
        <linearGradient id="googleAIGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4"/>
          <stop offset="25%" stopColor="#34A853"/>
          <stop offset="50%" stopColor="#FBBC05"/>
          <stop offset="75%" stopColor="#EA4335"/>
          <stop offset="100%" stopColor="#9C27B0"/>
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="12" cy="12" r="11" fill="url(#googleAIGradient)"/>

      {/* AI Brain/Neural Network Symbol */}
      <circle cx="8" cy="8" r="1.5" fill="white"/>
      <circle cx="16" cy="8" r="1.5" fill="white"/>
      <circle cx="8" cy="16" r="1.5" fill="white"/>
      <circle cx="16" cy="16" r="1.5" fill="white"/>
      <circle cx="12" cy="12" r="2" fill="white"/>

      {/* Connection lines */}
      <path d="M8 8 L12 12 M16 8 L12 12 M8 16 L12 12 M16 16 L12 12" stroke="white" strokeWidth="1" opacity="0.8"/>

      {/* "AI" Text */}
      <text x="12" y="20" fontSize="3" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial, sans-serif">AI</text>
    </svg>
  );
};