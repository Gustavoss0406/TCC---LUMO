import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProductivityLog } from '../types/supabase';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock, 
  ChevronDown, 
  BarChart3,
  CalendarDays,
  CalendarRange,
  History as HistoryIcon,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

const History = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ProductivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const fetchData = async (showSync = false) => {
    if (!user) return;
    if (showSync) setFetching(true);
    
    try {
      const { data: devices } = await supabase
        .from('devices')
        .select('id, device_code')
        .eq('user_id', user.id)
        .limit(1);

      if (devices && devices.length > 0) {
        const deviceCode = devices[0].device_code;
        const deviceId = devices[0].id;
        console.log('History deviceCode:', deviceCode);
        
        const { data: history, error: historyError } = await supabase
          .from('productivity_logs')
          .select('*')
          .eq('device_code', deviceCode)
          .order('date', { ascending: true })
          .limit(30);

        if (historyError) {
          console.error('Error fetching history:', historyError);
        }

        console.log('History logs:', history);

        if (history) {
          setLogs(history);
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
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

  const chartData = logs.map(log => ({
    date: new Date(log.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
    score: log.productivity || 0,
    productive: Math.round((log.productive_time || 0) / 3600 * 10) / 10,
  }));

  const avgScore = logs.length > 0 
    ? Math.round(logs.reduce((acc, curr) => acc + (curr.productivity || 0), 0) / logs.length)
    : 0;

  const validLogs = logs.filter(log => log.productivity != null);
  const bestDay = validLogs.length > 0
    ? validLogs.sort((a, b) => (b.productivity || 0) - (a.productivity || 0))[0]
    : null;

  const totalFocusTime = logs.reduce((acc, curr) => acc + (curr.productive_time || 0), 0);
  const avgFocusTime = logs.length > 0 ? totalFocusTime / logs.length : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12 max-w-lg mx-auto"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-4xl font-black text-content-primary tracking-tighter">Desempenho</h2>
          <p className="text-content-secondary font-medium mt-1">Tendências e insights de produtividade</p>
        </div>
        <button 
          onClick={() => fetchData(true)}
          disabled={fetching}
          className={`relative overflow-hidden shimmer-effect p-4 rounded-2xl bg-background-elevated border border-border-neutral text-content-tertiary hover:text-interactive-primary hover:bg-interactive-accent/20 transition-all shadow-sm ${fetching ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={22} />
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-2 bg-background-elevated p-2 rounded-[32px] border border-border-neutral shadow-sm">
        {[
          { id: 'daily', label: 'Diário', icon: CalendarDays },
          { id: 'weekly', label: 'Semanal', icon: CalendarRange },
          { id: 'monthly', label: 'Mensal', icon: HistoryIcon }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className={`flex-1 py-4 rounded-[24px] transition-all flex items-center justify-center gap-2 relative overflow-hidden group ${
              view === item.id 
                ? 'text-interactive-primary' 
                : 'text-content-tertiary hover:text-content-primary'
            }`}
          >
            {view === item.id && (
              <motion.div
                layoutId="view-pill"
                className="absolute inset-0 bg-interactive-accent shadow-lg shadow-interactive-accent/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon size={20} className="relative z-10" />
            <span className="text-sm font-black capitalize relative z-10 tracking-wide">{item.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          variants={itemVariants}
          className="col-span-2 bg-interactive-primary text-white p-8 rounded-[40px] shadow-xl shadow-interactive-primary/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-interactive-accent/20 rounded-full -ml-10 -mb-10 blur-2xl group-hover:scale-125 transition-transform duration-700" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <Award size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Melhor Desempenho</span>
              </div>
              <h3 className="text-5xl font-black tracking-tighter mb-1">
                {bestDay ? new Date(bestDay.date).toLocaleDateString('pt-BR', { weekday: 'long' }) : 'N/A'}
              </h3>
              <p className="text-lg font-medium opacity-90">
                {bestDay ? `Maior pontuação de ${Math.round(bestDay.productivity)}` : 'Sem dados ainda'}
              </p>
            </div>
            <div className="w-16 h-16 rounded-[24px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg">
              <TrendingUp size={32} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bg-bright-yellow dark:bg-gradient-to-br dark:from-yellow-900/40 dark:to-orange-900/40 dark:border-yellow-500/20 p-6 rounded-[40px] shadow-xl shadow-bright-yellow/20 dark:shadow-yellow-900/20 border-4 border-white dark:border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-transform"
        >
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp size={120} className="text-content-primary dark:text-white/20" />
          </div>
          
          <div className="flex flex-col h-full justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/30 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center text-content-primary dark:text-white">
                <BarChart3 size={20} />
              </div>
              <span className="text-xs font-black text-content-primary dark:text-white uppercase tracking-widest">Média de Pontuação</span>
            </div>
            
            <div>
              <h3 className="text-5xl font-black text-content-primary dark:text-white tracking-tighter leading-none">{avgScore}</h3>
              <p className="text-content-primary dark:text-white/80 font-bold text-sm mt-1 flex items-center gap-1 opacity-80">
                <TrendingUp size={14} /> +5.2%
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bg-bright-blue dark:bg-gradient-to-br dark:from-cyan-900/40 dark:to-blue-900/40 dark:border-cyan-500/20 p-6 rounded-[40px] shadow-xl shadow-bright-blue/20 dark:shadow-cyan-900/20 border-4 border-white dark:border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-transform"
        >
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <Clock size={120} className="text-content-primary dark:text-white/20" />
          </div>
          
          <div className="flex flex-col h-full justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/30 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center text-content-primary dark:text-white">
                <Clock size={20} />
              </div>
              <span className="text-xs font-black text-content-primary dark:text-white uppercase tracking-widest">Média de Foco</span>
            </div>
            
            <div>
              <h3 className="text-5xl font-black text-content-primary dark:text-white tracking-tighter leading-none">
                {Math.round(avgFocusTime / 3600 * 10) / 10}<span className="text-2xl ml-1">h</span>
              </h3>
              <p className="text-content-primary dark:text-white/80 font-bold text-sm mt-1 opacity-80">Média diária</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Chart */}
      <motion.div 
        variants={itemVariants}
        className="bg-background-elevated p-8 space-y-8 relative overflow-hidden rounded-[40px] shadow-xl shadow-black/5 border border-white/50 dark:border-white/5"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-interactive-accent/20 rounded-full -mr-16 -mt-16 opacity-50" />
        
        <div className="flex items-center justify-between relative">
          <div>
            <h3 className="font-black text-content-primary text-2xl tracking-tight">Tendência de Produtividade</h3>
            <p className="text-sm text-content-secondary font-medium mt-1">Histórico de pontuação dos últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-2 bg-interactive-accent/20 px-4 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-interactive-primary" />
            <span className="text-xs font-black text-interactive-primary uppercase tracking-widest">Pontuação</span>
          </div>
        </div>

        <div className="h-72 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F3D0C" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#0F3D0C" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9B9B9B', fontSize: 11, fontWeight: 600 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9B9B9B', fontSize: 11, fontWeight: 600 }}
                domain={[0, 100]}
                dx={-10}
              />
              <Tooltip 
                cursor={{ stroke: '#0F3D0C', strokeWidth: 2, strokeDasharray: '5 5' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  padding: '12px 16px'
                }}
                itemStyle={{ fontSize: '14px', fontWeight: 'bold', color: '#1A1C1E' }}
                labelStyle={{ fontSize: '11px', color: '#9B9B9B', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.05em' }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#0F3D0C" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorScore)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default History;
