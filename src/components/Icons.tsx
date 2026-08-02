import React from 'react';

export const PhoneChatLockIcon = () => (
  <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Phone */}
    <rect x="30" y="20" width="30" height="50" rx="4" stroke="#f4999d" strokeWidth="3" fill="none"/>
    <line x1="40" y1="63" x2="50" y2="63" stroke="#f4999d" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="30" y1="58" x2="60" y2="58" stroke="#f4999d" strokeWidth="1.5"/>
    
    {/* Chat Bubble overlay */}
    <path d="M 40 50 L 40 30 C 40 25 45 20 50 20 L 70 20 C 75 20 80 25 80 30 L 80 45 C 80 50 75 55 70 55 L 55 55 L 45 65 L 45 55 Z" fill="white" stroke="#f4999d" strokeWidth="2" strokeLinejoin="round"/>
    
    {/* Inside chat bubble */}
    <text x="44" y="44" fill="#ed1c24" fontSize="18" fontWeight="bold">***</text>
    {/* Padlock */}
    <rect x="66" y="38" width="6" height="5" rx="1" stroke="#ed1c24" strokeWidth="1.5" fill="none"/>
    <path d="M 67 38 V 35 A 2 2 0 0 1 71 35 V 38" stroke="#ed1c24" strokeWidth="1.5" fill="none"/>
  </svg>
);

export const CheckMarkBoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="#22c55e" />
    <path d="M7 12L10 15L17 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const ShieldCheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-teal-600 fill-teal-100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
