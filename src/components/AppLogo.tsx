import React, { useState } from 'react';
import { Monitor } from 'lucide-react';

interface AppLogoProps {
  appName: string;
  className?: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ appName, className }) => {
  const [error, setError] = useState(false);

  const getDomain = (name: string) => {
    return name.toLowerCase().replace(/ /g, '').split('.')[0] + '.com';
  };

  const logoUrl = `https://logo.dev/${getDomain(appName)}`;

  if (error) {
    return (
      <div className={className}>
        <Monitor size={24} />
      </div>
    );
  }

  return (
    <img 
      src={logoUrl}
      alt={`${appName} logo`}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default AppLogo;