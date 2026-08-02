import React from 'react';
import { X } from 'lucide-react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="bg-white w-full max-w-sm rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
        <div className="bg-[#ed1c24] text-white flex items-center justify-between p-4 shrink-0">
          <h2 className="font-bold text-lg">নির্দেশনা</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 bg-gray-50 flex justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt="Instructions" className="max-w-full h-auto rounded-lg shadow-sm" />
          ) : (
            <div className="text-gray-500 py-8">কোনো নির্দেশনা ইমেজ নেই।</div>
          )}
        </div>
        
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <button 
            onClick={onClose}
            className="w-full bg-[#ed1c24] hover:bg-[#d81920] text-white font-bold py-3 rounded-full transition-colors"
          >
            বুঝতে পেরেছি
          </button>
        </div>
      </div>
    </div>
  );
};
