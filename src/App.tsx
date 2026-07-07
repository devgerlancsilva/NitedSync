/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from './components/FirebaseProvider';
import { KanbanBoard } from './components/KanbanBoard';
import { DailyActivitiesView } from './components/DailyActivitiesView';
import { ReportsView } from './components/ReportsView';
import { UserManagementView } from './components/UserManagementView';
import {
  LogOut, Layout, Shield, Briefcase, Users,
  ClipboardList, BarChart3, Eye, EyeOff, Loader2, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

type ViewType = 'kanban' | 'daily' | 'reports' | 'users';

const NAV_ITEMS: { id: ViewType; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: 'kanban',  label: 'Story',            icon: Layout },
  { id: 'daily',   label: 'Daily', icon: ClipboardList },
  { id: 'reports', label: 'Relatórios',          icon: BarChart3 },
  { id: 'users',   label: 'Usuários',            icon: Users, adminOnly: true },
];

const ROLE_CONFIG = {
  admin:       { label: 'Administrador', color: 'text-indigo-400',  bg: 'bg-indigo-500/20',  icon: Shield },
  supervisor:  { label: 'Supervisor',    color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: Briefcase },
  colaborador: { label: 'Colaborador',   color: 'text-amber-400',   bg: 'bg-amber-500/20',   icon: Users },
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login, authError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    await login(email.trim(), password);
  };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
            <Layout className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">NitedSync</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
            Portal de Produtividade
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface-panel border border-white/5 rounded-[28px] p-8 shadow-2xl">
          <h2 className="text-lg font-black text-white mb-6">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                E-mail
              </label>
              <input
                type="email"
                id="login-email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-surface-base/60 border border-white/5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-surface-base/60 border border-white/5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-rose-300 text-sm">{authError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
                : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Test credentials hint */}
        <div className="mt-5 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Acesso de teste
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            <span className="text-slate-400">teste@nitedsync.com</span>
            {' '}·{' '}
            <span className="text-slate-400">teste123</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('kanban');

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
          Iniciando NitedSync...
        </p>
      </div>
    );
  }

  // Not logged in → show login
  if (!user || !profile) return <LoginScreen />;

  const roleConf = ROLE_CONFIG[profile.role];
  const RoleIcon = roleConf.icon;
  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || profile.role === 'admin');

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Header */}
      <header className="bg-surface-panel border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight hidden md:inline">NitedSync</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/5 overflow-x-auto scrollbar-none">
            {visibleNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  currentView === item.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User info + logout */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-xl border border-white/5">
              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", roleConf.bg)}>
                <RoleIcon className={cn("w-3.5 h-3.5", roleConf.color)} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-white leading-none">
                  {profile.name.split(' ')[0]}
                </p>
                <p className={cn("text-[9px] font-bold uppercase tracking-widest leading-none mt-0.5", roleConf.color)}>
                  {roleConf.label}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sair"
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'kanban'  && <KanbanBoard />}
            {currentView === 'daily'   && <DailyActivitiesView />}
            {currentView === 'reports' && <ReportsView />}
            {currentView === 'users' && profile.role === 'admin' && <UserManagementView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
