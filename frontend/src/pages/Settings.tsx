import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';

interface SettingsData {
  apiKeys: {
    hyperliquid: {
      apiKey: string;
      privateKey: string;
      testnet: boolean;
    };
    openrouter: {
      apiKey: string;
    };
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
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('api');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [settings, setSettings] = useState<SettingsData>({
    apiKeys: {
      hyperliquid: {
        apiKey: '',
        privateKey: '',
        testnet: true,
      },
      openrouter: {
        apiKey: '',
      },
    },
    riskManagement: {
      maxPositionSize: 10,
      maxDailyLoss: 5,
      stopLossPercent: 2,
      takeProfitPercent: 5,
    },
    strategy: {
      type: 'balanced',
      timeframe: '15m',
      minConfidence: 70,
    },
    notifications: {
      email: false,
      tradeAlerts: true,
      dailyReport: false,
    },
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Fehler beim Speichern der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'api', label: 'API Keys', icon: '🔑' },
    { id: 'risk', label: 'Risk Management', icon: '⚠️' },
    { id: 'strategy', label: 'Strategie', icon: '📊' },
    { id: 'notifications', label: 'Benachrichtigungen', icon: '🔔' },
    { id: 'account', label: 'Account', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-slate-800 rounded-lg p-4 sticky top-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-slate-800 rounded-lg p-6">
              {/* API Keys Tab */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">API Keys</h2>
                    <p className="text-gray-400 mb-6">
                      Konfiguriere deine Exchange- und AI-API-Keys für automatisches Trading.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Hyperliquid Exchange</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={settings.apiKeys.hyperliquid.apiKey}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                apiKeys: {
                                  ...settings.apiKeys,
                                  hyperliquid: {
                                    ...settings.apiKeys.hyperliquid,
                                    apiKey: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="Dein Hyperliquid API Key"
                            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Private Key
                          </label>
                          <input
                            type="password"
                            value={settings.apiKeys.hyperliquid.privateKey}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                apiKeys: {
                                  ...settings.apiKeys,
                                  hyperliquid: {
                                    ...settings.apiKeys.hyperliquid,
                                    privateKey: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="Dein Private Key"
                            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="testnet"
                            checked={settings.apiKeys.hyperliquid.testnet}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                apiKeys: {
                                  ...settings.apiKeys,
                                  hyperliquid: {
                                    ...settings.apiKeys.hyperliquid,
                                    testnet: e.target.checked,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 text-blue-600 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="testnet" className="ml-2 text-sm text-gray-300">
                            Testnet verwenden
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">OpenRouter AI</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          OpenRouter API Key
                        </label>
                        <input
                          type="password"
                          value={settings.apiKeys.openrouter.apiKey}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              apiKeys: {
                                ...settings.apiKeys,
                                openrouter: {
                                  apiKey: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="Dein OpenRouter API Key"
                          className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Für KI-gestützte Trading-Entscheidungen (Kimi K2 Model)
                        </p>
                      </div>
                    </div>

                    <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-yellow-200">
                          <p className="font-medium">Sicherheitshinweis</p>
                          <p className="mt-1">
                            Deine API-Keys werden verschlüsselt gespeichert. Verwende Keys mit eingeschränkten Berechtigungen (nur Trading, kein Withdrawal).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Management Tab */}
              {activeTab === 'risk' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Risk Management</h2>
                    <p className="text-gray-400 mb-6">
                      Definiere deine Risiko-Parameter und Trading-Limits.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max. Position Size (% des Portfolios)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={settings.riskManagement.maxPositionSize}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            riskManagement: {
                              ...settings.riskManagement,
                              maxPositionSize: Number(e.target.value),
                            },
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-white font-semibold w-16 text-right">
                        {settings.riskManagement.maxPositionSize}%
                      </span>
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
                        value={settings.riskManagement.maxDailyLoss}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            riskManagement: {
                              ...settings.riskManagement,
                              maxDailyLoss: Number(e.target.value),
                            },
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-white font-semibold w-16 text-right">
                        {settings.riskManagement.maxDailyLoss}%
                      </span>
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
                        value={settings.riskManagement.stopLossPercent}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            riskManagement: {
                              ...settings.riskManagement,
                              stopLossPercent: Number(e.target.value),
                            },
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-white font-semibold w-16 text-right">
                        {settings.riskManagement.stopLossPercent}%
                      </span>
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
                        value={settings.riskManagement.takeProfitPercent}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            riskManagement: {
                              ...settings.riskManagement,
                              takeProfitPercent: Number(e.target.value),
                            },
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-white font-semibold w-16 text-right">
                        {settings.riskManagement.takeProfitPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Strategy Tab */}
              {activeTab === 'strategy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Trading-Strategie</h2>
                    <p className="text-gray-400 mb-6">
                      Wähle deine bevorzugte Trading-Strategie und Zeitrahmen.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Strategie-Typ
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {['conservative', 'balanced', 'aggressive'].map((strat) => (
                        <button
                          key={strat}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              strategy: { ...settings.strategy, type: strat },
                            })
                          }
                          className={`p-4 rounded-lg border-2 transition-all ${
                            settings.strategy.type === strat
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
                          onClick={() =>
                            setSettings({
                              ...settings,
                              strategy: { ...settings.strategy, timeframe: tf },
                            })
                          }
                          className={`py-3 px-4 rounded-lg border-2 transition-all ${
                            settings.strategy.timeframe === tf
                              ? 'border-blue-500 bg-blue-600/20 text-white'
                              : 'border-slate-600 bg-slate-700 text-gray-300 hover:border-slate-500'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
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
                        value={settings.strategy.minConfidence}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            strategy: {
                              ...settings.strategy,
                              minConfidence: Number(e.target.value),
                            },
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-white font-semibold w-16 text-right">
                        {settings.strategy.minConfidence}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Nur Trades mit mindestens dieser KI-Konfidenz werden ausgeführt
                    </p>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Benachrichtigungen</h2>
                    <p className="text-gray-400 mb-6">
                      Konfiguriere deine Benachrichtigungseinstellungen.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">Email-Benachrichtigungen</div>
                        <div className="text-sm text-gray-400">
                          Erhalte wichtige Updates per Email
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                email: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">Trade Alerts</div>
                        <div className="text-sm text-gray-400">
                          Benachrichtigung bei jedem ausgeführten Trade
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.tradeAlerts}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                tradeAlerts: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">Daily Report</div>
                        <div className="text-sm text-gray-400">
                          Tägliche Zusammenfassung deiner Trading-Performance
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.dailyReport}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                dailyReport: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Account-Einstellungen</h2>
                    <p className="text-gray-400 mb-6">
                      Verwalte deine Account-Informationen und Sicherheit.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">Username</span>
                        <span className="text-white font-medium">{user?.username}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">Account erstellt</span>
                        <span className="text-white font-medium">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Passwort ändern</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Aktuelles Passwort
                          </label>
                          <input
                            type="password"
                            placeholder="Aktuelles Passwort"
                            className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Neues Passwort
                          </label>
                          <input
                            type="password"
                            placeholder="Neues Passwort"
                            className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Passwort bestätigen
                          </label>
                          <input
                            type="password"
                            placeholder="Passwort bestätigen"
                            className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                          Passwort ändern
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                      <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
                      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">Account löschen</div>
                            <div className="text-sm text-gray-400">
                              Diese Aktion kann nicht rückgängig gemacht werden
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                            Account löschen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700">
                {success && (
                  <div className="flex items-center text-green-400">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Änderungen gespeichert!</span>
                  </div>
                )}
                {!success && <div />}
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Speichern...' : 'Änderungen speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
