import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPendingSyncDrafts, markDraftSynced } from '../services/offlineDb';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingSyncDrafts(user?.employee_id);
      setPendingCount(pending.length);
    } catch (e) {
      console.warn('Failed to read pending drafts count:', e);
    }
  }, [user]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      refreshPendingCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount]);

  const syncPendingReports = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback({ type: 'info', message: 'Syncing local reports with server...' });

    try {
      const pendingItems = await getPendingSyncDrafts(user?.employee_id);
      if (pendingItems.length === 0) {
        setSyncFeedback({ type: 'success', message: 'All reports are up to date!' });
        setIsSyncing(false);
        return;
      }

      const payload = pendingItems.map(item => ({
        localId: item.localId,
        server_id: item.server_id,
        shgData: {
          ...item.shgData,
          status: item.status || 'draft',
          report_id: item.report_id
        },
        members: item.members,
        photos: item.photos
      }));

      const res = await api.syncBatch(payload);

      // Update local storage
      if (res && res.results) {
        for (const r of res.results) {
          await markDraftSynced(r.localId, r.server_id, r.report_id);
        }
      }

      setLastSyncTime(new Date());
      setSyncFeedback({
        type: 'success',
        message: `Successfully synchronized ${res.results?.length || pendingItems.length} records!`
      });
      await refreshPendingCount();
    } catch (err) {
      console.error('Batch sync failed:', err);
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Sync failed. Your data is safely stored locally.'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        lastSyncTime,
        syncFeedback,
        syncPendingReports,
        refreshPendingCount
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
