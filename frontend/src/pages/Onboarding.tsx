import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';

interface OnboardingStep {
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'Willkommen bei Allie Agent',
    description: 'Lass uns deinen Trading-Bot in wenigen Schritten einrichten.',
  },
  {
    title: 'API-Keys konfigurieren',
    description: 'Verbinde deine Exchange- und AI-APIs für automatisches Trading.',
  },
  {
    title: 'Risk Management',
    description: 'Definiere deine Risiko-Parameter und Trading-Limits.',
  },
  {
    title: 'Trading-Strategie',
    description: 'Wähle deine bevorzugte Trading-Strategie und Zeitrahmen.',
  },
  {
    title: 'Bereit zum Start!',
    description: 'Alles eingerichtet. Du kannst jetzt mit dem Trading beginnen.',
  },
];

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Step 2: API Keys
  const [hyperliquidApiKey, setHyperliquidApiKey] = useState('');
  const [hyperliquidPrivateKey, setHyperliquidPrivateKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [useTestnet, setUseTestnet] = useState(true);
  
  // Step 3: Risk Management
  const [maxPositionSize, setMaxPositionSize] = useState(10);
  const [maxDailyLoss, setMaxDailyLoss] = useState(5);
  const [stopLossPercent, setStopLossPercent] = useState(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState(5);
  
  // Step 4: Strategy
  const [strategy, setStrategy] = useState('conservative');
  const [timeframe, setTimeframe] = useState('15m');
  const [minConfidence, setMinConfidence] = useState(70);

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Save all settings
      try {
        await fetch('/api/settings/onboarding', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKeys: {
              hyperliquid: {
                apiKey: hyperliquidApiKey,
                privateKey: hyperliquidPrivateKey,
                testnet: useTestnet,
              },
              openrouter: {
                apiKey: openrouterApiKey,
              },
            },
            riskManagement: {
              maxPositionSize,
              maxDailyLoss,
              stopLossPercent,
              takeProfitPercent,
            },
            strategy: {
              type: strategy,
              timeframe,
              minConfidence,
            },
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

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Hallo, {user?.username}!</h2>
            <p className="text-gray-300 text-lg max-w-md mx-auto">
              Willkommen bei Allie Agent, deinem KI-gestützten Trading-Assistenten. 
              Lass uns zusammen dein Trading-Setup konfigurieren.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-2xl mb-2">🔐</div>
                <div className="text-sm text-gray-300">Sicher</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-2xl mb-2">🤖</div>
                <div className="text-sm text-gray-300">KI-Powered</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-2xl mb-2">📈</div>
                <div className="text-sm text-gray-300">24/7 Trading</div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Exchange API (Hyperliquid)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={hyperliquidApiKey}
                    onChange={(e) => setHyperliquidApiKey(e.target.value)}
                    placeholder="Optional - kann später hinzugefügt werden"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Private Key
                  </label>
                  <input
                    type="password"
                    value={hyperliquidPrivateKey}
                    onChange={(e) => setHyperliquidPrivateKey(e.target.value)}
                    placeholder="Optional - kann später hinzugefügt werden"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="testnet"
                    checked={useTestnet}
                    onChange={(e) => setUseTestnet(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="testnet" className="ml-2 text-sm text-gray-300">
                    Testnet verwenden (empfohlen für erste Tests)
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-4">AI API (OpenRouter)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    value={openrouterApiKey}
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                    placeholder="Optional - kann später hinzugefügt werden"
                    className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Für KI-gestützte Trading-Entscheidungen (Kimi K2 Model)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-200">
                  <p className="font-medium">Hinweis</p>
                  <p className="mt-1">
                    Du kannst diese Einstellungen überspringen und später in den Einstellungen hinzufügen. 
                    Ohne API-Keys läuft der Bot im Demo-Modus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max. Position Size (% des Portfolios)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={maxPositionSize}
                  onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-16 text-right">{maxPositionSize}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Maximaler Anteil deines Portfolios pro Position
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max. Daily Loss (% des Portfolios)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={maxDailyLoss}
                  onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-16 text-right">{maxDailyLoss}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Bot stoppt bei Erreichen dieses täglichen Verlusts
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stop Loss (%)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={stopLossPercent}
                  onChange={(e) => setStopLossPercent(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-16 text-right">{stopLossPercent}%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Take Profit (%)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={takeProfitPercent}
                  onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-16 text-right">{takeProfitPercent}%</span>
              </div>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-yellow-200">
                  <p className="font-medium">Wichtig</p>
                  <p className="mt-1">
                    Conservative Settings für Anfänger empfohlen: Max Position 5-10%, Max Daily Loss 3-5%
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Trading-Strategie
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['conservative', 'balanced', 'aggressive'].map((strat) => (
                  <button
                    key={strat}
                    onClick={() => setStrategy(strat)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      strategy === strat
                        ? 'border-blue-500 bg-blue-600/20'
                        : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {strat === 'conservative' && '🛡️'}
                      {strat === 'balanced' && '⚖️'}
                      {strat === 'aggressive' && '🚀'}
                    </div>
                    <div className="text-white font-medium capitalize">{strat}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {strat === 'conservative' && 'Weniger Trades, höhere Sicherheit'}
                      {strat === 'balanced' && 'Ausgewogenes Risiko/Ertrag'}
                      {strat === 'aggressive' && 'Mehr Trades, höheres Risiko'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Zeitrahmen
              </label>
              <div className="grid grid-cols-4 gap-3">
                {['5m', '15m', '1h', '4h'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      timeframe === tf
                        ? 'border-blue-500 bg-blue-600/20 text-white'
                        : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Analyse-Intervall für Trading-Entscheidungen
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimale KI-Konfidenz (%)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-semibold w-16 text-right">{minConfidence}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Nur Trades mit mindestens dieser KI-Konfidenz werden ausgeführt
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-24 h-24 bg-green-600 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Setup abgeschlossen!</h2>
            <p className="text-gray-300 text-lg max-w-md mx-auto mb-8">
              Dein Trading-Bot ist jetzt konfiguriert und bereit zum Start.
            </p>
            
            <div className="bg-slate-800 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Deine Einstellungen:</h3>
              <div className="space-y-3 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Strategie:</span>
                  <span className="text-white font-medium capitalize">{strategy}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Zeitrahmen:</span>
                  <span className="text-white font-medium">{timeframe}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Position:</span>
                  <span className="text-white font-medium">{maxPositionSize}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Daily Loss:</span>
                  <span className="text-white font-medium">{maxDailyLoss}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Min. Konfidenz:</span>
                  <span className="text-white font-medium">{minConfidence}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Testnet:</span>
                  <span className="text-white font-medium">{useTestnet ? 'Ja' : 'Nein'}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-6">
              Du kannst diese Einstellungen jederzeit in den Einstellungen ändern.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">
              Schritt {currentStep + 1} von {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-400">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {steps[currentStep].title}
            </h1>
            <p className="text-gray-400">{steps[currentStep].description}</p>
          </div>

          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700">
            <button
              onClick={handleSkip}
              className="px-6 py-2 text-gray-400 hover:text-white transition"
            >
              {currentStep === steps.length - 1 ? 'Abbrechen' : 'Überspringen'}
            </button>

            <div className="flex items-center space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                >
                  Zurück
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {currentStep === steps.length - 1 ? 'Zum Dashboard' : 'Weiter'}
              </button>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mt-6 space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-blue-600 w-8'
                  : index < currentStep
                  ? 'bg-blue-400'
                  : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
