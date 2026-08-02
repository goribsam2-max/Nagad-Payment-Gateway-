import React from 'react';

interface NagadHeaderProps {
  storeName: string;
  amount: string;
  currency: 'BDT' | '৳';
  charge: string;
  invoiceNo: string;
  lang: 'bn' | 'en';
  onLangChange: (lang: 'bn' | 'en') => void;
  topLogoUrl?: string;
}

export const NagadHeader: React.FC<NagadHeaderProps> = ({
  lang,
  onLangChange,
  topLogoUrl,
}) => {
  return (
    <div className="w-full flex flex-col items-center pt-2 pb-4 relative select-none">
      {/* Top right language switch pill */}
      <div className="absolute -top-1 -right-1 z-10 flex rounded-full bg-gray-100 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() => onLangChange('bn')}
          className={`px-4 py-1.5 text-xs font-bold transition-colors rounded-full ${
            lang === 'bn' ? 'bg-[#ed1c24] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          বাংলা
        </button>
        <button
          type="button"
          onClick={() => onLangChange('en')}
          className={`px-4 py-1.5 text-xs font-bold transition-colors rounded-full ${
            lang === 'en' ? 'bg-[#ed1c24] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ENG
        </button>
      </div>

      {/* Main Logo */}
      <div className="mt-8 mb-4">
        {topLogoUrl ? (
          <img src={topLogoUrl} alt="Nagad" className="w-24 h-24 object-contain" />
        ) : (
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-[0_4px_15px_rgba(237,28,36,0.15)] p-2">
             <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
               <circle cx="50" cy="50" r="48" fill="#ed1c24" />
               <path d="M 30 70 C 25 50, 40 30, 65 25 C 75 22, 82 28, 75 40 C 65 55, 45 60, 30 70 Z" fill="white" />
               <path d="M 45 42 C 40 35, 50 25, 60 22 C 65 20, 70 25, 62 35 C 55 42, 48 45, 45 42 Z" fill="#ed1c24" />
               <circle cx="42" cy="38" r="4" fill="white" />
             </svg>
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-[#ed1c24] mb-1 tracking-tight">
        নগদ
      </h1>
      <p className="text-gray-500 text-lg mb-4">
        {lang === 'bn' ? 'স্বাগতম' : 'Welcome'}
      </p>

    </div>
  );
};
