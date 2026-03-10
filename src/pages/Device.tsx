import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Device } from '../types/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Battery, 
  Signal, 
  Wifi, 
  CheckCircle2, 
  X,
  Cpu,
  ShieldCheck,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const DevicePage = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showPairForm, setShowPairForm] = useState(false);
  
  // Form state
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');

  const fetchDevices = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      // 1. Check if device already exists (e.g. created by Python script)
      const { data: existingDevices, error: checkError } = await supabase
        .from('devices')
        .select('*')
        .eq('device_code', deviceCode);

      if (checkError) throw checkError;

      let newDevice: any = null;

      if (existingDevices && existingDevices.length > 0) {
        const existingDevice = existingDevices[0];

        // If already mine
        if (existingDevice.user_id === user.id) {
          throw new Error('Este dispositivo já está vinculado à sua conta.');
        }

        // If owned by someone else (and not null)
        if (existingDevice.user_id && existingDevice.user_id !== user.id) {
           throw new Error('Este código de dispositivo já está em uso por outro usuário.');
        }

        // Claim device (update owner)
        console.log('Attempting to update device:', existingDevice.id);
        const { data: updatedDevice, error: updateError } = await supabase
          .from('devices')
          .update({ 
            user_id: user.id, 
            name: deviceName || existingDevice.name || 'My FocusBuddy' 
          })
          .eq('id', existingDevice.id)
          .select()
          .single();
        
        console.log('Update result:', { updatedDevice, updateError });
        
        if (updateError) {
          console.error('Update failed, trying to delete and recreate');
          // Fallback: Delete and recreate if we can
          await supabase.from('devices').delete().eq('id', existingDevice.id);
          
          const { data: newDevice, error: insertError } = await supabase
            .from('devices')
            .insert([
              {
                id: existingDevice.id, // Try to reuse the ID
                user_id: user.id,
                device_code: deviceCode,
                name: deviceName || 'My FocusBuddy'
              }
            ])
            .select();

          if (insertError) {
            console.error('Insert failed:', insertError);
            throw new Error('Não foi possível vincular o dispositivo. Erro: ' + insertError.message);
          }
          newDevice = newDevice[0];
        }
        newDevice = updatedDevice;

      } else {
        // 2. Create new device
        const { data, error } = await supabase
          .from('devices')
          .insert([
            {
              user_id: user.id,
              device_code: deviceCode,
              name: deviceName || 'My FocusBuddy'
            }
          ])
          .select();

        if (error) throw error;
        newDevice = data[0];

        // Note: device_state will be created by the Python script
      }

      setDevices([...devices, newDevice]);
      setShowPairForm(false);
      setDeviceCode('');
      setDeviceName('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao parear dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este dispositivo? Todos os dados vinculados a ele serão perdidos.')) return;

    try {
      // Delete dependent records first to avoid foreign key violations
      await supabase.from('device_state').delete().eq('device_id', id);
      await supabase.from('productivity_logs').delete().eq('device_id', id);

      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDevices(devices.filter(d => d.id !== id));
    } catch (err: any) {
      console.error('Error deleting device:', err);
      alert('Erro ao excluir dispositivo: ' + err.message);
    }
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
      className="space-y-8 pb-12 max-w-lg mx-auto"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-4xl font-black text-content-primary tracking-tighter">Dispositivos</h2>
          <p className="text-content-secondary font-medium mt-1">Gerenciamento do hardware FocusBuddy</p>
        </div>
        <button 
          onClick={fetchDevices}
          className={`p-4 rounded-2xl bg-background-elevated border border-border-neutral text-content-tertiary hover:text-interactive-primary hover:bg-interactive-accent/20 transition-all shadow-sm ${fetching ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={22} />
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {showPairForm ? (
          <motion.div 
            key="pair-form"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-background-elevated p-8 space-y-8 rounded-[40px] shadow-2xl shadow-black/10 relative overflow-hidden border border-white/50 dark:border-white/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-interactive-accent/20 rounded-full -mr-16 -mt-16 opacity-50" />
            
            <div className="flex items-center justify-between relative">
              <h3 className="text-2xl font-black text-content-primary tracking-tight">Parear Novo Dispositivo</h3>
              <button 
                onClick={() => setShowPairForm(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-background-neutral text-content-tertiary hover:text-content-primary transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handlePair} className="space-y-6 relative">
              <div className="space-y-2">
                <label className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Código do Dispositivo</label>
                <input 
                  type="text" 
                  required 
                  placeholder="ex: FB-123456" 
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  className="w-full px-6 py-5 bg-background-neutral/50 border-2 border-transparent rounded-[24px] focus:border-interactive-accent focus:bg-background-elevated transition-all outline-none font-mono font-bold text-xl tracking-widest uppercase placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Nome Amigável</label>
                <input 
                  type="text" 
                  placeholder="ex: Mesa do Escritório" 
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-6 py-5 bg-background-neutral/50 border-2 border-transparent rounded-[24px] focus:border-interactive-accent focus:bg-background-elevated transition-all outline-none font-bold text-lg placeholder:font-medium"
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-sentiment-negative/10 text-sentiment-negative text-xs font-bold border border-sentiment-negative/20"
                >
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="relative overflow-hidden shimmer-effect w-full py-5 text-lg rounded-full font-black text-center transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2 bg-interactive-accent text-content-primary hover:bg-bright-green shadow-xl shadow-interactive-accent/20"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-content-primary/30 border-t-content-primary rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirmar Conexão</span>
                    <CheckCircle2 size={24} strokeWidth={3} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.button
            variants={itemVariants}
            key="pair-button"
            onClick={() => setShowPairForm(true)}
            className="relative overflow-hidden shimmer-effect w-full bg-background-elevated p-8 flex items-center justify-between group hover:border-interactive-accent/50 transition-all border-dashed border-2 border-border-neutral rounded-[40px] shadow-lg shadow-black/5"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[28px] bg-interactive-accent/20 text-interactive-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <Plus size={40} strokeWidth={3} />
              </div>
              <div className="text-left space-y-1">
                <h3 className="font-black text-content-primary text-2xl tracking-tight">Adicionar Novo Dispositivo</h3>
                <p className="text-xs text-content-tertiary font-bold uppercase tracking-widest">Parear outro rastreador FocusBuddy</p>
              </div>
            </div>
            <div className="w-14 h-14 rounded-full bg-background-neutral flex items-center justify-center text-content-tertiary group-hover:bg-interactive-accent group-hover:text-content-primary transition-all duration-300">
              <ChevronRight size={28} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className="space-y-6">
        <h3 className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Hardware Conectado</h3>
        
        {fetching && devices.length === 0 ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="h-48 bg-background-elevated rounded-[40px] animate-pulse border border-border-neutral shadow-sm" />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-background-elevated p-16 flex flex-col items-center justify-center text-center space-y-6 rounded-[40px] shadow-lg shadow-black/5 border border-white/50 dark:border-white/5">
            <div className="w-24 h-24 rounded-3xl bg-background-neutral flex items-center justify-center text-content-tertiary border border-border-neutral shadow-inner">
              <Smartphone size={40} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-content-primary text-xl">Nenhum dispositivo encontrado</h4>
              <p className="text-sm text-content-secondary max-w-[240px] mx-auto font-medium">Pareie um dispositivo para iniciar o monitoramento das suas sessões de foco em tempo real.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {devices.map((device, index) => (
              <motion.div 
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-background-elevated p-8 space-y-8 group hover:border-interactive-accent/50 relative overflow-hidden rounded-[40px] shadow-lg shadow-black/5 border border-white/50 dark:border-white/5"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-interactive-accent/20 rounded-full -mr-16 -mt-16 opacity-30 transition-transform group-hover:scale-110" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between relative gap-6">
                  <div className="flex items-center gap-4 sm:gap-6 w-full pr-12 sm:pr-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] sm:rounded-[28px] bg-background-screen text-interactive-primary flex items-center justify-center border border-border-neutral shadow-sm group-hover:scale-110 transition-transform shrink-0">
                      <Cpu size={32} className="sm:w-10 sm:h-10" />
                    </div>
                    <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
                      <h4 className="font-black text-content-primary text-xl sm:text-2xl tracking-tight truncate">{device.name}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-content-tertiary uppercase tracking-widest bg-background-neutral px-2 py-0.5 rounded-md truncate max-w-[120px]">
                          ID: {device.device_code}
                        </span>
                        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-border-neutral" />
                        <span className="text-[10px] font-bold text-sentiment-positive uppercase tracking-widest flex items-center gap-1 bg-sentiment-positive/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <ShieldCheck size={12} />
                          Verificado
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(device.id)}
                    className="absolute top-0 right-0 sm:relative p-3 sm:p-4 rounded-2xl bg-background-neutral text-content-tertiary hover:text-sentiment-negative hover:bg-sentiment-negative/10 transition-all"
                  >
                    <Trash2 size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 relative z-10">
                  {[
                    { icon: Battery, value: '85%', label: 'Bateria', color: 'text-sentiment-positive', bg: 'bg-sentiment-positive/10' },
                    { icon: Signal, value: 'Forte', label: 'Sinal', color: 'text-interactive-primary', bg: 'bg-interactive-accent/20' },
                    { icon: RefreshCw, value: 'Ativo', label: 'Status', color: 'text-interactive-primary', bg: 'bg-interactive-accent/20' }
                  ].map((stat) => (
                    <div key={stat.label} className={`flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 rounded-[20px] sm:rounded-[24px] ${stat.bg} flex-grow md:flex-grow-0 border border-transparent hover:border-white/50 transition-all min-w-[140px]`}>
                      <stat.icon size={20} className={`${stat.color} sm:w-6 sm:h-6`} />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">{stat.label}</p>
                        <p className="font-black text-content-primary text-base sm:text-lg">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DevicePage;
