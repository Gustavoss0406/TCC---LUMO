import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const LOGO_LIGHT = '/icons/icon-192.png';
  const LOGO_DARK = 'https://i.ibb.co/jknDxrn5/Logo-darkmode.png';

  const handleGoogleLogin = async () => {
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
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
        alert('Verifique seu e-mail para o link de confirmação!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-interactive-accent flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
