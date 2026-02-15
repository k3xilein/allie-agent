import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { GlassCard, SliderField, Toggle } from '@/components/ui/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Scale,
  Zap,
  Lock,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Crosshair,
  Info,
  AlertTriangle,
  ArrowRight,
  Cpu,
} from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  { title: 'Welcome to Allie Agent', description: 'Set up your trading bot in a few steps.' },
  { title: 'API Keys', description: 'Connect your exchange and AI APIs for automated trading.' },
  { title: 'Risk Management', description: 'Define your risk parameters and trading limits.' },
  { title: 'Trading Strategy', description: 'Choose your preferred strategy and timeframe.' },
  { title: 'Ready to Go', description: 'Everything is configured. Start trading now.' },
];

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);

  const [hyperliquidApiKey, setHyperliquidApiKey] = useState('');
  const [hyperliquidPrivateKey, setHyperliquidPrivateKey] = useState('');
  const [hyperliquidWalletAddress, setHyperliquidWalletAddress] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [useTestnet, setUseTestnet] = useState(true);

  const [maxPositionSize, setMaxPositionSize] = useState(10);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5);
  const [stopLossPercent, setStopLossPercent] = useState(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState(5);

  const [strategy, setStrategy] = useState('conservative');
  const [timeframe, setTimeframe] = useState('15m');
  const [minConfidence, setMinConfidence] = useState(70);

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      try {
        await fetch('/api/settings/onboarding', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKeys: {
              hyperliquid: { apiKey: hyperliquidApiKey, privateKey: hyperliquidPrivateKey, walletAddress: hyperliquidWalletAddress, testnet: useTestnet },
              openrouter: { apiKey: openrouterApiKey },
            },
            riskManagement: { maxPositionSize, maxDailyLoss, stopLossPercent, takeProfitPercent },
            strategy: { type: strategy, timeframe, minConfidence },
            onboardingCompleted: true,
          }),
        });
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to save onboarding settings:', error);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => navigate('/dashboard');

  const strategyOptions = [
    { id: 'conservative', label: 'Conservative', desc: 'Lower risk, fewer trades', icon: Shield },
    { id: 'balanced', label: 'Balanced', desc: 'Balanced risk/reward', icon: Scale },
    { id: 'aggressive', label: 'Aggressive', desc: 'Higher risk, more trades', icon: Zap },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.06] border border-white/[0.08] mx-auto flex items-center justify-center mb-6 overflow-hidden">
              <img src="/logo.png" alt="Allie Agent" className="w-16 h-16 drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Hello, {user?.username}
            </h2>
            <p className="text-white/40 max-w-sm mx-auto leading-relaxed">
              Welcome to Allie Agent, your AI-powered trading assistant. Let's configure your trading setup together.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {[
                { icon: Lock, label: 'Secure' },
                { icon: Cpu, label: 'AI-Powered' },
                { icon: TrendingUp, label: '24/7 Trading' },
              ].map((item) => (
                <div key={item.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 flex flex-col items-center gap-2">
                  <item.icon className="w-5 h-5 text-white/50" />
                  <span className="text-xs text-white/40">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5" /> Hyperliquid Exchange
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">API Key</label>
                  <Input type="password" value={hyperliquidApiKey} onChange={(e) => setHyperliquidApiKey(e.target.value)} placeholder="Optional — can be added later" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">Private Key</label>
                  <Input type="password" value={hyperliquidPrivateKey} onChange={(e) => setHyperliquidPrivateKey(e.target.value)} placeholder="Optional — can be added later" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">Wallet Address</label>
                  <Input type="text" value={hyperliquidWalletAddress} onChange={(e) => setHyperliquidWalletAddress(e.target.value)} placeholder="0x... (required for agent wallets)" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Toggle checked={useTestnet} onChange={setUseTestnet} />
                  <span className="text-sm text-white/50">Use Testnet (recommended for initial testing)</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-5">
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> OpenRouter AI
              </h3>
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5 block">API Key</label>
                <Input type="password" value={openrouterApiKey} onChange={(e) => setOpenrouterApiKey(e.target.value)} placeholder="Optional — can be added later" />
                <p className="text-xs text-white/25 mt-1.5">For AI-powered trading decisions (Gemini Flash)</p>
              </div>
            </div>

            <div className="bg-blue-500/[0.06] border border-blue-500/10 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400/70 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-200/60">
                <p className="font-medium text-blue-200/80">Note</p>
                <p className="mt-1">You can skip these and add them later in Settings. Without API keys the bot runs in demo mode.</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <SliderField label="Max Position Size" value={maxPositionSize} onChange={setMaxPositionSize} min={1} max={50} hint="Maximum portfolio percentage per position" />
            <SliderField label="Max Daily Loss" value={maxDailyLoss} onChange={setMaxDailyLoss} min={1} max={20} hint="Trading stops when this daily loss is reached" />
            <SliderField label="Stop Loss" value={stopLossPercent} onChange={setStopLossPercent} min={0.5} max={10} step={0.5} />
            <SliderField label="Take Profit" value={takeProfitPercent} onChange={setTakeProfitPercent} min={1} max={20} step={0.5} />

            <div className="bg-amber-500/[0.06] border border-amber-500/10 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400/70 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-200/60">
                <p className="font-medium text-amber-200/80">Recommendation</p>
                <p className="mt-1">Conservative settings for beginners: Max Position 5-10%, Max Daily Loss 3-5%</p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 block">Strategy Type</label>
              <div className="grid grid-cols-3 gap-3">
                {strategyOptions.map((strat) => {
                  const Icon = strat.icon;
                  const isActive = strategy === strat.id;
                  return (
                    <button
                      key={strat.id}
                      onClick={() => setStrategy(strat.id)}
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
                    onClick={() => setTimeframe(tf)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      timeframe === tf
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
              value={minConfidence}
              onChange={setMinConfidence}
              min={50} max={95} step={5}
              hint="Only trades with at least this AI confidence will be executed"
            />
          </div>
        );

      case 4:
        return (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/[0.1] border border-emerald-500/20 mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Setup Complete</h2>
            <p className="text-white/40 max-w-sm mx-auto mb-8">
              Your trading bot is configured and ready to start.
            </p>

            <GlassCard className="p-5 max-w-sm mx-auto text-left">
              <h3 className="text-sm font-semibold text-white/60 mb-4">Your Configuration</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Strategy', value: strategy, capitalize: true },
                  { label: 'Timeframe', value: timeframe },
                  { label: 'Max Position', value: `${maxPositionSize}%` },
                  { label: 'Max Daily Loss', value: `${maxDailyLoss}%` },
                  { label: 'Min Confidence', value: `${minConfidence}%` },
                  { label: 'Testnet', value: useTestnet ? 'Yes' : 'No' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-white/30">{row.label}</span>
                    <span className={`text-white font-medium ${row.capitalize ? 'capitalize' : ''}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <p className="text-xs text-white/20 mt-6">You can change these settings anytime in Settings.</p>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      {/* Subtle dot grid background */}
      <div className="fixed inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 max-w-2xl w-full">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/30">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-xs font-medium text-white/30">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1">
            <motion.div
              className="bg-white/30 h-1 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Content Card */}
        <GlassCard className="p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white mb-1">{steps[currentStep].title}</h1>
            <p className="text-sm text-white/30">{steps[currentStep].description}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/[0.06]">
            <button
              onClick={handleSkip}
              className="text-sm text-white/25 hover:text-white/40 transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Cancel' : 'Skip'}
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="bg-white/[0.04] hover:bg-white/[0.06] text-white/50 border border-white/[0.06] rounded-xl px-4 py-2.5 h-auto text-sm gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleNext}
                className="bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] rounded-xl px-5 py-2.5 h-auto text-sm font-medium gap-1.5"
              >
                {currentStep === steps.length - 1 ? (
                  <>Go to Dashboard <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Step Indicators */}
        <div className="flex justify-center mt-5 gap-1.5">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1.5 rounded-full transition-colors duration-300 ${
                index === currentStep ? 'bg-white/40 w-6' : index < currentStep ? 'bg-white/20 w-1.5' : 'bg-white/[0.08] w-1.5'
              }`}
              layout
            />
          ))}
        </div>
      </div>
    </div>
  );
};
