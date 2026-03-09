import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  History as HistoryIcon, 
  Smartphone, 
  Settings as SettingsIcon, 
  Plus,
  Search,
  Bell,
  Zap,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { useNotifications } from './hooks/useNotifications';

// Pages
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import History from './pages/History';
import Device from './pages/Device';
import Settings from './pages/Settings';
import Auth from './pages/Auth';

const ConfigError = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="max-w-md w-full glass-card p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
        <AlertCircle size={40} />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Configuration Required</h2>
        <p className="text-slate-500 font-medium">
          To use FocusBuddy, you need to connect your own Supabase project.
        </p>
      </div>
      
      <div className="bg-slate-50 rounded-2xl p-4 text-left space-y-3 border border-slate-100">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Required Secrets:</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm font-mono text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            VITE_SUPABASE_URL
          </li>
          <li className="flex items-center gap-2 text-sm font-mono text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            VITE_SUPABASE_ANON_KEY
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <a 
          href="https://supabase.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
        >
          Get Supabase Keys
          <ExternalLink size={16} />
        </a>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Add these to your project secrets in AI Studio
        </p>
      </div>
    </div>
  </div>
);

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-screen">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-12 h-12 border-4 border-interactive-primary border-t-transparent rounded-full" 
        />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'activities', label: 'Card', icon: Activity },
    { id: 'history', label: 'Send', icon: HistoryIcon },
    { id: 'device', label: 'Recipients', icon: Smartphone },
    { id: 'settings', label: 'Manage', icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'activities': return <Activities />;
      case 'history': return <History />;
      case 'device': return <Device />;
      case 'settings': return <Settings setActiveTab={setActiveTab} />;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background-screen pb-32 flex flex-col selection:bg-interactive-accent/20 selection:text-interactive-primary">
      {/* Header */}
      <header className="px-2 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="https://i.ibb.co/jkgvKQQg/freepik-eu-quero-uma-logo-que-siga-o-conceito-da-img1-que-1071.png" 
            alt="Logo" 
            className="h-[150px] w-auto object-contain -ml-4" 
          />
        </div>
        <div className="flex items-center gap-2 pr-4">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-background-elevated border border-border-neutral text-content-primary hover:bg-background-neutral transition-colors shadow-sm relative z-50"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-sentiment-negative rounded-full border-2 border-background-elevated animate-pulse" />
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-16 right-0 w-80 bg-background-elevated rounded-[32px] shadow-2xl shadow-black/20 border border-white/50 backdrop-blur-xl p-6 z-40 origin-top-right"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-content-primary tracking-tight">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-full bg-background-neutral flex items-center justify-center text-content-tertiary hover:text-content-primary hover:bg-interactive-accent/20 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-content-tertiary">
                        <Bell size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-bold">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          onClick={() => markAsRead(notification.id)}
                          className={`flex gap-4 group cursor-pointer transition-opacity ${notification.read ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
                        >
                          <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 border ${
                            notification.type === 'success' ? 'bg-interactive-accent/20 text-interactive-primary border-interactive-accent/10' :
                            notification.type === 'warning' ? 'bg-sentiment-warning/20 text-sentiment-warning border-sentiment-warning/10' :
                            'bg-background-neutral text-content-tertiary border-border-neutral'
                          }`}>
                            {notification.type === 'success' ? <Zap size={20} fill="currentColor" /> : 
                             notification.type === 'warning' ? <AlertCircle size={20} /> :
                             <Bell size={20} />}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-content-primary leading-tight">{notification.title}</p>
                            <p className="text-xs font-medium text-content-secondary leading-relaxed">{notification.message}</p>
                            <p className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider mt-1">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="w-full mt-6 py-3 rounded-2xl bg-background-neutral text-content-secondary text-xs font-black uppercase tracking-widest hover:bg-background-neutral/80 transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-12 h-12 rounded-full bg-interactive-accent/20 border-2 border-white overflow-hidden shadow-sm">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pt-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-6 left-6 right-6 z-50">
        <nav className="h-20 bg-background-elevated rounded-[32px] shadow-2xl shadow-black/10 flex items-center justify-around px-4 border border-border-neutral/50 backdrop-blur-lg">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center justify-center w-12 h-12 transition-all duration-500"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-interactive-accent rounded-2xl shadow-lg shadow-interactive-accent/30"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <item.icon 
                  size={20} 
                  className={`relative z-10 transition-colors duration-300 ${
                    isActive ? 'text-interactive-primary' : 'text-content-tertiary'
                  }`} 
                />
                <AnimatePresence>
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute -bottom-7 text-[10px] font-bold text-content-primary whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;