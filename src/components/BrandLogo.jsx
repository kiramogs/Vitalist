import React from 'react';

import nirogLogo from '../assets/nirog-logo.png';

const sizeClasses = {
  sm: 'w-36 md:w-44',
  md: 'w-48 md:w-60',
  lg: 'w-64 md:w-80',
};

const BrandLogo = ({ size = 'md', className = '' }) => {
  return (
    <img
      src={nirogLogo}
      alt="NIROG"
      className={`${sizeClasses[size] || sizeClasses.md} rounded-2xl bg-white/95 p-2 shadow-2xl shadow-black/30 ring-1 ring-white/20 ${className}`}
    />
  );
};

export default BrandLogo;
