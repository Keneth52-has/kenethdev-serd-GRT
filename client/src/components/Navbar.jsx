import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import {
  FileText,
  PlusCircle,
  FolderOpen,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  Menu,
  X,
  MapPin,
  Building
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const { isOnline, pendingCount, syncPendingReports, isSyncing } = useOffline();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FolderOpen },
    { id: 'new-shg', label: 'New GRT Form', icon: PlusCircle, highlight: true },
    { id: 'reports', label: 'GRT Reports & History', icon: FileText },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Portal', icon: ShieldCheck }] : [])
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-md shadow-emerald-950/50 ring-2 ring-emerald-500/40 overflow-hidden">
              <img
                src="/serd-logo.jpg"
                alt="SERD FOUNDATION"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight leading-tight flex items-center gap-2">
                <span className="text-emerald-400">SERD FOUNDATION</span>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  GRT Form
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal hidden sm:block">Group Recognition & Photo GPS Audit System</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : item.highlight
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Section */}
          <div className="flex items-center space-x-3">
            
            {/* Online / Offline & Sync Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                }`}
                title={isOnline ? 'Network Connected' : 'Working Offline - Data Saved Locally'}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {pendingCount > 0 && (
                <button
                  onClick={syncPendingReports}
                  disabled={!isOnline || isSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold transition-all"
                  title="Click to synchronize pending offline drafts"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{pendingCount} Pending Sync</span>
                </button>
              )}
            </div>

            {/* User Profile Pill (Desktop) */}
            <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-semibold text-white leading-tight flex items-center justify-end gap-1.5">
                  <span>{user?.name}</span>
                  {isAdmin && (
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-end gap-1">
                  <span>{user?.employee_id}</span>
                  {user?.branch && <span>• {user.branch}</span>}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-5 space-y-3">
          <div className="p-3 bg-slate-800/80 rounded-xl mb-3 border border-slate-700/50">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>{user?.name}</span>
              <span className="text-xs text-emerald-400 font-mono">({user?.employee_id})</span>
            </div>
            {user?.branch && (
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>{user.branch}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold'
                      : item.highlight
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
