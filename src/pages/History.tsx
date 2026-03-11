import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Award,
  Clock,
  BarChart3,
  CalendarDays,
  CalendarRange,
  History as HistoryIcon,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface DayData {
  label: string;
  date: string;
  score: number;
  productiveSeconds: number;
  neutralSeconds: number;
  distractingSeconds: number;
}

const History = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [chartData, setChartData] = useState<DayData[]>([]);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const fetchData = async (showSync = false) => {
    if (!user) return;
    if (showSync) setFetching(true);

    try {
      // 1. Buscar dispositivos do user
      const { data: devices } = await supabase
        .from('devices')
        .select('id, device_code')
        .eq('user_id', user.id);

      if (!devices || devices.length === 0) {
        setChartData([]);
        return;
      }

      const deviceIds = devices.map(d => d.id);
      const deviceCodes = devices.map(d => d.device_code);

      // 2. Calcular range de datas
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      let daysBack = 7;
      if (view === 'daily') daysBack = 1;
      else if (view === 'monthly') daysBack = 30;

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateStr = startDate.toISOString().split('T')[0];

      // 3. Buscar productivity_logs (dados históricos por hora, agregados por dia)
      const { data: logs } = await supabase
        .from('productivity_logs')
        .select('*')
        .in('device_code', deviceCodes)
        .gte('date', startDateStr)
        .lte('date', todayStr)
        .order('date', { ascending: true });

      // 4. Buscar device_state (dados em tempo real de hoje)
      const { data: deviceState } = await supabase
        .from('device_state')
        .select('*')
        .in('device_id', deviceIds)
        .order('last_sync', { ascending: false })
        .limit(1)
        .single();

      // 5. Agregar por dia
      const dailyMap: Record<string, {
        scores: number[];
        prodTotal: number;
        neutTotal: number;
        distTotal: number;
        entries: number;
      }> = {};

      // Processar logs
      if (logs && logs.length > 0) {
        for (const log of logs) {
          const dateStr = log.date;
          if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { scores: [], prodTotal: 0, neutTotal: 0, distTotal: 0, entries: 0 };
          }
          const d = dailyMap[dateStr];
          const score = log.productivity_score ?? 0;
          d.scores.push(score);
          d.prodTotal += log.productive_time || 0;
          d.neutTotal += log.neutral_time || 0;
          d.distTotal += log.distracting_time || 0;
          d.entries += 1;
        }
      }

      // Adicionar/atualizar com device_state de hoje
      if (deviceState && deviceState.last_sync) {
        const stateDate = new Date(deviceState.last_sync).toISOString().split('T')[0];
        if (stateDate === todayStr) {
          if (!dailyMap[todayStr]) {
            dailyMap[todayStr] = { scores: [], prodTotal: 0, neutTotal: 0, distTotal: 0, entries: 0 };
          }
          const d = dailyMap[todayStr];

          // device_state tem os totais diários — usar o maior
          d.prodTotal = Math.max(d.prodTotal, deviceState.productive_time || 0);
          d.neutTotal = Math.max(d.neutTotal, deviceState.neutral_time || 0);
          d.distTotal = Math.max(d.distTotal, deviceState.distracting_time || 0);

          // Calcular score do device_state
          const activeTime = (deviceState.productive_time || 0) + (deviceState.distracting_time || 0);
          const liveScore = activeTime > 0
            ? Math.round((deviceState.productive_time || 0) / activeTime * 100)
            : deviceState.productivity || 0;

          if (d.scores.length === 0) {
            d.scores.push(liveScore);
          } else {
            // Substituir a média com o score real do dia
            d.scores = [liveScore];
          }
          d.entries = Math.max(d.entries, 1);
        }
      }

      // 6. Converter para array de chart data
      const result: DayData[] = [];

      if (view === 'daily') {
        // Para view diário: buscar hourly_logs se existir
        const { data: hourlyLogs } = await supabase
          .from('hourly_logs')
          .select('*')
          .in('device_code', deviceCodes)
          .eq('date', todayStr)
          .order('hour', { ascending: true });

        if (hourlyLogs && hourlyLogs.length > 0) {
          for (const hl of hourlyLogs) {
            const hour = hl.hour ?? 0;
            const activeTime = (hl.productive_time || 0) + (hl.distracting_time || 0);
            const score = activeTime > 0
              ? Math.round((hl.productive_time || 0) / activeTime * 100)
              : (hl.productivity || 0);

            result.push({
              label: `${String(hour).padStart(2, '0')}:00`,
              date: todayStr,
              score: Math.round(score),
              productiveSeconds: hl.productive_time || 0,
              neutralSeconds: hl.neutral_time || 0,
              distractingSeconds: hl.distracting_time || 0,
            });
          }
        }

        // Se não tem hourly_logs, tentar productivity_logs de hoje
        if (result.length === 0 && dailyMap[todayStr]) {
          const d = dailyMap[todayStr];
          const avgScore = d.scores.length > 0
            ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length)
            : 0;

          result.push({
            label: 'Hoje',
            date: todayStr,
            score: avgScore,
            productiveSeconds: d.prodTotal,
            neutralSeconds: d.neutTotal,
            distractingSeconds: d.distTotal,
          });
        }
      } else {
        // Gerar lista de todos os dias no range
        const cursor = new Date(startDate);
        while (cursor <= today) {
          const dateStr = cursor.toISOString().split('T')[0];
          const d = dailyMap[dateStr];

          const dayLabel = view === 'weekly'
            ? cursor.toLocaleDateString('pt-BR', { weekday: 'short' })
            : `${cursor.getDate()}/${cursor.getMonth() + 1}`;

          if (d) {
            const avgScore = d.scores.length > 0
              ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length)
              : 0;

            result.push({
              label: dayLabel,
              date: dateStr,
              score: avgScore,
              productiveSeconds: d.prodTotal,
              neutralSeconds: d.neutTotal,
              distractingSeconds: d.distTotal,
            });
          } else {
            result.push({
              label: dayLabel,
              date: dateStr,
              score: 0,
              productiveSeconds: 0,
              neutralSeconds: 0,
              distractingSeconds: 0,
            });
          }

          cursor.setDate(cursor.getDate() + 1);
        }
      }

      setChartData(result);

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
    setLoading(true);
    fetchData();
  }, [user, view]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-interactive-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Computed stats ──

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${seconds}s`;
  };

  const daysWithData = chartData.filter(d => d.score > 0);

  const avgScore = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.score, 0) / daysWithData.length)
    : 0;

  const bestDay = daysWithData.length > 0
    ? daysWithData.reduce((max, d) => d.score > max.score ? d : max)
    : null;

  const totalProdSeconds = chartData.reduce((sum, d) => sum + d.productiveSeconds, 0);
  const activeDays = Math.max(daysWithData.length, 1);
  const avgFocusSeconds = totalProdSeconds / activeDays;

  // Chart tooltip
  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as DayData;

    return (
      <div className={`px-4 py-3 rounded-2xl shadow-xl border ${
        isDark
          ? 'bg-[#1c1c24] border-white/10 text-white'
          : 'bg-white border-gray-100 text-gray-900'
      }`}>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">{label}</p>
        <p className="text-lg font-black">{data.score}% produtividade</p>
        <p className="text-xs opacity-60 font-medium mt-1">
          {formatTime(data.productiveSeconds)} produtivo · {formatTime(data.distractingSeconds)} distração
        </p>
      </div>
    );
  };

  // Chart colors
  const strokeColor = isDark ? '#22c55e' : '#0F3D0C';
  const gradientStart = isDark ? 'rgba(34,197,94,0.2)' : 'rgba(15,61,12,0.15)';
  const gradientEnd = isDark ? 'rgba(34,197,94,0)' : 'rgba(15,61,12,0)';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#E0E0E0';
  const tickColor = isDark ? '#64748b' : '#9B9B9B';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
      {/* Header */}
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

      {/* View Selector */}
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
        {/* Best Performance */}
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
                {bestDay ? bestDay.label : 'N/A'}
              </h3>
              <p className="text-lg font-medium opacity-90">
                {bestDay ? `Maior pontuação: ${bestDay.score}%` : 'Sem dados ainda'}
              </p>
              {bestDay && (
                <p className="text-sm opacity-70 mt-1">
                  {formatTime(bestDay.productiveSeconds)} de foco
                </p>
              )}
            </div>
            <div className="w-16 h-16 rounded-[24px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg">
              <TrendingUp size={32} />
            </div>
          </div>
        </motion.div>

        {/* Avg Score */}
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
              <span className="text-xs font-black text-content-primary dark:text-white uppercase tracking-widest">Média</span>
            </div>

            <div className="mt-4">
              <h3 className="text-5xl font-black text-content-primary dark:text-white tracking-tighter leading-none">
                {avgScore}<span className="text-2xl ml-1">%</span>
              </h3>
              <p className="text-content-primary dark:text-white/80 font-bold text-sm mt-1 opacity-80">
                {daysWithData.length} {daysWithData.length === 1 ? 'dia' : 'dias'} com dados
              </p>
            </div>
          </div>
        </motion.div>

        {/* Avg Focus Time */}
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
              <span className="text-xs font-black text-content-primary dark:text-white uppercase tracking-widest">Foco</span>
            </div>

            <div className="mt-4">
              <h3 className="text-5xl font-black text-content-primary dark:text-white tracking-tighter leading-none">
                {formatTime(Math.round(avgFocusSeconds))}
              </h3>
              <p className="text-content-primary dark:text-white/80 font-bold text-sm mt-1 opacity-80">
                Média {view === 'daily' ? 'por hora' : 'diária'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chart */}
      <motion.div
        variants={itemVariants}
        className="bg-background-elevated p-8 space-y-8 relative overflow-hidden rounded-[40px] shadow-xl shadow-black/5 border border-white/50 dark:border-white/5"
      >
        <div className="flex items-center justify-between relative">
          <div>
            <h3 className="font-black text-content-primary text-2xl tracking-tight">Tendência de Produtividade</h3>
            <p className="text-sm text-content-secondary font-medium mt-1">
              {view === 'daily' && 'Histórico de pontuação de hoje'}
              {view === 'weekly' && 'Histórico dos últimos 7 dias'}
              {view === 'monthly' && 'Histórico dos últimos 30 dias'}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-interactive-accent/20 px-4 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-interactive-primary" />
            <span className="text-xs font-black text-interactive-primary uppercase tracking-widest">Score</span>
          </div>
        </div>

        {chartData.length === 0 || daysWithData.length === 0 ? (
          <div className="h-72 flex items-center justify-center">
            <div className="text-center space-y-3">
              <BarChart3 size={48} className="mx-auto text-content-tertiary" />
              <p className="text-content-secondary font-bold">Sem dados para este período</p>
              <p className="text-content-tertiary text-sm">Use o tracker para gerar dados de produtividade</p>
            </div>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gradientStart} stopOpacity={1} />
                    <stop offset="95%" stopColor={gradientEnd} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={gridColor}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }}
                  dy={10}
                  interval={view === 'monthly' ? 4 : 0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={renderTooltip} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={strokeColor}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  dot={{ fill: strokeColor, strokeWidth: 2, r: 4, stroke: isDark ? '#141418' : '#fff' }}
                  activeDot={{ r: 6, fill: strokeColor, stroke: isDark ? '#141418' : '#fff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Daily breakdown table */}
      {daysWithData.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-background-elevated rounded-[40px] shadow-xl shadow-black/5 border border-white/50 dark:border-white/5 overflow-hidden"
        >
          <div className="p-6 pb-2">
            <h3 className="font-black text-content-primary text-xl tracking-tight">Detalhamento</h3>
          </div>

          {chartData
            .filter(d => d.score > 0)
            .reverse()
            .map((day, index, arr) => (
              <div
                key={day.date + day.label}
                className={`px-6 py-5 flex items-center justify-between ${
                  index !== arr.length - 1 ? 'border-b border-border-neutral/50' : ''
                }`}
              >
                <div className="space-y-1">
                  <p className="font-bold text-content-primary text-base">{day.label}</p>
                  <p className="text-xs text-content-tertiary font-medium">
                    {formatTime(day.productiveSeconds)} foco · {formatTime(day.distractingSeconds)} distração
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className={`text-2xl font-black tracking-tight ${
                    day.score >= 75 ? 'text-sentiment-positive' :
                    day.score >= 50 ? 'text-sentiment-warning' :
                    'text-sentiment-negative'
                  }`}>
                    {day.score}%
                  </p>
                  <div className="w-20 h-1.5 bg-background-neutral rounded-full overflow-hidden ml-auto">
                    <div
                      className={`h-full rounded-full ${
                        day.score >= 75 ? 'bg-sentiment-positive' :
                        day.score >= 50 ? 'bg-sentiment-warning' :
                        'bg-sentiment-negative'
                      }`}
                      style={{ width: `${day.score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </motion.div>
      )}

      {/* Summary */}
      {daysWithData.length > 0 && (
        <motion.div variants={itemVariants} className="text-center py-4">
          <p className="text-content-tertiary text-sm font-bold">
            {daysWithData.length} {daysWithData.length === 1 ? 'dia' : 'dias'} registrados · {formatTime(totalProdSeconds)} total de foco
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default History;
