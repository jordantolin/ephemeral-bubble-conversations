
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const dimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={dimensions[size].width}
        height={dimensions[size].height}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer bubble */}
        <circle cx="32" cy="32" r="30" fill="#FEF7E4" stroke="#ebbd34" strokeWidth="2" />
        
        {/* Inner bubble details */}
        <circle cx="32" cy="32" r="24" fill="#ebbd34" fillOpacity="0.3" />
        
        {/* Bubble shine */}
        <circle cx="24" cy="24" r="6" fill="#FFFFFF" fillOpacity="0.6" />
        
        {/* Tiny bubbles */}
        <circle cx="46" cy="22" r="4" fill="#ebbd34" fillOpacity="0.7" />
        <circle cx="18" cy="38" r="3" fill="#ebbd34" fillOpacity="0.7" />
        <circle cx="38" cy="47" r="3.5" fill="#ebbd34" fillOpacity="0.7" />
        
        {/* Text "BT" for Bubble Trouble */}
        <path
          d="M26 40V24H35C36.3333 24 37.4167 24.4167 38.25 25.25C39.0833 26.0833 39.5 27.1667 39.5 28.5C39.5 29.3333 39.2917 30.0833 38.875 30.75C38.4583 31.4167 37.9167 31.9167 37.25 32.25C38.0833 32.5 38.7917 33 39.375 33.75C39.9583 34.5 40.25 35.3333 40.25 36.25C40.25 37.75 39.7917 38.9583 38.875 39.875C37.9583 40.7917 36.75 41.25 35.25 41.25H26V40ZM30 30.75H34C34.5 30.75 34.9167 30.5833 35.25 30.25C35.5833 29.9167 35.75 29.5 35.75 29C35.75 28.5 35.5833 28.0833 35.25 27.75C34.9167 27.4167 34.5 27.25 34 27.25H30V30.75ZM30 38H34.5C35.0833 38 35.5833 37.8333 36 37.5C36.4167 37.1667 36.625 36.75 36.625 36.25C36.625 35.75 36.4167 35.3333 36 35C35.5833 34.6667 35.0833 34.5 34.5 34.5H30V38Z"
          fill="#ebbd34"
        />
      </svg>
    </div>
  );
};

export default Logo;
