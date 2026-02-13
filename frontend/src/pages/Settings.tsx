import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useStore';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard, SectionHeader, Toggle, SliderField } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  ShieldCheck,
  BarChart3,
  Bell,
  UserCircle,
  Shield,
  Zap,
  Scale,
  Crosshair,
  AlertTriangle,
  Check,
  Save,
  Trash2,
  Lock,
} from 'lucide-react';

interface SettingsData {
  apiKeys: {
    hyperliquid: { apiKey: string; privateKey: string; testnet: boolean };
    openrouter: { apiKey: string };
  };
  riskManagement: {
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossPercent: number;
    takeProfitPercent: number;
  };
  strategy: {
    type: string;
    timeframe: string;
    minConfidence: number;
  };
  notifications: {
    email: boolean;
    tradeAlerts: boolean;
    dailyReport: boolean;
  };
}

export const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('api');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<SettingsData>({
    apiKeys: {
      hyperliquid: { apiKey: '', privateKey: '', testnet: true },
      openrouter: { apiKey: '' },
    },
    riskManagement: { maxPositionSize: 10, maxDailyLoss: 5, stopLossPercent: 2, takeProfitPercent: 5 },
    strategy: { type: 'balanced', timeframe: '15m', minConfidence: 70 },
    notifications: { email: false, tradeAlerts: true, dailyReport: false },
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Deep merge with defaults to prevent undefined access on nested fields
        setSettings({
          apiKeys: {
            hyperliquid: {
              apiKey: data.apiKeys?.hyperliquid?.apiKey || '',
              privateKey: data.apiKeys?.hyperliquid?.privateKey || '',
              testnet: data.apiKeys?.hyperliquid?.testnet ?? true,
            },
            openrouter: {
              apiKey: data.apiKeys?.openrouter?.apiKey || '',
            },
          },
          riskManagement: {
            maxPositionSize: data.riskManagement?.maxPositionSize ?? 10,
            maxDailyLoss: data.riskManagement?.maxDailyLoss ?? 5,
            stopLossPercent: data.riskManagement?.stopLossPercent ?? 2,
            takeProfitPercent: data.riskManagement?.takeProfitPercent ?? 5,
          },
          strategy: {
            type: data.strategy?.type || 'balanced',
            timeframe: data.strategy?.timeframe || '15m',
            minConfidence: data.strategy?.minConfidence ?? 70,
          },
          notifications: {
            email: data.notifications?.email ?? false,
            tradeAlerts: data.notifications?.tradeAlerts ?? true,
            dailyReport: data.notifications?.dailyReport ?? false,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    setError('');
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        const saved = await response.json();
        // Deep merge response to ensure we don't lose structure
        setSettings({
          apiKeys: {
            hyperliquid: {
              apiKey: saved.apiKeys?.hyperliquid?.apiKey || '',
              privateKey: saved.apiKeys?.hyperliquid?.privateKey || '',
              testnet: saved.apiKeys?.hyperliquid?.testnet ?? true,
            },
            openrouter: {
              apiKey: saved.apiKeys?.openrouter?.apiKey || '',
            },
          },
          riskManagement: {
            maxPositionSize: saved.riskManagement?.maxPositionSize ?? 10,
            maxDailyLoss: saved.riskManagement?.maxDailyLoss ?? 5,
            stopLossPercent: saved.riskManagement?.stopLossPercent ?? 2,
            takeProfitPercent: saved.riskManagement?.takeProfitPercent ?? 5,
          },
          strategy: {
            type: saved.strategy?.type || 'balanced',
            timeframe: saved.strategy?.timeframe || '15m',
            minConfidence: saved.strategy?.minConfidence ?? 70,
          },
          notifications: {
            email: saved.notifications?.email ?? false,
            tradeAlerts: saved.notifications?.tradeAlerts ?? true,
            dailyReport: saved.notifications?.dailyReport ?? false,
          },
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.details || errData.error || `Save failed (${response.status})`);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'risk', label: 'Risk Management', icon: ShieldCheck },
    { id: 'strategy', label: 'Strategy', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: UserCircle },
  ];

  const strategies = [
    { id: 'conservative', label: 'Conservative', desc: 'Lower risk, fewer trades', icon: Shield },
    { id: 'balanced', label: 'Balanced', desc: 'Balanced risk/reward', icon: Scale },
    { id: 'aggressive', label: 'Aggressive', desc: 'Higher risk, more trades', icon: Zap },
  ];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-sm text-white/30 mt-1">Configure your trading agent</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-52 flex-shrink-0">
          <GlassCard className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </GlassCard>
        </div>

        {/* Content */}
        <div className="flex-1">
          <GlassCard className="p-6">
            {/* API Keys */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <SectionHeader title="API Keys" subtitle="Configure your exchange and AI API keys" icon={<Key className="w-4 h-4" />} />

                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                      <Crosshair className="w-3.5 h-3.5" /> Hyperliquid Exchange
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">API Key</label>
                        <Input
                          type="password"
                          value={settings.apiKeys.hyperliquid.apiKey}
                          onChange={(e) => setSettings({ ...settings, apiKeys: { ...settings.apiKeys, hyperliquid: { ...settings.apiKeys.hyperliquid, apiKey: e.target.value } } })}
                          placeholder="Your Hyperliquid API Key"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">Private Key</label>
                        <Input
                          type="password"
                          value={settings.apiKeys.hyperliquid.privateKey}
                          onChange={(e) => setSettings({ ...settings, apiKeys: { ...settings.apiKeys, hyperliquid: { ...settings.apiKeys.hyperliquid, privateKey: e.target.value } } })}
                          placeholder="Your Private Key"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <Toggle
                          checked={settings.apiKeys.hyperliquid.testnet}
                          onChange={(checked) => setSettings({ ...settings, apiKeys: { ...settings.apiKeys, hyperliquid: { ...settings.apiKeys.hyperliquid, testnet: checked } } })}
                        />
                        <span className="text-sm text-white/50">Use Testnet</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-5">
                    <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" /> OpenRouter AI
                    </h3>
                    <div>
                      <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">API Key</label>
                      <Input
                        type="password"
                        value={settings.apiKeys.openrouter.apiKey}
                        onChange={(e) => setSettings({ ...settings, apiKeys: { ...settings.apiKeys, openrouter: { apiKey: e.target.value } } })}
                        placeholder="Your OpenRouter API Key"
                      />
                      <p className="text-xs text-white/25 mt-1.5">For AI-powered trading decisions (Kimi K2 Model)</p>
                    </div>
                  </div>

                  <div className="bg-amber-500/[0.06] border border-amber-500/10 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400/70 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-200/60">
                      <p className="font-medium text-amber-200/80">Security Notice</p>
                      <p className="mt-1">Your API keys are encrypted with AES-256. Use keys with restricted permissions (trading only, no withdrawal).</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Management */}
            {activeTab === 'risk' && (
              <div className="space-y-6">
                <SectionHeader title="Risk Management" subtitle="Define your risk parameters and trading limits" icon={<ShieldCheck className="w-4 h-4" />} />
                <div className="space-y-5">
                  <SliderField label="Max Position Size" value={settings.riskManagement.maxPositionSize} onChange={(v) => setSettings({ ...settings, riskManagement: { ...settings.riskManagement, maxPositionSize: v } })} min={1} max={50} hint="Maximum portfolio percentage per position" />
                  <SliderField label="Max Daily Loss" value={settings.riskManagement.maxDailyLoss} onChange={(v) => setSettings({ ...settings, riskManagement: { ...settings.riskManagement, maxDailyLoss: v } })} min={1} max={20} hint="Trading stops when this daily loss is reached" />
                  <SliderField label="Stop Loss" value={settings.riskManagement.stopLossPercent} onChange={(v) => setSettings({ ...settings, riskManagement: { ...settings.riskManagement, stopLossPercent: v } })} min={0.5} max={10} step={0.5} />
                  <SliderField label="Take Profit" value={settings.riskManagement.takeProfitPercent} onChange={(v) => setSettings({ ...settings, riskManagement: { ...settings.riskManagement, takeProfitPercent: v } })} min={1} max={20} step={0.5} />
                </div>
              </div>
            )}

            {/* Strategy */}
            {activeTab === 'strategy' && (
              <div className="space-y-6">
                <SectionHeader title="Trading Strategy" subtitle="Choose your preferred strategy and timeframe" icon={<BarChart3 className="w-4 h-4" />} />

                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 block">Strategy Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {strategies.map((strat) => {
                      const Icon = strat.icon;
                      const isActive = settings.strategy.type === strat.id;
                      return (
                        <button
                          key={strat.id}
                          onClick={() => setSettings({ ...settings, strategy: { ...settings.strategy, type: strat.id } })}
                          className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                            isActive
                              ? 'bg-white/[0.08] border-white/[0.15] shadow-lg shadow-black/10'
                              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${isActive ? 'bg-white/[0.1]' : 'bg-white/[0.04]'}`}>
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40'}`} />
                          </div>
                          <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>{strat.label}</div>
                          <div className="text-xs text-white/25 mt-0.5">{strat.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 block">Timeframe</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['5m', '15m', '1h', '4h'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setSettings({ ...settings, strategy: { ...settings.strategy, timeframe: tf } })}
                        className={`py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          settings.strategy.timeframe === tf
                            ? 'bg-white/[0.08] border-white/[0.15] text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.04] hover:text-white/60'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <SliderField
                  label="Min AI Confidence"
                  value={settings.strategy.minConfidence}
                  onChange={(v) => setSettings({ ...settings, strategy: { ...settings.strategy, minConfidence: v } })}
                  min={50} max={95} step={5}
                  hint="Only trades with at least this AI confidence will be executed"
                />
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <SectionHeader title="Notifications" subtitle="Configure your notification preferences" icon={<Bell className="w-4 h-4" />} />

                <div className="space-y-3">
                  {[
                    { key: 'email' as const, label: 'Email Notifications', desc: 'Receive important updates via email' },
                    { key: 'tradeAlerts' as const, label: 'Trade Alerts', desc: 'Notification for every executed trade' },
                    { key: 'dailyReport' as const, label: 'Daily Report', desc: 'Daily summary of your trading performance' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div>
                        <div className="text-sm font-medium text-white/70">{item.label}</div>
                        <div className="text-xs text-white/30 mt-0.5">{item.desc}</div>
                      </div>
                      <Toggle
                        checked={settings.notifications[item.key]}
                        onChange={(checked) => setSettings({ ...settings, notifications: { ...settings.notifications, [item.key]: checked } })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <SectionHeader title="Account" subtitle="Manage your account information and security" icon={<UserCircle className="w-4 h-4" />} />

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-sm text-white/40">Username</span>
                    <span className="text-sm text-white font-medium">{user?.username}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-sm text-white/40">Created</span>
                    <span className="text-sm text-white font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '-'}</span>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-5">
                  <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" /> Change Password
                  </h3>
                  <div className="space-y-3">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                    <Input type="password" placeholder="Confirm new password" />
                    <Button variant="ghost" className="bg-white/[0.06] hover:bg-white/[0.08] text-white/70 border border-white/[0.08] rounded-xl px-4 py-2 h-auto text-sm">
                      Update Password
                    </Button>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-5">
                  <h3 className="text-sm font-semibold text-red-400/80 mb-3">Danger Zone</h3>
                  <div className="bg-red-500/[0.04] border border-red-500/10 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white/60">Delete Account</div>
                      <div className="text-xs text-white/25 mt-0.5">This action cannot be undone</div>
                    </div>
                    <Button variant="ghost" className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-xl px-4 py-2 h-auto text-sm gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Bar */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/[0.06]">
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-emerald-400 text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Saved successfully
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              {!success && !error && <div />}
              <Button
                onClick={handleSave}
                disabled={loading}
                variant="ghost"
                className="bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] rounded-xl px-5 py-2.5 h-auto text-sm font-medium gap-2 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
};
