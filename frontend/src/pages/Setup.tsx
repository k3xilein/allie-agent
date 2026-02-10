import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';

export const Setup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  const setupAdmin = useAuthStore(state => state.setupAdmin);
  const navigate = useNavigate();

  // Check if system is already initialized
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        // Check if database is ready
        const healthResponse = await fetch('/api/health');
        if (!healthResponse.ok) {
          setDbStatus('error');
          setError('Database is not ready. Please start the backend server.');
          return;
        }

        // Check if system is initialized (users exist)
        const statusResponse = await fetch('/api/system/status');
        const data = await statusResponse.json();
        
        if (data.initialized) {
          // System already has users, redirect to login
          navigate('/login');
        } else {
          setDbStatus('ready');
        }
      } catch (err) {
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

  // Show loading state while checking system status
  if (dbStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Initializing System...</h2>
          <p className="text-gray-400">Checking database and running migrations</p>
        </div>
      </div>
    );
  }

  // Show error state if DB is not ready
  if (dbStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">System Not Ready</h2>
            <p className="text-gray-400">{error}</p>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg mb-6">
            <h3 className="text-white font-semibold mb-2">Quick Start Guide:</h3>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>Make sure Docker is running</li>
              <li>Start the database: <code className="bg-slate-600 px-2 py-1 rounded">docker-compose up -d postgres</code></li>
              <li>Start the backend: <code className="bg-slate-600 px-2 py-1 rounded">docker-compose up -d backend</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Allie Agent
          </h1>
          <p className="text-gray-400">
            Create your admin account to get started
          </p>
        </div>

        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">No CLI Required!</p>
              <p>All setup is done through this web interface. Database migrations run automatically.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={3}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Min. 3 characters, alphanumeric + underscore
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={12}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Min. 12 characters, must contain: uppercase, lowercase, number, special char
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
