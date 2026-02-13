import React, { useState, useEffect, useCallback } from 'react';
import { healthAPI } from '@/api/client';
import { GlassCard, SectionHeader } from '@/components/ui/shared';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse,
  Database,
  Globe,
  KeyRound,
  Cpu,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

interface SubsystemCheck {
  name: string;
  status: CheckStatus;
  latencyMs: number;
  message: string;
  details?: Record<string, any>;
}

interface HealthReport {
  timestamp: string;
  overall: CheckStatus;
  checks: SubsystemCheck[];
  readyToTrade: boolean;
  testTrade?: SubsystemCheck;
}

const iconMap: Record<string, React.ReactNode> = {
  'Database': <Database className="w-4 h-4" />,
  'Exchange API': <Globe className="w-4 h-4" />,
  'Exchange Auth': <KeyRound className="w-4 h-4" />,
  'AI Service': <Cpu className="w-4 h-4" />,
  'Test Trade': <FlaskConical className="w-4 h-4" />,
};

const statusConfig: Record<CheckStatus, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  pass: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/[0.08]',
    border: 'border-emerald-500/20',
  },
  fail: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-400',
    bg: 'bg-red-500/[0.08]',
    border: 'border-red-500/20',
  },
  warn: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/[0.08]',
    border: 'border-amber-500/20',
  },
  skip: {
    icon: <MinusCircle className="w-4 h-4" />,
    color: 'text-white/30',
    bg: 'bg-white/[0.03]',
    border: 'border-white/[0.06]',
  },
};

export const SystemHealth: React.FC = () => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [running, setRunning] = useState(false);
  const [includeTestTrade, setIncludeTestTrade] = useState(false);

  // Load cached status on mount
  useEffect(() => {
    healthAPI.getStatus().then((r) => {
      if (r.data?.timestamp) setReport(r.data);
    }).catch(() => {});
  }, []);

  const runCheck = useCallback(async () => {
    setRunning(true);
    try {
      const res = await healthAPI.runCheck(includeTestTrade);
      setReport(res.data);
    } catch {
      // ignore
    } finally {
      setRunning(false);
    }
  }, [includeTestTrade]);

  const overallConf = report ? statusConfig[report.overall] : null;

  return (
    <GlassCard className="p-6">
      <SectionHeader
        title="System Health"
        subtitle="Subsystem diagnostics and connectivity"
        icon={<HeartPulse className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-2">
            {/* Test trade toggle */}
            <button
              onClick={() => setIncludeTestTrade(!includeTestTrade)}
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                includeTestTrade
                  ? 'bg-amber-500/[0.08] border-amber-500/20 text-amber-400'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/25 hover:text-white/40'
              }`}
              title="Include a test order (placed far from market and immediately cancelled)"
            >
              <FlaskConical className="w-3 h-3" />
              Test Trade
            </button>

            <Button
              variant="ghost"
              onClick={runCheck}
              disabled={running}
              className="bg-white/[0.04] hover:bg-white/[0.06] text-white/40 hover:text-white/60 border border-white/[0.06] rounded-lg px-3 py-1.5 h-auto text-xs gap-1.5 disabled:opacity-40"
            >
              {running ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {running ? 'Checking...' : 'Run Check'}
            </Button>
          </div>
        }
      />

      {/* Overall status banner */}
      {report && overallConf && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-4 ${overallConf.bg} ${overallConf.border}`}
        >
          <div className="flex items-center gap-2.5">
            <span className={overallConf.color}>{overallConf.icon}</span>
            <span className={`text-sm font-medium ${overallConf.color}`}>
              {report.overall === 'pass' ? 'All Systems Operational' : report.overall === 'warn' ? 'Operational with Warnings' : 'Issues Detected'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {report.readyToTrade ? (
              <span className="text-[10px] uppercase tracking-wider font-medium text-emerald-400/70 bg-emerald-500/[0.06] border border-emerald-500/10 px-2 py-1 rounded-md">
                Ready to Trade
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-medium text-red-400/70 bg-red-500/[0.06] border border-red-500/10 px-2 py-1 rounded-md">
                Not Ready
              </span>
            )}
            <span className="text-[10px] text-white/20">
              {new Date(report.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </motion.div>
      )}

      {/* Checks list */}
      {report ? (
        <div className="space-y-2">
          <AnimatePresence>
            {report.checks.map((check, i) => {
              const conf = statusConfig[check.status];
              return (
                <motion.div
                  key={check.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${conf.bg} ${conf.border}`}
                >
                  {/* Icon */}
                  <span className="text-white/40">{iconMap[check.name] || <HeartPulse className="w-4 h-4" />}</span>

                  {/* Name & message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/70">{check.name}</span>
                      {check.latencyMs > 0 && (
                        <span className="text-[10px] text-white/20">{check.latencyMs}ms</span>
                      )}
                    </div>
                    <p className="text-xs text-white/30 truncate mt-0.5">{check.message}</p>
                  </div>

                  {/* Status badge */}
                  <span className={conf.color}>{conf.icon}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
            <HeartPulse className="w-5 h-5 text-white/15" />
          </div>
          <p className="text-sm text-white/25 font-medium">No health data yet</p>
          <p className="text-xs text-white/15 mt-1">Click "Run Check" to test all subsystems</p>
        </div>
      )}
    </GlassCard>
  );
};
