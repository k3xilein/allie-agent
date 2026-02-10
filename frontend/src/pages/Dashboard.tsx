import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useDashboardStore } from '../store/useStore';
import { agentAPI } from '../api/client';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { agentStatus, accountBalance, totalPnL, todayPnL, activePositions, fetchOverview } = useDashboardStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOverview();
    const interval = setInterval(fetchOverview, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [isAuthenticated, navigate, fetchOverview]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStart = async () => {
    try {
      await agentAPI.start();
      await fetchOverview();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to start agent');
    }
  };

  const handleStop = async () => {
    if (!confirm('Stop trading? Open positions will remain active.')) return;
    try {
      await agentAPI.stop();
      await fetchOverview();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to stop agent');
    }
  };

  const handleEmergencyStop = async () => {
    const confirmed = confirm('WARNING: This will close ALL positions and stop trading immediately. Continue?');
    if (!confirmed) return;

    const confirmCode = prompt('Type CONFIRM to proceed:');
    if (confirmCode !== 'CONFIRM') return;

    try {
      await agentAPI.emergencyStop('CONFIRM');
      await fetchOverview();
      alert('Emergency stop executed successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Emergency stop failed');
    }
  };

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-yellow-500';
      case 'emergency_stop': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (agentStatus) {
      case 'running': return 'Running';
      case 'stopped': return 'Stopped';
      case 'emergency_stop': return 'Emergency Stop';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Allie Agent</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
              <span className="text-gray-300 font-medium">{getStatusText()}</span>
            </div>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">{user?.username}</span>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Emergency Banner */}
      {agentStatus === 'emergency_stop' && (
        <div className="bg-red-900/50 border-b border-red-500 px-6 py-3 text-center">
          <span className="text-red-200 font-semibold">
            ⚠ EMERGENCY STOP ACTIVE - Trading disabled until manual reset
          </span>
        </div>
      )}

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard title="Account Balance" value={`$${accountBalance.toFixed(2)}`} />
          <MetricCard 
            title="Total PnL" 
            value={`$${totalPnL.absolute.toFixed(2)}`}
            percentage={totalPnL.percentage}
            colored
          />
          <MetricCard 
            title="Today's PnL" 
            value={`$${todayPnL.absolute.toFixed(2)}`}
            percentage={todayPnL.percentage}
            colored
          />
          <MetricCard title="Active Positions" value={String(activePositions)} />
        </div>

        {/* Control Panel */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Agent Control</h2>
          <div className="flex gap-4">
            {agentStatus === 'stopped' && (
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
              >
                ▶ Start Trading
              </button>
            )}
            {agentStatus === 'running' && (
              <button
                onClick={handleStop}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition"
              >
                ⏸ Stop Trading
              </button>
            )}
            <button
              onClick={handleEmergencyStop}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
            >
              🛑 EMERGENCY STOP
            </button>
          </div>
        </div>

        {/* Positions & Trades */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Active Positions</h2>
          {activePositions === 0 ? (
            <p className="text-gray-400 text-center py-8">No active positions</p>
          ) : (
            <p className="text-gray-400">Loading positions...</p>
          )}
        </div>
      </main>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  percentage?: number;
  colored?: boolean;
}> = ({ title, value, percentage, colored }) => {
  const getColor = () => {
    if (!colored || percentage === undefined) return 'text-white';
    return percentage >= 0 ? 'text-profit' : 'text-loss';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
      <p className={`text-2xl font-bold monospace ${getColor()}`}>
        {value}
      </p>
      {percentage !== undefined && (
        <p className={`text-sm mt-1 ${getColor()}`}>
          {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
        </p>
      )}
    </div>
  );
};
