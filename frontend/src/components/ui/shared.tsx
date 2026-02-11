import React from 'react';
import { cn } from '@/lib/utils';

// ─── Glass Card ──────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hover }) => (
  <div
    className={cn(
      'bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08] rounded-2xl backdrop-blur-xl',
      hover && 'transition-all duration-300 hover:from-white/[0.09] hover:to-white/[0.04] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20',
      className
    )}
  >
    {children}
  </div>
);

// ─── Status Indicator ────────────────────────────────
interface StatusDotProps {
  status: 'running' | 'stopped' | 'emergency_stop' | string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'md', pulse = true }) => {
  const colorMap: Record<string, string> = {
    running: 'bg-emerald-400',
    stopped: 'bg-amber-400',
    emergency_stop: 'bg-red-400',
  };
  const sizeMap = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };

  return (
    <span className="relative flex items-center">
      <span className={cn(sizeMap[size], colorMap[status] || 'bg-white/40', 'rounded-full')} />
      {pulse && status === 'running' && (
        <span className={cn(sizeMap[size], colorMap[status], 'rounded-full absolute animate-ping opacity-50')} />
      )}
    </span>
  );
};

// ─── Section Header ──────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon, action }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/70">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// ─── Metric Display ──────────────────────────────────
interface MetricProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export const Metric: React.FC<MetricProps> = ({ label, value, subValue, icon, trend }) => {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white';
  const subTrendColor = trend === 'up' ? 'text-emerald-400/70' : trend === 'down' ? 'text-red-400/70' : 'text-white/40';

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</span>
        {icon && <div className="text-white/30">{icon}</div>}
      </div>
      <p className={cn('text-2xl font-bold tracking-tight font-mono', trendColor)}>{value}</p>
      {subValue && <p className={cn('text-xs mt-1 font-mono', subTrendColor)}>{subValue}</p>}
    </GlassCard>
  );
};

// ─── Toggle Switch ───────────────────────────────────
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20',
      checked ? 'bg-emerald-500/80' : 'bg-white/10',
      disabled && 'opacity-40 cursor-not-allowed'
    )}
  >
    <span
      className={cn(
        'inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200',
        checked ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

// ─── Slider ──────────────────────────────────────────
interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
}

export const SliderField: React.FC<SliderFieldProps> = ({ label, value, onChange, min, max, step = 1, unit = '%', hint }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-medium text-white/60">{label}</label>
      <span className="text-sm font-semibold text-white font-mono">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
    />
    {hint && <p className="text-xs text-white/30 mt-1.5">{hint}</p>}
  </div>
);
