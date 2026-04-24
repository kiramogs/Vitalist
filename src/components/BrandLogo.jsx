import React from 'react';

import nirogLogo from '../assets/nirog-logo.png';

const sizeClasses = {
  xs: 'w-16 md:w-20',
  sm: 'w-24 md:w-28',
  md: 'w-32 md:w-40',
  lg: 'w-40 md:w-48',
};

const BrandLogo = ({ size = 'md', className = '' }) => {
  return (
    <img
      src={nirogLogo}
      alt="NIROG"
      className={`${sizeClasses[size] || sizeClasses.md} rounded-xl bg-white/95 p-1.5 shadow-lg shadow-black/20 ring-1 ring-white/20 ${className}`}
    />
  );
};

export default BrandLogo;
