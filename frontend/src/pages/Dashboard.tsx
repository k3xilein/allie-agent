import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useDashboardStore } from '../store/useStore';
import { agentAPI } from '../api/client';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard, Metric, SectionHeader, StatusDot } from '@/components/ui/shared';
import { SystemHealth } from '@/components/SystemHealth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  OctagonX,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Layers,
  Activity,
  ShieldAlert,
  Minus,
  RefreshCw,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { agentStatus, accountBalance, totalPnL, todayPnL, activePositions, fetchOverview, loading } = useDashboardStore();
  const [confirmEmergency, setConfirmEmergency] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOverview();
    const interval = setInterval(fetchOverview, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, navigate, fetchOverview]);

  const handleStart = async () => {
    try {
      await agentAPI.start();
      await fetchOverview();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to start agent');
    }
  };

  const handleStop = async () => {
    try {
      await agentAPI.stop();
      await fetchOverview();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to stop agent');
    }
  };

  const handleEmergencyStop = async () => {
    if (!confirmEmergency) {
      setConfirmEmergency(true);
      return;
    }
    try {
      await agentAPI.emergencyStop('CONFIRM');
      await fetchOverview();
      setConfirmEmergency(false);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Emergency stop failed');
    }
  };

  const pnlTrend = (val: number): 'up' | 'down' | 'neutral' =>
    val > 0 ? 'up' : val < 0 ? 'down' : 'neutral';

  const formatPnl = (val: number) =>
    `${val >= 0 ? '+' : ''}$${val.toFixed(2)}`;

  const formatPct = (val: number) =>
    `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

  return (
    <AppShell>
      {/* Emergency Banner */}
      <AnimatePresence>
        {agentStatus === 'emergency_stop' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-5 py-4 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">Emergency Stop Active</p>
                <p className="text-xs text-red-300/60 mt-0.5">All trading has been halted. Reset to resume.</p>
              </div>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await agentAPI.resetEmergency();
                    await fetchOverview();
                  } catch (_e) { /* ignore */ }
                }}
                className="text-xs text-red-300 border border-red-500/20 hover:bg-red-500/10 rounded-lg px-3 py-1.5 h-auto"
              >
                Reset
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/30 mt-1">Real-time trading overview</p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric
          label="Balance"
          value={`$${accountBalance.toFixed(2)}`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <Metric
          label="Total PnL"
          value={formatPnl(totalPnL.absolute)}
          subValue={formatPct(totalPnL.percentage)}
          icon={totalPnL.absolute >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          trend={pnlTrend(totalPnL.absolute)}
        />
        <Metric
          label="Today"
          value={formatPnl(todayPnL.absolute)}
          subValue={formatPct(todayPnL.percentage)}
          icon={<CalendarDays className="w-4 h-4" />}
          trend={pnlTrend(todayPnL.absolute)}
        />
        <Metric
          label="Positions"
          value={String(activePositions)}
          icon={<Layers className="w-4 h-4" />}
        />
      </div>

      {/* Agent Control */}
      <GlassCard className="p-6 mb-8">
        <SectionHeader
          title="Agent Control"
          subtitle="Manage trading engine lifecycle"
          icon={<Activity className="w-4 h-4" />}
        />

        <div className="flex flex-wrap items-center gap-3">
          {agentStatus !== 'running' && agentStatus !== 'emergency_stop' && (
            <Button
              onClick={handleStart}
              variant="ghost"
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl px-5 py-2.5 h-auto text-sm font-medium gap-2"
            >
              <Play className="w-4 h-4" />
              Start Trading
            </Button>
          )}
          {agentStatus === 'running' && (
            <Button
              onClick={handleStop}
              variant="ghost"
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl px-5 py-2.5 h-auto text-sm font-medium gap-2"
            >
              <Pause className="w-4 h-4" />
              Stop Trading
            </Button>
          )}

          {agentStatus !== 'emergency_stop' && (
            <Button
              onClick={handleEmergencyStop}
              variant="ghost"
              className={`rounded-xl px-5 py-2.5 h-auto text-sm font-medium gap-2 transition-all ${
                confirmEmergency
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                  : 'bg-red-500/[0.06] hover:bg-red-500/10 text-red-400/70 border border-red-500/10'
              }`}
            >
              <OctagonX className="w-4 h-4" />
              {confirmEmergency ? 'Click again to confirm' : 'Emergency Stop'}
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <StatusDot status={agentStatus} />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
              {agentStatus === 'running' ? 'Active' : agentStatus === 'stopped' ? 'Idle' : 'Halted'}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* System Health */}
      <SystemHealth />

      {/* Positions */}
      <GlassCard className="p-6">
        <SectionHeader
          title="Active Positions"
          subtitle="Currently open trades"
          icon={<CircleDot className="w-4 h-4" />}
        />

        {activePositions === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
              <Minus className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-sm text-white/30 font-medium">No active positions</p>
            <p className="text-xs text-white/15 mt-1">Trades will appear here when the agent opens positions</p>
          </div>
        ) : (
          <div className="text-sm text-white/40 text-center py-8">
            {activePositions} active position(s)
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
};
