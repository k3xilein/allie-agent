import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { GlassCard } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

export const Setup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  const setupAdmin = useAuthStore(state => state.setupAdmin);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const statusResponse = await fetch('/api/system/status');
        if (!statusResponse.ok) {
          setDbStatus('error');
          setError('Cannot connect to backend. Make sure the server is running.');
          return;
        }
        const data = await statusResponse.json();
        if (data.initialized) {
          navigate('/login');
        } else {
          setDbStatus('ready');
        }
      } catch {
        setDbStatus('error');
        setError('Cannot connect to backend. Make sure the server is running.');
      }
    };
    checkSystemStatus();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await setupAdmin(username, password, passwordConfirm);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (dbStatus === 'checking') {
    return (
      <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
        <BackgroundPaths />
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <GlassCard className="p-8 w-full max-w-md text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <img src="/logo.png" alt="Allie Agent" className="w-14 h-14 drop-shadow-lg" />
              <Loader2 className="w-6 h-6 text-white/40 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Initializing System</h2>
            <p className="text-sm text-white/30">Checking database and running migrations</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Error state
  if (dbStatus === 'error') {
    return (
      <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
        <BackgroundPaths />
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <GlassCard className="p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/[0.08] border border-red-500/15 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">System Not Ready</h2>
              <p className="text-sm text-white/40">{error}</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-white/60 mb-3">Quick Start Guide</h3>
              <ol className="text-xs text-white/40 space-y-2 list-decimal list-inside">
                <li>Make sure Docker is running</li>
                <li>Start the database: <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-white/50">docker-compose up -d postgres</code></li>
                <li>Start the backend: <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-white/50">docker-compose up -d backend</code></li>
                <li>Refresh this page</li>
              </ol>
            </div>

            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="w-full bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] rounded-xl py-3 h-auto text-sm font-medium"
            >
              Retry Connection
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      <BackgroundPaths />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.08] mx-auto flex items-center justify-center mb-4 overflow-hidden">
                <img src="/logo.png" alt="Allie Agent" className="w-12 h-12 drop-shadow-lg" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Welcome to Allie Agent</h1>
              <p className="text-sm text-white/30">Create your admin account to get started</p>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/[0.06] border border-blue-500/10 rounded-xl p-4 mb-6 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400/70 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-200/60">
                <p className="font-medium text-blue-200/80">No CLI Required</p>
                <p className="mt-0.5">All setup is done through this web interface. Database migrations run automatically.</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  minLength={3}
                  required
                />
                <p className="text-[10px] text-white/20 mt-1">Min. 3 characters, alphanumeric + underscore</p>
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  minLength={12}
                  required
                />
                <p className="text-[10px] text-white/20 mt-1">Min. 12 chars: uppercase, lowercase, number, special char</p>
              </div>

              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/[0.06] border border-red-500/10 rounded-xl p-3 flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                variant="ghost"
                className="w-full bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] rounded-xl py-3 h-auto text-sm font-medium mt-2 disabled:opacity-40"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating Account...</>
                ) : (
                  'Create Admin Account'
                )}
              </Button>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};
