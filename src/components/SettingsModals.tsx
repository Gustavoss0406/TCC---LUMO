import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Moon, Sun, Monitor, Lock, Shield, Info, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalWrapper: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-x-6 top-[15%] max-w-sm mx-auto bg-background-elevated rounded-[32px] p-8 shadow-2xl z-50 border border-white dark:border-border-neutral"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-content-primary tracking-tight">{title}</h3>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-background-neutral flex items-center justify-center text-content-tertiary hover:text-content-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export const NotificationsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateNotifications, loading } = useSettings();

  if (loading) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Notificações">
      <div className="space-y-4">
        {[
          { id: 'push', label: 'Notificações Push', desc: 'Receba alertas no seu dispositivo', icon: Bell },
          { id: 'email', label: 'Resumo por E-mail', desc: 'Resumo semanal do seu progresso', icon: Monitor }, 
          { id: 'marketing', label: 'Atualizações do Produto', desc: 'Novidades sobre novos recursos', icon: Info }
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-background-neutral/30 rounded-2xl border border-transparent hover:border-border-neutral transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-interactive-accent/20 flex items-center justify-center text-interactive-primary">
                <item.icon size={18} />
              </div>
              <div>
                <p className="font-bold text-content-primary">{item.label}</p>
                <p className="text-[10px] text-content-secondary font-medium">{item.desc}</p>
              </div>
            </div>
            <button 
              onClick={() => updateNotifications(item.id as any)}
              className={`w-12 h-7 rounded-full p-1 transition-colors ${settings.notification_preferences[item.id as keyof typeof settings.notification_preferences] ? 'bg-interactive-primary' : 'bg-content-tertiary/30'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.notification_preferences[item.id as keyof typeof settings.notification_preferences] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
    </ModalWrapper>
  );
};

export const AppearanceModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Aparência">
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'light', label: 'Claro', icon: Sun },
          { id: 'dark', label: 'Escuro', icon: Moon },
          { id: 'system', label: 'Sistema', icon: Monitor }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTheme(item.id as any)}
            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
              theme === item.id 
                ? 'border-interactive-primary bg-interactive-accent/10 text-interactive-primary' 
                : 'border-transparent bg-background-neutral/50 text-content-tertiary hover:bg-background-neutral'
            }`}
          >
            <item.icon size={24} />
            <span className="font-bold text-sm">{item.label}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-content-tertiary font-medium mt-6">
        O modo escuro está ativo!
      </p>
    </ModalWrapper>
  );
};

export const PrivacyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.auth.resetPasswordForEmail(user.email);
        setSent(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Privacidade e Segurança">
      <div className="space-y-6">
        <div className="p-4 bg-background-neutral/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <Lock size={20} className="text-interactive-primary" />
            <h4 className="font-bold text-content-primary">Senha</h4>
          </div>
          <p className="text-sm text-content-secondary font-medium">
            Enviar link de redefinição para seu e-mail.
          </p>
          {sent ? (
            <div className="flex items-center gap-2 text-sentiment-positive font-bold text-sm mt-2">
              <Check size={16} />
              <span>E-mail enviado! Verifique sua caixa de entrada.</span>
            </div>
          ) : (
            <button 
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full py-3 bg-interactive-primary text-white rounded-xl font-bold text-sm hover:bg-forest-green transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Redefinir Senha'}
            </button>
          )}
        </div>

        <div className="p-4 bg-background-neutral/30 rounded-2xl space-y-3 opacity-60">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={20} className="text-content-tertiary" />
            <h4 className="font-bold text-content-primary">Autenticação em Dois Fatores</h4>
          </div>
          <p className="text-sm text-content-secondary font-medium">
            Adicione uma camada extra de segurança.
          </p>
          <button disabled className="w-full py-3 bg-background-neutral text-content-tertiary rounded-xl font-bold text-sm cursor-not-allowed">
            Em Breve
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export const AboutModal: React.FC<ModalProps> = ({ isOpen, onClose }) => (
  <ModalWrapper isOpen={isOpen} onClose={onClose} title="Sobre o FocusBuddy">
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-interactive-accent/20 rounded-[24px] flex items-center justify-center text-interactive-primary mb-4">
        <Info size={40} />
      </div>
      
      <div className="space-y-2">
        <h4 className="text-xl font-black text-content-primary">FocusBuddy</h4>
        <p className="text-content-secondary font-medium">Versão 2.4.0 (Beta)</p>
      </div>

      <div className="space-y-3 pt-4">
        <a href="#" className="flex items-center justify-between p-4 bg-background-neutral/30 rounded-2xl group hover:bg-background-neutral transition-colors">
          <span className="font-bold text-content-primary">Termos de Serviço</span>
          <ExternalLink size={16} className="text-content-tertiary group-hover:text-content-primary" />
        </a>
        <a href="#" className="flex items-center justify-between p-4 bg-background-neutral/30 rounded-2xl group hover:bg-background-neutral transition-colors">
          <span className="font-bold text-content-primary">Política de Privacidade</span>
          <ExternalLink size={16} className="text-content-tertiary group-hover:text-content-primary" />
        </a>
      </div>

      <p className="text-[10px] text-content-tertiary font-black uppercase tracking-widest pt-4">
        © 2024 FocusBuddy Inc.
      </p>
    </div>
  </ModalWrapper>
);
