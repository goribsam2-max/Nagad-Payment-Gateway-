import React from 'react';

export const NagadLogo: React.FC<{ className?: string }> = ({ className = "w-48" }) => {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {/* Circular Emblem */}
      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center p-1 shadow-md shrink-0">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="#D31820" />
          {/* Running dynamic figure stylized emblem of Nagad */}
          <path
            d="M 30 70 C 25 50, 40 30, 65 25 C 75 22, 82 28, 75 40 C 65 55, 45 60, 30 70 Z"
            fill="white"
          />
          <path
            d="M 45 42 C 40 35, 50 25, 60 22 C 65 20, 70 25, 62 35 C 55 42, 48 45, 45 42 Z"
            fill="#D31820"
          />
          <circle cx="42" cy="38" r="4" fill="white" />
        </svg>
      </div>

      {/* Bangla Typography */}
      <div className="flex flex-col text-left">
        <span className="text-white text-3xl font-black tracking-wide leading-none drop-shadow-sm">
          নগদ
        </span>
        <span className="text-white text-[10px] font-medium tracking-tight opacity-95 mt-1 whitespace-nowrap">
          ডাক বিভাগের ডিজিটাল লেনদেন
        </span>
      </div>
    </div>
  );
};
