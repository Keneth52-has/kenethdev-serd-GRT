import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import Login from './components/Login';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import Dashboard from './components/Dashboard';
import SHGDocumentationWizard from './components/SHGDocumentationWizard';
import ReportHistory from './components/ReportHistory';
import AdminPanel from './components/AdminPanel';

function MainApp() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeDraftId, setActiveDraftId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4 text-white">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">Initializing SHG Loan System...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleStartNewSHG = () => {
    setActiveDraftId(null);
    setActiveTab('new-shg');
  };

  const handleEditDraft = (draftId) => {
    setActiveDraftId(draftId);
    setActiveTab('new-shg');
  };

  const handleWizardFinished = (nextTab = 'reports') => {
    setActiveDraftId(null);
    setActiveTab(nextTab);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sticky Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Offline Status & Batch Sync Banner */}
      <OfflineBanner />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            setActiveTab={setActiveTab}
            onEditDraft={handleEditDraft}
          />
        )}

        {activeTab === 'new-shg' && (
          <SHGDocumentationWizard
            initialDraftId={activeDraftId}
            onFinished={handleWizardFinished}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'reports' && (
          <ReportHistory
            onEditDraft={handleEditDraft}
            onNewSHG={handleStartNewSHG}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <MainApp />
      </OfflineProvider>
    </AuthProvider>
  );
}
