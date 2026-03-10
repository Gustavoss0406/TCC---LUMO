import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Save, Loader2, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem para upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      
    } catch (error: any) {
      alert('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName,
          avatar_url: avatarUrl 
        }
      });

      if (error) throw error;

      // Update profiles table as well if needed
      await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      await refreshUser();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <h3 className="text-2xl font-black text-content-primary">Editar Perfil</h3>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-background-neutral flex items-center justify-center text-content-tertiary hover:text-content-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                <label className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background-neutral mb-3 relative">
                    {uploading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="text-white animate-spin" />
                      </div>
                    ) : (
                      <>
                        <img 
                          src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white" size={24} />
                        </div>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs font-bold text-content-tertiary uppercase tracking-widest">
                  Toque na foto para alterar
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-content-tertiary" size={20} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 px-5 py-4 bg-background-neutral/50 border-2 border-transparent rounded-2xl focus:border-interactive-accent focus:bg-background-elevated transition-all outline-none font-bold text-content-primary"
                    placeholder="Digite seu nome"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || uploading}
                className="w-full py-4 rounded-2xl bg-interactive-accent text-content-primary font-black text-lg flex items-center justify-center gap-2 hover:bg-bright-green transition-all shadow-lg shadow-interactive-accent/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Alterações</>}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileModal;
