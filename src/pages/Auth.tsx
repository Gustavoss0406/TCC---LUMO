import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const LOGO_LIGHT = 'https://i.ibb.co/jkgvKQQg/freepik-eu-quero-uma-logo-que-siga-o-conceito-da-img1-que-1071.png';
  const LOGO_DARK = 'https://i.ibb.co/jknDxrn5/Logo-darkmode.png';

  const handleGoogleLogin = async () => {
    // Google login doesn't support the video transition easily as it redirects
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (!isLogin && !name) {
      setError('Por favor, informe seu nome.');
      return;
    }

    // Start Video Transition
    setShowVideo(true);
    setLoading(true);

    try {
      // Ensure video plays for at least 4 seconds for effect
      const minDelay = new Promise(resolve => setTimeout(resolve, 4000));
      
      const loginPromise = isLogin 
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ 
            email, 
            password, 
            options: { data: { full_name: name } } 
          });

      const [_, { error }] = await Promise.all([minDelay, loginPromise]);

      if (error) throw error;

      if (!isLogin) {
        // If registration, we might need to show a message if email confirm is on
        // But for now we assume auto-login or redirect
        alert('Cadastro realizado! Verifique seu e-mail se necessário.');
        setShowVideo(false); // Hide video to show alert/login screen again
      }
      
      // If login success, the AuthContext will update 'user' and unmount this component
      // effectively transitioning to Dashboard automatically.

    } catch (err: any) {
      // Error: Hide video and show error
      setShowVideo(false);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-interactive-accent flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Video Overlay */}
      <AnimatePresence>
        {showVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <video 
              src="https://i.imgur.com/ufMvZhO.mp4" 
              autoPlay 
              muted 
              loop 
              playsInline
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-black tracking-tighter mb-2"
              >
                Iniciando FocusBuddy...
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-white/60 font-medium"
              >
                Preparando seu ambiente de foco
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elementos Decorativos de Fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-48 -left-48 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
        className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[48px] shadow-2xl shadow-black/10 space-y-8 relative z-10"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            src={isDark ? LOGO_DARK : LOGO_LIGHT}
            className="w-24 h-24 rounded-[32px] shadow-lg shadow-black/5 object-cover" 
            alt="Logo"
          />
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-black mb-1">FocusBuddy</h1>
            <p className="text-gray-400 font-bold text-lg tracking-tight">Seu assistente de foco pessoal</p>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 text-red-500 px-4 py-3 rounded-2xl text-sm font-bold text-center border border-red-100"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 rounded-full bg-black text-white font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <img src="/google.svg" className="w-6 h-6" alt="Google" />}
            <span>Continuar com Google</span>
          </button>

          <div className="flex items-center gap-4 text-gray-300 font-black text-[10px] uppercase tracking-widest py-2">
            <div className="h-0.5 flex-1 bg-gray-100 rounded-full" />
            OU
            <div className="h-0.5 flex-1 bg-gray-100 rounded-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <input
                type="text"
                placeholder="Nome Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black transition-all outline-none font-bold text-lg placeholder:text-gray-400 text-black"
                required
              />
            )}
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black transition-all outline-none font-bold text-lg placeholder:text-gray-400 text-black"
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black transition-all outline-none font-bold text-lg placeholder:text-gray-400 text-black"
              required
            />
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 rounded-full bg-interactive-accent text-black font-black text-lg hover:bg-bright-green transition-all shadow-lg shadow-interactive-accent/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Entrar com E-mail' : 'Criar Conta'}</span>
                  <ArrowRight size={20} strokeWidth={3} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center pt-2">
          <p className="font-bold text-gray-400 text-sm">
            {isLogin ? 'Não tem conta?' : 'Já tem conta?'}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="ml-2 text-black hover:underline transition-all"
            >
              {isLogin ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </div>
      </motion.div>
      
      <p className="mt-8 text-black/40 font-bold text-xs text-center max-w-xs mx-auto">
        Ao continuar, você concorda com nossos Termos e Política de Privacidade.
      </p>
    </div>
  );
};

export default Auth;
