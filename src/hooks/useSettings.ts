import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notification_preferences: {
    push: boolean;
    email: boolean;
    marketing: boolean;
  };
}

export const useSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    notification_preferences: { push: true, email: false, marketing: false }
  });
  const [loading, setLoading] = useState(true);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Listen for system changes if theme is system
  useEffect(() => {
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Fetch settings
  useEffect(() => {
    if (!user) return;
    
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme, notification_preferences')
          .eq('id', user.id)
          .single();
          
        if (data) {
          const loadedTheme = data.theme || 'light';
          setSettings({
            theme: loadedTheme,
            notification_preferences: data.notification_preferences || { push: true, email: false, marketing: false }
          });
          
          applyTheme(loadedTheme);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  // Update functions
  const updateTheme = async (theme: 'light' | 'dark' | 'system') => {
    setSettings(prev => ({ ...prev, theme }));
    applyTheme(theme);

    if (user) {
      await supabase.from('profiles').update({ theme }).eq('id', user.id);
    }
  };

  const updateNotifications = async (key: keyof UserSettings['notification_preferences']) => {
    const newPrefs = { ...settings.notification_preferences, [key]: !settings.notification_preferences[key] };
    setSettings(prev => ({ ...prev, notification_preferences: newPrefs }));
    
    if (user) {
      await supabase.from('profiles').update({ notification_preferences: newPrefs }).eq('id', user.id);
    }
  };

  return { settings, loading, updateTheme, updateNotifications };
};
