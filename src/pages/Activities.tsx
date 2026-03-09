import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProductivityLog } from '../types/supabase';
import { motion, AnimatePresence } from 'motion/react';
import AppLogo from '../components/AppLogo';
import ActivityHero from '../components/ActivityHero';
import { Monitor, Search, Filter, ArrowUpRight, ArrowDownRight, Clock, Layout, RefreshCw, ChevronRight } from 'lucide-react';

const Activities = () => {
  const { user } = useAuth();
  const [log, setLog] = useState<ProductivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async (showSync = false) => {
    if (!user) return;
    if (showSync) setFetching(true);
    
    try {
      const { data: devices } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (devices && devices.length > 0) {
        const deviceId = devices[0].id;
        const today = new Date().toISOString().split('T')[0];
        
        const { data: logs } = await supabase
          .from('productivity_logs')
          .select('*')
          .eq('device_id', deviceId)
          .eq('date', today)
          .limit(1);

        if (logs && logs.length > 0) {
          setLog(logs[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
      if (showSync) {
        setTimeout(() => setFetching(false), 1000);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-interactive-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatTime = (seconds: number | undefined | null) => {
    const s = seconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const appUsage = (log?.app_usage as Record<string, number>) || {};
  const sortedApps = Object.entries(appUsage)
    .filter(([app]) => app.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const totalSeconds = Object.values(appUsage).reduce((a, b) => (a as number) + (b as number), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", bounce: 0.4 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12 max-w-lg mx-auto"
    >
      <ActivityHero />
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-4xl font-black text-content-primary tracking-tighter">Registro de Atividades</h2>
            <p className="text-content-secondary font-medium mt-1">Detalhamento de uso entre dispositivos</p>
          </div>
          <button 
            onClick={() => fetchData(true)}
            disabled={fetching}
            className={`relative overflow-hidden shimmer-effect p-4 rounded-2xl bg-background-elevated border border-border-neutral text-content-tertiary hover:text-interactive-primary hover:bg-interactive-accent/20 transition-all shadow-sm ${fetching ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={22} />
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-content-tertiary group-focus-within:text-content-primary transition-colors" size={22} />
          <input 
            type="text" 
            placeholder="Buscar aplicações..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 px-6 py-5 bg-background-neutral/50 border-2 border-transparent rounded-[24px] focus:border-interactive-accent focus:bg-background-elevated transition-all outline-none font-bold text-lg placeholder:font-medium"
          />
        </div>
      </motion.div>

      {!log ? (
        <motion.div variants={itemVariants} className="bg-background-elevated p-12 text-center space-y-6 rounded-[40px] shadow-xl shadow-black/5 border border-white">
          <div className="w-24 h-24 bg-background-neutral rounded-full flex items-center justify-center mx-auto text-content-tertiary border border-border-neutral">
            <Monitor size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-content-primary tracking-tight">Nenhuma Atividade Registrada</h2>
            <p className="text-content-secondary max-w-xs mx-auto text-sm font-medium leading-relaxed">
              Inicie o trabalho em seu dispositivo para visualizar os registros de uso em tempo real.
            </p>
          </div>
        </motion.div>
      ) : sortedApps.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-background-elevated p-12 text-center space-y-4 rounded-[40px] shadow-xl shadow-black/5 border border-white">
          <div className="w-24 h-24 bg-background-neutral rounded-full flex items-center justify-center mx-auto text-content-tertiary">
            <Search size={40} />
          </div>
          <p className="text-content-secondary font-bold text-lg">Nenhuma aplicação corresponde à sua busca.</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="text-interactive-primary font-black text-sm hover:underline px-6 py-3 bg-interactive-accent/20 rounded-full uppercase tracking-widest"
          >
            Limpar busca
          </button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="bg-background-elevated overflow-hidden rounded-[40px] shadow-xl shadow-black/5 border border-white">
            <AnimatePresence mode="popLayout">
              {sortedApps.map(([app, seconds], index) => {
                const percentage = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
                
                return (
                  <motion.div 
                    layout
                    key={app}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-6 flex items-center justify-between group hover:bg-background-neutral/50 transition-all cursor-pointer ${
                      index !== sortedApps.length - 1 ? 'border-b border-border-neutral/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <AppLogo 
                        appName={app} 
                        className="w-16 h-16 rounded-2xl bg-background-screen flex-shrink-0 flex items-center justify-center text-content-tertiary border border-border-neutral group-hover:border-interactive-accent/50 group-hover:text-interactive-primary transition-all shadow-sm p-3"
                      />
                      <div className="space-y-1.5 min-w-0">
                        <h4 className="font-black text-content-primary text-xl truncate tracking-tight">{app}</h4>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-background-neutral rounded-full overflow-hidden p-0.5">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className="h-full bg-interactive-primary rounded-full shadow-sm"
                            />
                          </div>
                          <p className="text-[10px] text-content-tertiary font-black uppercase tracking-wider">
                            {Math.round(percentage)}% de uso
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right space-y-1">
                        <p className="font-black text-content-primary text-xl">{formatTime(seconds)}</p>
                        <p className="text-[10px] text-sentiment-positive font-black uppercase tracking-widest bg-sentiment-positive/10 px-2 py-0.5 rounded-full inline-block">
                          Ativo
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-background-neutral flex items-center justify-center text-content-tertiary group-hover:bg-interactive-accent group-hover:text-content-primary transition-all duration-300">
                        <ChevronRight size={24} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Activities;
