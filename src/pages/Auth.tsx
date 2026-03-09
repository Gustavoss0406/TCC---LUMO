import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ArrowRight, Zap } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-background-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Graphic Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-interactive-accent/20 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, -10, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-interactive-accent/10 rounded-full blur-3xl" 
        />
      </div>

      <div className="w-full max-w-md space-y-10 relative z-10">
        {/* Logo/Icon Area */}
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="inline-block"
          >
            <img 
              src="https://i.ibb.co/LMWbTzd/freepik-eu-quero-uma-logo-que-siga-o-conceito-da-img1-que-1071.png" 
              alt="Logo" 
              className="h-32 w-auto mx-auto object-contain"
            />
          </motion.div>
          
          <div className="space-y-2">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-black text-content-primary tracking-tighter"
            >
              Bem-vindo
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-content-secondary text-lg font-medium"
            >
              {isLogin ? 'Acesse seu hub de produtividade' : 'Crie sua conta para começar a focar'}
            </motion.p>
          </div>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-background-elevated p-8 space-y-6 rounded-[40px] shadow-2xl shadow-black/5 border border-white"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-sentiment-negative/10 border border-sentiment-negative/20 text-sentiment-negative px-4 py-3 rounded-2xl text-sm font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative group">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-content-tertiary group-focus-within:text-content-primary transition-colors" size={20} />
                  <input
                    type="text"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-14 px-6 py-5 bg-background-neutral/50 border-2 border-transparent rounded-[24px] focus:border-interactive-accent focus:bg-background-elevated transition-all outline-none font-bold text-lg placeholder:font-medium"
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Endereço de E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-content-tertiary group-focus-within:text-content-primary transition-colors" size={20} />
                <input
                  type="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 px-6 py-5 bg-background-neutral/50 border-2 border-transparent rounded-[24px] focus:border-interactive-accent focus:bg-background-elevated transition-all outline-none font-bold text-lg placeholder:font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-content-tertiary uppercase tracking-widest ml-1">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-content-tertiary group-focus-within:text-content-primary transition-colors" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 px-6 py-5 bg-background-neutral/50 border-2 border-transparent rounded-[24px] focus:border-interactive-accent focus:bg-background-elevated transition-all outline-none font-bold text-lg placeholder:font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative overflow-hidden shimmer-effect w-full px-6 py-5 mt-4 rounded-full font-black text-lg text-center transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2 bg-interactive-accent text-content-primary hover:bg-bright-green shadow-xl shadow-interactive-accent/20"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-content-primary/30 border-t-content-primary rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
                  <ArrowRight size={22} strokeWidth={3} />
                </>
              )}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-background-neutral"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background-elevated px-4 text-content-tertiary font-black tracking-widest">Ou continue com</span>
            </div>
          </div>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full px-6 py-4 rounded-full font-bold text-center transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2 bg-background-neutral text-content-primary hover:bg-background-neutral/80"
          >
            {isLogin ? "Criar nova conta" : "Acessar conta existente"}
          </button>
        </motion.div>

        <p className="text-center text-xs text-content-tertiary font-medium px-8">
          Ao continuar, você concorda com os <span className="text-interactive-primary cursor-pointer">Termos de Serviço</span> e <span className="text-interactive-primary cursor-pointer">Política de Privacidade</span> do FocusBuddy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
