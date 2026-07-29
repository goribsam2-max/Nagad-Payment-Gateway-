import React from 'react';
import { CartIcon } from './CartIcon';

interface NagadHeaderProps {
  storeName: string;
  amount: string;
  currency: 'BDT' | '৳';
  charge: string;
  invoiceNo: string;
  lang: 'bn' | 'en';
  onLangChange: (lang: 'bn' | 'en') => void;
}

export const NagadHeader: React.FC<NagadHeaderProps> = ({
  storeName,
  amount,
  currency,
  charge,
  invoiceNo,
  lang,
  onLangChange,
}) => {
  const formattedAmount = `${currency} ${amount}`;
  const formattedCharge = `${currency} ${charge}`;

  return (
    <div className="w-full flex flex-col items-center pt-1 pb-0.5 px-3 relative text-white select-none">
      {/* Top right language switch pill */}
      <div className="absolute top-1.5 right-3 z-10">
        <div className="bg-[#b3080d] border border-white/80 rounded-md overflow-hidden flex items-center text-xs font-bold text-white shadow-sm">
          <button
            type="button"
            onClick={() => onLangChange('bn')}
            className={`px-2 py-0.5 transition-colors ${
              lang === 'bn' ? 'bg-white text-[#d31820]' : 'text-white hover:bg-white/10'
            }`}
          >
            বাং
          </button>
          <div className="w-[1px] h-3 bg-white/50" />
          <button
            type="button"
            onClick={() => onLangChange('en')}
            className={`px-2 py-0.5 transition-colors ${
              lang === 'en' ? 'bg-white text-[#d31820]' : 'text-white hover:bg-white/10'
            }`}
          >
            Eng
          </button>
        </div>
      </div>

      {/* Cart Icon */}
      <div className="mt-8 sm:mt-12 mb-2">
        <CartIcon className="w-18 h-14 sm:w-20 sm:h-16" />
      </div>

      {/* Store Name */}
      <h1 className="text-lg sm:text-xl font-black uppercase text-center tracking-wide text-white drop-shadow mb-8 sm:mb-12 max-w-xs sm:max-w-md break-words">
        {storeName || 'MUNNA GENERAL STORE'}
      </h1>

      {/* Invoice Details */}
      <div className="w-full max-w-xs sm:max-w-sm flex flex-col gap-1 text-left text-xs sm:text-sm font-medium text-white leading-tight">
        <div className="flex items-center">
          <span className="font-bold text-white w-28 sm:w-32 shrink-0">
            {lang === 'bn' ? 'ইনভয়েস নং:' : 'Invoice No:'}
          </span>
          <span className="text-white font-normal truncate">{invoiceNo}</span>
        </div>

        <div className="flex items-center">
          <span className="font-bold text-white w-28 sm:w-32 shrink-0">
            {lang === 'bn' ? 'মোট পরিমাণ:' : 'Total Amount:'}
          </span>
          <span className="text-white font-normal truncate">{formattedAmount}</span>
        </div>

        <div className="flex items-center">
          <span className="font-bold text-white w-28 sm:w-32 shrink-0">
            {lang === 'bn' ? 'চার্জ:' : 'Charge:'}
          </span>
          <span className="text-white font-normal truncate">{formattedCharge}</span>
        </div>
      </div>
    </div>
  );
};
