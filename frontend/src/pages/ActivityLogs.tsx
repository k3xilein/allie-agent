import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { activityLogsAPI } from '../api/client';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard, SectionHeader } from '@/components/ui/shared';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Zap,
  Brain,
  BarChart3,
  Shield,
  Wallet,
  Settings2,
  ArrowUpDown,
  CircleDot,
} from 'lucide-react';

interface ActivityLog {
  id: number;
  timestamp: string;
  category: string;
  event: string;
  message: string;
  details: any;
  severity: string;
  cycle_id: number | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'ENGINE', label: 'Engine' },
  { value: 'CYCLE', label: 'Cycle' },
  { value: 'MARKET', label: 'Market Data' },
  { value: 'ANALYSIS', label: 'Technical' },
  { value: 'AI', label: 'AI Analysis' },
  { value: 'RISK', label: 'Risk Mgmt' },
  { value: 'TRADE', label: 'Trade' },
  { value: 'POSITION', label: 'Position' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'DECISION', label: 'Decision' },
];

const SEVERITIES = [
  { value: 'all', label: 'All Levels' },
  { value: 'INFO', label: 'Info' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
];

const categoryIcon = (cat: string) => {
  switch (cat) {
    case 'ENGINE': return <Settings2 className="w-3.5 h-3.5" />;
    case 'CYCLE': return <RefreshCw className="w-3.5 h-3.5" />;
    case 'MARKET': return <BarChart3 className="w-3.5 h-3.5" />;
    case 'ANALYSIS': return <ArrowUpDown className="w-3.5 h-3.5" />;
    case 'AI': return <Brain className="w-3.5 h-3.5" />;
    case 'RISK': return <Shield className="w-3.5 h-3.5" />;
    case 'TRADE': return <Zap className="w-3.5 h-3.5" />;
    case 'POSITION': return <CircleDot className="w-3.5 h-3.5" />;
    case 'ACCOUNT': return <Wallet className="w-3.5 h-3.5" />;
    case 'DECISION': return <Info className="w-3.5 h-3.5" />;
    default: return <ScrollText className="w-3.5 h-3.5" />;
  }
};

const severityIcon = (sev: string) => {
  switch (sev) {
    case 'SUCCESS': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case 'WARNING': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    case 'ERROR': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    default: return <Info className="w-3.5 h-3.5 text-blue-400" />;
  }
};

const severityColor = (sev: string) => {
  switch (sev) {
    case 'SUCCESS': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'WARNING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'ERROR': return 'text-red-400 bg-red-500/10 border-red-500/20';
    default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  }
};

const categoryColor = (cat: string) => {
  switch (cat) {
    case 'ENGINE': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'CYCLE': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    case 'MARKET': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'ANALYSIS': return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
    case 'AI': return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    case 'RISK': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'TRADE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'POSITION': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    case 'ACCOUNT': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'DECISION': return 'text-white/60 bg-white/[0.06] border-white/[0.1]';
    default: return 'text-white/40 bg-white/[0.04] border-white/[0.08]';
  }
};

export const ActivityLogs: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await activityLogsAPI.getLogs(page, 50, category, severity);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch activity logs', error);
    } finally {
      setLoading(false);
    }
  }, [category, severity]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(pagination.page);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs, pagination.page]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <AppShell>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Activity Log</h1>
          <p className="text-sm text-white/30 mt-1">Complete trading activity history</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/[0.04] text-white/30 border-white/[0.06]'
            }`}
          >
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-white/40">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Filter</span>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-neutral-900">
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value} className="bg-neutral-900">
                {s.label}
              </option>
            ))}
          </select>

          <div className="ml-auto text-xs text-white/30">
            {pagination.total} entries
          </div>
        </div>
      </GlassCard>

      {/* Log Entries */}
      <GlassCard className="p-6">
        <SectionHeader
          title="Trading Activity"
          subtitle={`Page ${pagination.page} of ${pagination.totalPages || 1}`}
          icon={<ScrollText className="w-4 h-4" />}
        />

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
              <ScrollText className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-sm text-white/30 font-medium">No activity logs yet</p>
            <p className="text-xs text-white/15 mt-1">Logs will appear here when the trading engine runs</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className={`group relative rounded-xl border transition-all cursor-pointer ${
                    expandedLog === log.id
                      ? 'bg-white/[0.06] border-white/[0.12]'
                      : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]'
                  }`}
                >
                  {/* Main Row */}
                  <div className="flex items-start gap-3 px-4 py-3">
                    {/* Severity Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {severityIcon(log.severity)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {/* Category Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${categoryColor(log.category)}`}>
                          {categoryIcon(log.category)}
                          {log.category}
                        </span>

                        {/* Severity Badge */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${severityColor(log.severity)}`}>
                          {log.severity}
                        </span>

                        {/* Cycle badge */}
                        {log.cycle_id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white/30 bg-white/[0.04] border border-white/[0.06]">
                            Cycle #{log.cycle_id}
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      <p className="text-sm text-white/70 leading-relaxed break-words">
                        {log.message}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="text-[11px] text-white/25 font-mono flex-shrink-0 whitespace-nowrap mt-0.5">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLog === log.id && log.details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 pb-3 pt-1 border-t border-white/[0.05]"
                    >
                      <div className="bg-black/30 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap break-words">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 7) {
                  pageNum = i + 1;
                } else if (pagination.page <= 4) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 3) {
                  pageNum = pagination.totalPages - 6 + i;
                } else {
                  pageNum = pagination.page - 3 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchLogs(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      pageNum === pagination.page
                        ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                        : 'text-white/30 hover:bg-white/[0.04] hover:text-white/50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </GlassCard>
    </AppShell>
  );
};
