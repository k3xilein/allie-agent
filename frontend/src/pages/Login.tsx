import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BackgroundPaths>
      <div className="flex flex-col items-center justify-center text-center">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm"
            >
              <img src="/logo.png" alt="Allie Agent" className="w-10 h-10 drop-shadow-lg" />
            </motion.div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter mb-3">
            {'Allie Agent'.split('').map((letter, i) => (
              <motion.span
                key={i}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.3 + i * 0.04,
                  type: 'spring',
                  stiffness: 150,
                  damping: 25,
                }}
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80"
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))}
          </h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-white/50 text-sm tracking-widest uppercase"
          >
            Autonomous Trading Intelligence
          </motion.p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" />
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <div className="group relative bg-gradient-to-b from-white/10 to-black/10 p-px rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <Button
                    type="submit"
                    disabled={loading}
                    variant="ghost"
                    className="w-full rounded-[0.7rem] px-6 py-6 text-base font-semibold backdrop-blur-md bg-white/[0.08] hover:bg-white/[0.12] text-white transition-all duration-300 group-hover:-translate-y-0.5 border border-white/[0.08] hover:border-white/[0.15] disabled:opacity-40 disabled:group-hover:translate-y-0"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                        Access Dashboard
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="text-white/25 text-xs mt-6 tracking-wide"
          >
            Secured with AES-256 encryption
          </motion.p>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
};
