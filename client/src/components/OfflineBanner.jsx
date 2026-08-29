import React from 'react';
import { useOffline } from '../context/OfflineContext';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncFeedback, syncPendingReports } = useOffline();

  if (isOnline && pendingCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
        
        {/* Sync Feedback Message */}
        {syncFeedback && (
          <div className={`flex items-center justify-between py-1 px-3 rounded-lg text-xs font-medium mb-1 ${
            syncFeedback.type === 'success' ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/30' :
            syncFeedback.type === 'error' ? 'bg-rose-900/60 text-rose-200 border border-rose-500/30' :
            'bg-sky-900/60 text-sky-200 border border-sky-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {syncFeedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              {syncFeedback.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
              <span>{syncFeedback.message}</span>
            </div>
          </div>
        )}

        {/* Offline notification */}
        {!isOnline && (
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span>
                <strong>Working Offline:</strong> No internet connection. You can continue capturing photos and entering data. Everything is saved locally.
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Local drafts will sync once connection returns.
            </div>
          </div>
        )}

        {/* Pending Sync notice when online */}
        {isOnline && pendingCount > 0 && !syncFeedback && (
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>
                You have <strong>{pendingCount} offline draft{pendingCount > 1 ? 's' : ''}</strong> ready to sync to the central server.
              </span>
            </div>
            <button
              onClick={syncPendingReports}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
