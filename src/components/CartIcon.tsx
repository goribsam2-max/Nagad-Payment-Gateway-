import React from 'react';

export const CartIcon: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-white transform rotate-8 sm:rotate-10"
      >
        {/* Sparkle / decorative dots around shopping cart */}
        <rect x="40" y="30" width="4" height="4" fill="white" />
        <rect x="25" y="45" width="4" height="4" fill="white" />
        <rect x="35" y="60" width="3" height="3" fill="white" />
        <rect x="160" y="25" width="4" height="4" fill="white" />
        <rect x="172" y="40" width="4" height="4" fill="white" />
        <rect x="165" y="60" width="3" height="3" fill="white" />

        {/* Shopping Bag 1 (inside cart) */}
        <rect x="80" y="25" width="32" height="40" rx="3" stroke="white" strokeWidth="4" fill="none" />
        <path d="M 88 25 C 88 15, 104 15, 104 25" stroke="white" strokeWidth="3" fill="none" />

        {/* Shopping Bag 2 (tilted inside cart) */}
        <rect x="102" y="32" width="28" height="36" rx="3" stroke="white" strokeWidth="4" fill="none" transform="rotate(8 116 50)" />
        <path d="M 108 32 C 108 24, 122 24, 122 32" stroke="white" strokeWidth="3" fill="none" transform="rotate(8 116 50)" />

        {/* Cart Frame & Grid */}
        <path
          d="M 45 45 L 60 45 L 75 105 L 145 105 L 158 45 L 60 45"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Cart Handle */}
        <path d="M 45 45 L 35 30 L 25 30" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Cart Grid Lines */}
        <path d="M 65 65 L 153 65" stroke="white" strokeWidth="2.5" opacity="0.8" />
        <path d="M 70 85 L 148 85" stroke="white" strokeWidth="2.5" opacity="0.8" />
        <path d="M 90 45 L 90 105" stroke="white" strokeWidth="2.5" opacity="0.8" />
        <path d="M 115 45 L 115 105" stroke="white" strokeWidth="2.5" opacity="0.8" />

        {/* Cart Wheels (o o) */}
        <circle cx="85" cy="122" r="8" stroke="white" strokeWidth="4" fill="none" />
        <circle cx="132" cy="122" r="8" stroke="white" strokeWidth="4" fill="none" />
      </svg>
    </div>
  );
};
