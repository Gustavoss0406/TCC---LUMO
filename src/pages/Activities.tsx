import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import AppLogo from '../components/AppLogo';
import ActivityHero from '../components/ActivityHero';
import { Monitor, Search, RefreshCw } from 'lucide-react';

const Activities = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(14400);

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});

  const [productiveTime, setProductiveTime] = useState(0);
  const [neutralTime, setNeutralTime] = useState(0);
  const [distractingTime, setDistractingTime] = useState(0);
  const [productivityScore, setProductivityScore] = useState(0);
  const [mergedAppUsage, setMergedAppUsage] = useState<Record<string, number>>({});
  const [hasData, setHasData] = useState(false);

  const fetchData = async (showSync = false) => {
    if (!user) return;
    if (showSync) setFetching(true);

    try {
      const { data: icons } = await supabase.from('app_icons').select('name, icon_url');
      if (icons) {
        const iconMap = icons.reduce((acc: Record<string, string>, curr) => {
          acc[curr.name] = curr.icon_url;
          return acc;
        }, {});
        setAppIcons(iconMap);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_goal_seconds')
        .eq('id', user.id)
        .single();

      if (profile?.daily_goal_seconds) {
        setDailyGoal(profile.daily_goal_seconds);
      }

      const { data: goals } = await supabase
        .from('daily_goals')
        .select('date, completed')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (goals) {
        let currentStreak = 0;
        for (const goal of goals) {
          if (goal.completed) currentStreak++;
          else if (goal.date === new Date().toISOString().split('T')[0]) continue;
          else break;
        }
        setStreak(currentStreak);
      }

      const { data: devices } = await supabase
        .from('devices')
        .select('id, device_code')
        .eq('user_id', user.id);

      if (!devices || devices.length === 0) {
        setHasData(false);
        return;
      }

      const deviceIds = devices.map(d => d.id);
      const deviceCodes = devices.map(d => d.device_code);
      const today = new Date().toISOString().split('T')[0];

      const { data: deviceState } = await supabase
        .from('device_state')
        .select('*')
        .in('device_id', deviceIds)
        .order('last_sync', { ascending: false })
        .limit(1)
        .single();

      const { data: logs } = await supabase
        .from('productivity_logs')
        .select('*')
        .in('device_code', deviceCodes)
        .eq('date', today);

      let totalProd = 0;
      let totalNeut = 0;
      let totalDist = 0;
      let allAppUsage: Record<string, number> = {};

      if (logs && logs.length > 0) {
        for (const log of logs) {
          totalProd += log.productive_time || 0;
          totalNeut += log.neutral_time || 0;
          totalDist += log.distracting_time || 0;

          const usage = (log.app_usage as Record<string, number>) || {};
          for (const [app, seconds] of Object.entries(usage)) {
            allAppUsage[app] = (allAppUsage[app] || 0) + (seconds as number);
          }
        }
      }

      if (deviceState && deviceState.last_sync) {
        const stateDate = new Date(deviceState.last_sync).toISOString().split('T')[0];
        if (stateDate === today) {
          totalProd = Math.max(totalProd, deviceState.productive_time || 0);
          totalNeut = Math.max(totalNeut, deviceState.neutral_time || 0);
          totalDist = Math.max(totalDist, deviceState.distracting_time || 0);

          const currentUsage = (deviceState.app_usage as Record<string, number>) || {};
          for (const [app, seconds] of Object.entries(currentUsage)) {
            if (!allAppUsage[app]) {
              allAppUsage[app] = seconds as number;
            } else {
              allAppUsage[app] = Math.max(allAppUsage[app], seconds as number);
            }
          }

          setProductivityScore(deviceState.productivity || 0);
        }
      }

      if (!deviceState || !deviceState.last_sync ||
          new Date(deviceState.last_sync).toISOString().split('T')[0] !== today) {
        const activeTime = totalProd + totalDist;
        setProductivityScore(activeTime > 0 ? Math.round(totalProd / activeTime * 100) : 0);
      }

      setProductiveTime(totalProd);
      setNeutralTime(totalNeut);
      setDistractingTime(totalDist);
      setMergedAppUsage(allAppUsage);
      setHasData(totalProd > 0 || totalNeut > 0 || totalDist > 0 || Object.keys(allAppUsage).length > 0);

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
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-interactive-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatTime = (seconds: number | undefined | null) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '0m';
    const s = Math.max(0, seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const sortedApps = Object.entries(mergedAppUsage)
    .filter(([app]) => app.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(([, a], [, b]) => b - a);

  const totalSeconds = Object.values(mergedAppUsage).reduce((a, b) => a + b, 0);

  const topApp = sortedApps.length > 0 ? sortedApps[0] : null;
  const topFocusRaw = topApp ? topApp[0] : "N/A";
  const topFocus = topFocusRaw.length > 15 ? topFocusRaw.substring(0, 15) + '…' : topFocusRaw;
  const topFocusTime = topApp ? formatTime(topApp[1]) : "0m";
  const dailyProgress = dailyGoal > 0 ? Math.round(productiveTime / dailyGoal * 100) : 0;
  const dailyGoalStr = `${Math.min(dailyProgress, 100)}%`;
  const productivity = productivityScore > 0 ? `${productivityScore}%` : "0%";

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
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
      <ActivityHero
        topFocus={topFocus}
        topFocusTime={topFocusTime}
        dailyGoal={dailyGoalStr}
        streak={streak}
        productivity={productivity}
      />

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

      {!hasData ? (
        <motion.div variants={itemVariants} className="bg-background-elevated p-12 text-center space-y-6 rounded-[40px] shadow-xl shadow-black/5 border border-white/50 dark:border-white/5">
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
        <motion.div variants={itemVariants} className="bg-background-elevated p-12 text-center space-y-4 rounded-[40px] shadow-xl shadow-black/5 border border-white/50 dark:border-white/5">
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background-elevated rounded-2xl p-4 text-center border border-white/50 dark:border-white/5">
              <p className="text-2xl font-black text-sentiment-positive">{formatTime(productiveTime)}</p>
              <p className="text-[10px] font-black text-content-tertiary uppercase tracking-widest mt-1">Produtivo</p>
            </div>
            <div className="bg-background-elevated rounded-2xl p-4 text-center border border-white/50 dark:border-white/5">
              <p className="text-2xl font-black text-sentiment-warning">{formatTime(neutralTime)}</p>
              <p className="text-[10px] font-black text-content-tertiary uppercase tracking-widest mt-1">Neutro</p>
            </div>
            <div className="bg-background-elevated rounded-2xl p-4 text-center border border-white/50 dark:border-white/5">
              <p className="text-2xl font-black text-sentiment-negative">{formatTime(distractingTime)}</p>
              <p className="text-[10px] font-black text-content-tertiary uppercase tracking-widest mt-1">Distração</p>
            </div>
          </div>

          <div className="bg-background-elevated overflow-hidden rounded-[40px] shadow-xl shadow-black/5 border border-white/50 dark:border-white/5">
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
                    className={`p-6 flex items-center justify-between group hover:bg-background-neutral/50 transition-all ${
                      index !== sortedApps.length - 1 ? 'border-b border-border-neutral/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-5 min-w-0 flex-1">
                      <AppLogo
                        appName={app}
                        iconUrl={appIcons[app]}
                        className="w-16 h-16 rounded-2xl bg-background-screen flex-shrink-0 flex items-center justify-center text-content-tertiary border border-border-neutral shadow-sm p-3"
                      />
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <h4 className="font-black text-content-primary text-xl truncate tracking-tight max-w-[180px]">{app}</h4>
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
                    <div className="text-right space-y-1 flex-shrink-0 ml-4">
                      <p className="font-black text-content-primary text-xl">{formatTime(seconds)}</p>
                      <p className="text-[10px] text-sentiment-positive font-black uppercase tracking-widest bg-sentiment-positive/10 px-2 py-0.5 rounded-full inline-block">
                        Ativo
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="text-center py-4">
            <p className="text-content-tertiary text-sm font-bold">
              {sortedApps.length} {sortedApps.length === 1 ? 'aplicação' : 'aplicações'} · {formatTime(totalSeconds)} total
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Activities;
