import React, { useState } from 'react';
import { Lock, User, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    if (username.trim() === 'Admin' && password === 'Admin') {
      setLoading(true);
      // Simulate network request for premium micro-animation
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess();
      }, 800);
    } else {
      setError('Credenciales inválidas. Por favor verifique el usuario y clave.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090d16] text-slate-100 font-sans relative overflow-hidden p-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800/80 bg-slate-900/20 shadow-2xl relative z-10 space-y-6">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-20 w-20 flex items-center justify-center bg-transparent">
            <img 
              src="/logo.png" 
              alt="EnergIA Sur Logo" 
              className="h-full w-full object-contain" 
            />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent tracking-wide">
              EnergIA Sur
            </h2>
            <p className="text-xs text-slate-400 mt-1">Industrial IoT • Monitoreo Estacional y Tarifario</p>
          </div>
        </div>

        {/* Credentials Banner (Visible as requested) */}
        <div className="bg-cyan-950/40 border border-cyan-900/50 rounded-2xl p-4 text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">Credenciales de Acceso</div>
          <div className="text-xs font-mono text-slate-300">
            Usuario: <span className="text-white font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900 select-all">Admin</span>
            <span className="mx-2">|</span>
            Clave: <span className="text-white font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900 select-all">Admin</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Error Message */}
          {error && (
            <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-cyan-400" /> Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
              placeholder="Ingrese el usuario"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-400" /> Clave
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-4 pr-10 py-2.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                placeholder="Ingrese la clave"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-cyan-950/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="h-4 w-4" /> Ingresar al Sistema
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
