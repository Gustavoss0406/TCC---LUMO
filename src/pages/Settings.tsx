import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  LogOut, 
  ChevronRight, 
  Smartphone,
  Info
} from 'lucide-react';
import ProfileModal from '../components/ProfileModal';
import { NotificationsModal, AppearanceModal, PrivacyModal, AboutModal } from '../components/SettingsModals';

const Settings = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { user, signOut } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const menuItems = [
    { id: 'profile', label: 'Configurações do Perfil', icon: User, color: 'text-interactive-primary', bg: 'bg-interactive-accent/20', action: () => setShowProfileModal(true) },
    { id: 'notifications', label: 'Notificações', icon: Bell, color: 'text-sentiment-warning', bg: 'bg-sentiment-warning/10', action: () => setActiveModal('notifications') },
    { id: 'appearance', label: 'Aparência', icon: Palette, color: 'text-dark-purple', bg: 'bg-dark-purple/10', action: () => setActiveModal('appearance') },
    { id: 'privacy', label: 'Privacidade e Segurança', icon: Shield, color: 'text-sentiment-positive', bg: 'bg-sentiment-positive/10', action: () => setActiveModal('privacy') },
    { id: 'devices', label: 'Gerenciamento de Dispositivos', icon: Smartphone, color: 'text-interactive-primary', bg: 'bg-interactive-accent/20', action: () => setActiveTab('device') },
    { id: 'about', label: 'Sobre o FocusBuddy', icon: Info, color: 'text-content-tertiary', bg: 'bg-background-neutral', action: () => setActiveModal('about') },
  ];

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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } }
  };

  return (
    <>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8 max-w-lg mx-auto pb-12"
      >
        {/* Profile Header */}
        <motion.div variants={itemVariants} className="bg-background-elevated p-10 flex flex-col items-center text-center space-y-6 relative overflow-hidden rounded-[40px] shadow-2xl shadow-black/10 border border-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-interactive-accent/20 rounded-full -mr-16 -mt-16 opacity-50" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-interactive-accent/20 rounded-full -ml-12 -mb-12 opacity-30" />
          
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-interactive-primary rounded-full border-4 border-white flex items-center justify-center text-white z-20 shadow-lg">
              <User size={20} fill="currentColor" />
            </div>
          </div>

          <div className="space-y-1 relative z-10">
            <h2 className="text-4xl font-black text-content-primary tracking-tighter">{user?.user_metadata?.full_name || 'Usuário'}</h2>
            <p className="text-content-secondary font-medium text-lg">{user?.email}</p>
          </div>

          <div className="px-6 py-2 rounded-full bg-interactive-accent/20 text-interactive-primary text-xs font-black uppercase tracking-widest border border-interactive-accent/30 relative z-10">
            Membro Pro
          </div>
        </motion.div>

        {/* Settings Menu */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Configurações Gerais</h3>
          {menuItems.map((item) => (
            <motion.button 
              key={item.id}
              variants={itemVariants}
              onClick={item.action}
              className="w-full bg-background-elevated p-5 flex items-center justify-between group hover:border-interactive-accent/50 transition-all rounded-[32px] shadow-lg shadow-black/5 border border-white"
            >
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-[24px] ${item.bg} ${item.color} flex items-center justify-center border border-white shadow-sm group-hover:scale-110 transition-transform`}>
                  <item.icon size={28} />
                </div>
                <span className="font-bold text-content-primary text-xl">{item.label}</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-background-neutral flex items-center justify-center text-content-tertiary group-hover:bg-interactive-accent/20 group-hover:text-interactive-primary transition-colors">
                <ChevronRight size={24} />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Sign Out Button */}
        <motion.button 
          variants={itemVariants}
          onClick={signOut}
          className="relative overflow-hidden shimmer-effect w-full bg-background-elevated p-6 flex items-center justify-center gap-3 text-sentiment-negative font-black hover:bg-sentiment-negative/10 hover:border-sentiment-negative/20 transition-all text-lg rounded-[32px] shadow-lg shadow-black/5 border border-white"
        >
          <LogOut size={24} />
          Encerrar Sessão
        </motion.button>

        <motion.div variants={itemVariants} className="text-center space-y-1 py-4">
          <p className="text-[10px] font-black text-content-tertiary uppercase tracking-widest">FocusBuddy v2.4.0</p>
          <p className="text-[10px] font-black text-content-tertiary uppercase tracking-widest">Feito com ❤️ para produtividade</p>
        </motion.div>
      </motion.div>

      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        onSuccess={() => window.location.reload()} 
      />
      <NotificationsModal isOpen={activeModal === 'notifications'} onClose={() => setActiveModal(null)} />
      <AppearanceModal isOpen={activeModal === 'appearance'} onClose={() => setActiveModal(null)} />
      <PrivacyModal isOpen={activeModal === 'privacy'} onClose={() => setActiveModal(null)} />
      <AboutModal isOpen={activeModal === 'about'} onClose={() => setActiveModal(null)} />
    </>
  );
};

export default Settings;
