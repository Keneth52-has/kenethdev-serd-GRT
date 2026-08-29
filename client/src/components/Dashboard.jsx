import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { api } from '../services/api';
import { generateSHGPdfReport } from '../utils/pdfGenerator';
import { formatDateTime } from '../utils/location';
import ReportViewerModal from './ReportViewerModal';
import {
  PlusCircle,
  FolderOpen,
  FileCheck2,
  Download,
  Calendar,
  Building,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Eye,
  FileText
} from 'lucide-react';

export default function Dashboard({ setActiveTab, onEditDraft }) {
  const { user, isAdmin } = useAuth();
  const { isOnline, pendingCount, syncPendingReports, isSyncing } = useOffline();

  const [stats, setStats] = useState({
    totalSHGs: 0,
    drafts: 0,
    submitted: 0,
    reportsToday: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReportId, setViewReportId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user, isOnline]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const [statsData, reportsData] = await Promise.all([
          api.getStats().catch(() => ({ totalSHGs: 0, drafts: 0, submitted: 0, reportsToday: 0 })),
          api.getSHGs({ limit: 5 }).catch(() => [])
        ]);
        setStats(statsData);
        setRecentReports(reportsData.slice(0, 5));
      }
    } catch (e) {
      console.warn('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (report) => {
    try {
      const fullReport = await api.getSHG(report.id);
      await generateSHGPdfReport(fullReport, { download: true });
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6">
      
      {/* Welcome Banner with SERD Foundation Branding */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 flex-shrink-0 shadow-lg ring-2 ring-emerald-500/30 overflow-hidden hidden sm:flex items-center justify-center">
              <img src="/serd-logo.jpg" alt="SERD Foundation" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SERD FOUNDATION • GRT FORM
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  {formatDateTime(new Date().toISOString())}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Welcome, {user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
                <span>Employee ID: <strong className="text-emerald-400 font-mono">{user?.employee_id}</strong></span>
                <span>•</span>
                <span>Branch: <strong className="text-slate-200">{user?.branch || 'Head Office'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('new-shg')}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-2xl text-sm shadow-xl shadow-emerald-950/60 transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>+ New GRT Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Groups */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total GRT Groups</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalSHGs}</p>
          </div>
        </div>

        {/* Card 2: Submitted Reports */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted GRT</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{stats.submitted}</p>
          </div>
        </div>

        {/* Card 3: Draft Reports */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Draft GRT</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{stats.drafts}</p>
          </div>
        </div>

        {/* Card 4: Reports Today */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Today</p>
            <p className="text-2xl font-black text-sky-700 mt-0.5">{stats.reportsToday}</p>
          </div>
        </div>

      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tile 1: New GRT Form */}
        <div
          onClick={() => setActiveTab('new-shg')}
          className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-2xl p-5 cursor-pointer shadow-md transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <PlusCircle className="w-8 h-8 text-emerald-200" />
            <ArrowRight className="w-5 h-5 text-emerald-300 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold">New GRT Documentation</h3>
            <p className="text-xs text-emerald-100 mt-1">10 Members + Group Photo with GPS stamp</p>
          </div>
        </div>

        {/* Tile 2: Saved Drafts */}
        <div
          onClick={() => setActiveTab('reports')}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 cursor-pointer shadow-sm transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <FolderOpen className="w-8 h-8 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {stats.drafts} Drafts
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900">Saved / Draft Reports</h3>
            <p className="text-xs text-slate-500 mt-1">Resume unfinished GRT documentation</p>
          </div>
        </div>

        {/* Tile 3: Submitted Reports */}
        <div
          onClick={() => setActiveTab('reports')}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 cursor-pointer shadow-sm transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <FileCheck2 className="w-8 h-8 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {stats.submitted} Verified
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900">Submitted GRT Reports</h3>
            <p className="text-xs text-slate-500 mt-1">View verified & audited loan records</p>
          </div>
        </div>

        {/* Tile 4: Download PDF Center */}
        <div
          onClick={() => setActiveTab('reports')}
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-5 cursor-pointer shadow-sm transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <Download className="w-8 h-8 text-sky-600" />
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-slate-900">Download GRT Reports</h3>
            <p className="text-xs text-slate-500 mt-1">Official SERD Foundation PDF reports</p>
          </div>
        </div>

      </div>

      {/* Recent SHG Activity Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent GRT Form Activity</h2>
            <p className="text-xs text-slate-500">Latest field verifications and group audit submissions</p>
          </div>

          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading activity...</div>
        ) : recentReports.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-500">No GRT documentation records created yet.</p>
            <button
              onClick={() => setActiveTab('new-shg')}
              className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              Start First GRT Form
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentReports.map((r) => {
              const isSubmitted = r.status === 'submitted';
              return (
                <div key={r.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 rounded-xl px-2.5 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isSubmitted ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{r.shg_name}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{r.report_id || `DRAFT-${r.id}`}</span>
                        <span>•</span>
                        <span>{r.village}, {r.taluk}</span>
                        <span>•</span>
                        <strong className="text-emerald-700 font-semibold">₹{Number(r.loan_amount || 0).toLocaleString('en-IN')}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setViewReportId(r.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(r)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for viewing report */}
      {viewReportId && (
        <ReportViewerModal
          shgId={viewReportId}
          onClose={() => setViewReportId(null)}
        />
      )}

    </div>
  );
}
