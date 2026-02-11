import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useDashboardStore } from '@/store/useStore';
import { StatusDot } from '@/components/ui/shared';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Settings,
  LogOut,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { agentStatus } = useDashboardStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const statusLabel: Record<string, string> = {
    running: 'Active',
    stopped: 'Idle',
    emergency_stop: 'Emergency',
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar */}
      <aside className="w-[240px] flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Allie Agent" className="w-7 h-7 drop-shadow-md" />
            </div>
            <div>
              <span className="text-white font-semibold text-sm tracking-tight">Allie Agent</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StatusDot status={agentStatus} size="sm" />
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                  {statusLabel[agentStatus] || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.08]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center">
              <span className="text-xs text-white/60 font-semibold uppercase">
                {user?.username?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/70 font-medium truncate">{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-white/60 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-8 max-w-[1200px] mx-auto"
        >
          {children}
        </motion.div>
      </main>

      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
};
