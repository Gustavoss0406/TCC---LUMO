import React, { useState } from 'react';
import { Monitor } from 'lucide-react';

interface AppLogoProps {
  appName: string;
  className?: string;
  iconUrl?: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ appName, className, iconUrl }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={className}>
        <Monitor size={24} />
      </div>
    );
  }

  if (iconUrl) {
    return (
      <img 
        src={iconUrl}
        alt={`${appName} logo`}
        className={`${className} object-contain`}
        onError={() => setError(true)}
      />
    );
  }

  // Fallback: Try to guess domain or use DiceBear initials
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(appName)}&background=random&color=fff&size=128`;

  return (
    <img 
      src={fallbackUrl}
      alt={`${appName} logo`}
      className={`${className} object-cover`}
      onError={() => setError(true)}
    />
  );
};

export default AppLogo;
