import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { getAllLocalDrafts, deleteLocalDraft } from '../services/offlineDb';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { generateSHGPdfReport } from '../utils/pdfGenerator';
import { formatDateTime } from '../utils/location';
import ReportViewerModal from './ReportViewerModal';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Building,
  MapPin,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function ReportHistory({ onEditDraft, onNewSHG }) {
  const { user, isAdmin } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  // Reports data
  const [reports, setReports] = useState([]);
  const [localDrafts, setLocalDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, SUBMITTED, DRAFT
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Active view modal
  const [viewReportId, setViewReportId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const drafts = await getAllLocalDrafts(user?.employee_id);
      setLocalDrafts(drafts);

      if (isOnline) {
        const params = {};
        if (statusFilter !== 'ALL') params.status = statusFilter.toLowerCase();
        if (searchQuery) params.search = searchQuery;
        if (villageFilter) params.village = villageFilter;
        if (branchFilter) params.branch = branchFilter;
        if (dateFilter !== 'ALL' && dateFilter !== 'CUSTOM') params.dateFilter = dateFilter.toLowerCase();
        if (dateFilter === 'CUSTOM' && startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        }

        const serverData = await api.getSHGs(params);
        setReports(serverData);
      } else {
        setReports(drafts.map(d => ({
          ...d.shgData,
          id: d.localId,
          report_id: d.report_id || `LOCAL-${d.localId}`,
          status: d.status || 'draft',
          employee_name: user?.name,
          employee_id: user?.employee_id,
          created_at: d.updated_at,
          submitted_at: d.status === 'submitted' ? d.updated_at : null,
          memberCount: d.members?.length || 0,
          photoCount: d.photos?.length || 0,
          isLocalOnly: true
        })));
      }
    } catch (err) {
      console.warn('Error fetching reports:', err);
      setError(err.message || 'Failed to load report records');
    } finally {
      setLoading(false);
    }
  }, [user, isOnline, statusFilter, searchQuery, villageFilter, branchFilter, dateFilter, startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Instant PDF download
  const handleDownloadPDF = async (report) => {
    setDownloadingId(report.id);
    try {
      let fullReport = report;
      if (!report.members || report.members.length === 0) {
        if (!report.isLocalOnly && isOnline) {
          fullReport = await api.getSHG(report.id);
        }
      }
      await generateSHGPdfReport(fullReport, { download: true });
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (id, isLocal) => {
    if (!window.confirm('Are you sure you want to delete this draft? This cannot be undone.')) return;
    try {
      if (isLocal) {
        await deleteLocalDraft(id);
      } else {
        await api.deleteSHG(id);
      }
      await refreshPendingCount();
      fetchReports();
    } catch (err) {
      alert('Failed to delete draft: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
              SERD FOUNDATION
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <FileText className="w-7 h-7 text-emerald-700" />
            <span>GRT Form Documentation History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search, filter, and download verified SERD Foundation GRT loan records and dossiers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onNewSHG}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-900/20"
          >
            <span>+ New GRT Form</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Group Name, Report ID, Village, Branch..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses (Drafts & Submitted)</option>
              <option value="SUBMITTED">✅ Submitted Only</option>
              <option value="DRAFT">📝 Drafts Only</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">📅 Today</option>
              <option value="WEEK">📅 This Week (Last 7 Days)</option>
              <option value="MONTH">📅 This Month (Last 30 Days)</option>
              <option value="CUSTOM">📅 Custom Range...</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">From Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
            <span className="text-xs font-semibold text-slate-600">To Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
            <button
              onClick={fetchReports}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              Apply Dates
            </button>
          </div>
        )}
      </div>

      {/* Reports Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-500">Loading GRT documentation records...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No GRT reports found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No SERD Foundation records match your current search or filter criteria.
            </p>
            <button
              onClick={onNewSHG}
              className="mt-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl"
            >
              Start New GRT Form
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Report ID</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Group Details</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Officer / Branch</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Loan Amount</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">Date & Time</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => {
                  const isSubmitted = r.status === 'submitted';
                  const isDownloading = downloadingId === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Report ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.report_id || `DRAFT-${r.id}`}
                      </td>

                      {/* SHG Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{r.shg_name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{r.village || 'Village'}, {r.taluk || ''}</span>
                        </div>
                      </td>

                      {/* Officer & Branch */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{r.employee_name || user?.name}</div>
                        <div className="text-[11px] text-slate-500">{r.branch_name || user?.branch}</div>
                      </td>

                      {/* Loan Amount */}
                      <td className="py-3.5 px-4 font-bold text-emerald-800">
                        ₹ {Number(r.loan_amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>GRT Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {formatDateTime(r.submitted_at || r.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View Details */}
                          <button
                            onClick={() => setViewReportId(r.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            title="View Full Report with Photos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadPDF(r)}
                            disabled={isDownloading}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                            title="Download Official PDF"
                          >
                            {isDownloading ? (
                              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* Edit if draft */}
                          {!isSubmitted && onEditDraft && (
                            <button
                              onClick={() => onEditDraft(r.id)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors"
                              title="Resume / Edit Draft"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete if draft */}
                          {!isSubmitted && (
                            <button
                              onClick={() => handleDeleteDraft(r.id, r.isLocalOnly)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Full Report Details Modal */}
      {viewReportId && (
        <ReportViewerModal
          shgId={viewReportId}
          onClose={() => setViewReportId(null)}
        />
      )}

    </div>
  );
}
