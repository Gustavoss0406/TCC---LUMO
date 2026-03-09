import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DeviceState } from '../types/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Coffee, 
  Monitor, 
  Smile, 
  Frown, 
  Battery, 
  Wifi, 
  Clock, 
  TrendingUp,
  ChevronRight,
  Target,
  Brain
} from 'lucide-react';

const Dashboard = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { user } = useAuth();
  const [state, setState] = useState<DeviceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async (showSync = false) => {
    if (!user) return;
    if (showSync) setSyncing(true);
    
    try {
      const { data: devices } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (devices && devices.length > 0) {
        const deviceId = devices[0].id;
        
        const { data: deviceState } = await supabase
          .from('device_state')
          .select('*')
          .eq('device_id', deviceId)
          .single();

        if (deviceState) {
          setState(deviceState);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      if (showSync) {
        setTimeout(() => setSyncing(false), 1000);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-interactive-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="bg-background-elevated p-12 text-center space-y-6 rounded-[32px] shadow-lg shadow-black/5">
        <div className="w-24 h-24 bg-background-neutral rounded-full flex items-center justify-center mx-auto text-content-tertiary border border-border-neutral">
          <Monitor size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-content-primary">Nenhum Dispositivo Conectado</h2>
          <p className="text-content-secondary max-w-xs mx-auto font-medium">
            Pareie seu hardware FocusBuddy para iniciar o monitoramento em tempo real.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab('device')}
          className="px-8 py-3 rounded-full font-bold text-center transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2 bg-interactive-primary text-white hover:bg-forest-green shadow-lg shadow-interactive-accent/30"
        >
          Parear Dispositivo Agora
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number | undefined | null) => {
    const s = seconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getCharacterIcon = () => {
    const score = state.productivity;
    let gifUrl = '';
    
    if (score >= 80) gifUrl = 'https://i.imgur.com/qQ1JEPb.gif';
    else if (score >= 60) gifUrl = 'https://i.imgur.com/80cHdDZ.gif';
    else if (score >= 40) gifUrl = 'https://i.imgur.com/avTauhm.gif';
    else if (score >= 20) gifUrl = 'https://i.imgur.com/xmwrpgB.gif';
    else gifUrl = 'https://i.imgur.com/PNzWixv.gif';

    return (
      <img 
        src={gifUrl} 
        alt="Mascot" 
        className="w-full h-full object-contain rounded-[32px]"
        referrerPolicy="no-referrer"
      />
    );
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Estável';
    return 'Crítico';
  };

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
      className="space-y-6 pb-24 max-w-lg mx-auto"
    >
      {/* Top Section: Large Mascot */}
      <motion.div variants={itemVariants} className="flex flex-col items-center justify-center pt-8 pb-4 relative">
        <div className="relative w-80 h-80 flex items-center justify-center mb-2">
          {getCharacterIcon()}
        </div>
        
        <div className="w-full flex justify-center px-10 relative z-10">
          <span className="normal-case font-bold bg-background-elevated/50 backdrop-blur-sm px-4 py-1.5 rounded-full text-content-primary border border-white/50 shadow-sm text-sm">
            Estado do Buddy: <span className="text-interactive-primary">{getScoreLabel(state.productivity)}</span>
          </span>
        </div>
      </motion.div>

      {/* Score Card */}
      <motion.div 
        variants={itemVariants}
        className="bg-background-elevated p-8 flex flex-col items-center text-center relative overflow-hidden group rounded-[40px] shadow-xl shadow-black/5 border border-white"
      >
        <span className="text-content-tertiary text-xs font-black uppercase tracking-widest mb-2">
          Índice de Produtividade Atual
        </span>
        <div className="flex items-center justify-center gap-1 mb-6">
          <span className="text-8xl font-black text-content-primary tracking-tighter leading-none">
            {Math.round(state.productivity)}
          </span>
          <span className="text-4xl font-black text-content-tertiary self-start mt-2">%</span>
        </div>
        
        <div className="flex gap-3 w-full">
          <div className={`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm ${
            state.productivity >= 60 ? 'bg-sentiment-positive/10 text-sentiment-positive' : 'bg-sentiment-warning/10 text-sentiment-warning'
          }`}>
            <TrendingUp size={18} />
            <span>Top 15% Hoje</span>
          </div>
          <button 
            onClick={() => fetchData(true)}
            disabled={syncing}
            className={`relative overflow-hidden shimmer-effect flex-1 py-3 px-4 rounded-2xl bg-interactive-accent text-content-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-bright-green transition-colors ${syncing ? 'animate-spin' : ''}`}
          >
            <Zap size={18} fill="currentColor" />
            <span>Sincronizar</span>
          </button>
        </div>
      </motion.div>

      {/* Detailed Stats */}
      <motion.div variants={itemVariants} className="bg-background-elevated p-6 space-y-8 rounded-[40px] shadow-xl shadow-black/5 border border-white">
        <div className="space-y-6">
          {[
            { label: 'Sessões de Foco', status: 'Excelente', color: 'text-sentiment-positive', value: '95%', sub: '1 perdida', target: 'activities' },
            { label: 'Uso do Tempo', status: 'Razoável', color: 'text-sentiment-warning', value: formatTime(state.productive_time), sub: '-15%', subColor: 'text-sentiment-warning', target: 'history' },
            { label: 'Sequência', status: 'Bom', color: 'text-sentiment-positive', value: '8 dias', sub: null, target: null }
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              <div 
                onClick={() => stat.target && setActiveTab(stat.target)}
                className={`flex items-center justify-between group py-1 ${stat.target ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-content-primary text-lg">{stat.label}</h4>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${stat.color}`}>{stat.status}</p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="space-y-0.5">
                    <p className="font-black text-content-primary text-2xl tracking-tight">{stat.value}</p>
                    {stat.sub && <p className={`text-[10px] font-bold ${stat.subColor || 'text-content-tertiary'}`}>{stat.sub}</p>}
                  </div>
                  {stat.target && (
                    <div className="w-10 h-10 rounded-full bg-background-neutral flex items-center justify-center text-content-tertiary group-hover:bg-interactive-accent group-hover:text-content-primary transition-all duration-300">
                      <ChevronRight size={20} />
                    </div>
                  )}
                </div>
              </div>
              {i < 2 && <div className="h-px bg-border-neutral/50" />}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* Activity Breakdown */}
      <motion.div variants={itemVariants} className="bg-background-elevated p-8 space-y-8 relative overflow-hidden rounded-[40px] shadow-xl shadow-black/5 border border-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-content-primary text-2xl tracking-tight">Uso de Atividades</h3>
            <p className="text-sm text-content-secondary font-medium mt-1">Análise diária de produtividade</p>
          </div>
          <div className="px-4 py-1.5 bg-interactive-accent/20 text-interactive-primary rounded-full text-xs font-black uppercase tracking-wide">
            24h
          </div>
        </div>
        
        <div className="space-y-8">
          {[
            { label: 'Produtivo', time: state.productive_time, color: 'bg-interactive-primary', icon: Target },
            { label: 'Neutro', time: state.neutral_time, color: 'bg-sentiment-warning', icon: Coffee },
            { label: 'Distração', time: state.distracting_time, color: 'bg-sentiment-negative', icon: Brain }
          ].map((item) => {
            const total = state.productive_time + state.neutral_time + state.distracting_time;
            const percentage = total > 0 ? (item.time / total) * 100 : 0;
            
            return (
              <div key={item.label} className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${item.color.replace('bg-', 'bg-')}/10 ${item.color.replace('bg-', 'text-')}`}>
                      <item.icon size={20} />
                    </div>
                    <span className="text-content-primary font-bold text-lg">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-content-primary font-black text-xl">{formatTime(item.time)}</p>
                    <p className="text-[10px] text-content-tertiary font-black uppercase">{Math.round(percentage)}%</p>
                  </div>
                </div>
                <div className="w-full h-4 bg-background-neutral rounded-full overflow-hidden p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full ${item.color} rounded-full shadow-sm`} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
