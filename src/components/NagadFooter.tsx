import React from 'react';
import { Shield, Clock, Headphones } from 'lucide-react';

export const NagadFooter: React.FC<{ customLogoUrl?: string }> = () => {
  return (
    <div className="w-full mt-auto flex items-center justify-between gap-3 select-none pb-4 pt-2">
      <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-100 flex-1 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <Shield className="w-4 h-4 text-teal-600 fill-teal-100 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold text-gray-700 leading-none mb-0.5">নিরাপদ</span>
          <span className="text-[10px] text-gray-500 leading-none">ও সুরক্ষিত</span>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-100 flex-1 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <div className="relative shrink-0">
          <Clock className="w-4 h-4 text-gray-400" strokeWidth={2} />
          <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#ed1c24] rounded-full"></div>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold text-gray-700 leading-none mb-0.5">দ্রুত</span>
          <span className="text-[10px] text-gray-500 leading-none">লেনদেন</span>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-100 flex-1 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <Headphones className="w-4 h-4 text-gray-600 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold text-gray-700 leading-none mb-0.5">২৪/৭</span>
          <span className="text-[10px] text-gray-500 leading-none">সাপোর্ট</span>
        </div>
      </div>
    </div>
  );
};
