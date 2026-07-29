import React, { useState } from 'react';
import { NagadLogo } from './NagadLogo';

interface NagadFooterProps {
  customLogoUrl?: string;
}

export const NagadFooter: React.FC<NagadFooterProps> = ({ customLogoUrl }) => {
  const [imgError, setImgError] = useState(false);
  const trimmedUrl = customLogoUrl?.trim();

  return (
    <div className="w-full py-1.5 sm:py-2.5 mt-auto flex items-center justify-center select-none">
      {trimmedUrl && !imgError ? (
        <img
          src={trimmedUrl}
          alt="Nagad Logo"
          onError={() => setImgError(true)}
          className="max-h-12 sm:max-h-14 object-contain brightness-0 invert"
        />
      ) : (
        <NagadLogo className="w-40 sm:w-48" />
      )}
    </div>
  );
};
