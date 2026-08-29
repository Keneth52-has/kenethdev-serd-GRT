import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { generateSHGPdfReport } from '../utils/pdfGenerator';
import { formatDateTime } from '../utils/location';
import ReportViewerModal from './ReportViewerModal';
import {
  Users,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Activity,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Building,
  RefreshCw,
  Eye,
  KeyRound,
  FileDown
} from 'lucide-react';

export default function AdminPanel() {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // overview, employees, reports, export, audit

  // Admin stats
  const [stats, setStats] = useState({
    totalSHGs: 0,
    drafts: 0,
    submitted: 0,
    reportsToday: 0,
    totalMembers: 0,
    totalPhotos: 0,
    activeEmployees: 0
  });

  // Data lists
  const [employees, setEmployees] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for reports tab
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Employee Modal
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'employee',
    branch: ''
  });

  // Report details modal
  const [viewReportId, setViewReportId] = useState(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, empData, reportsData, logsData] = await Promise.all([
        api.getStats().catch(() => ({})),
        api.getEmployees().catch(() => []),
        api.getSHGs().catch(() => []),
        api.getAuditLogs(100).catch(() => [])
      ]);

      setStats(statsData);
      setEmployees(empData);
      setAllReports(reportsData);
      setAuditLogs(logsData);
    } catch (err) {
      console.error('Admin data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Employee Save / Edit
  const handleOpenCreateEmployee = () => {
    setEditingEmployee(null);
    setEmployeeFormData({
      employee_id: `EMP00${employees.length + 1}`,
      name: '',
      email: '',
      phone: '',
      password: 'field' + (employees.length + 100),
      role: 'employee',
      branch: 'Mandya Rural Branch'
    });
    setShowEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      employee_id: emp.employee_id,
      name: emp.name,
      email: emp.email || '',
      phone: emp.phone || '',
      password: '',
      role: emp.role || 'employee',
      branch: emp.branch || ''
    });
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, employeeFormData);
      } else {
        await api.createEmployee(employeeFormData);
      }
      setShowEmployeeModal(false);
      loadAdminData();
    } catch (err) {
      alert('Employee save failed: ' + err.message);
    }
  };

  const handleToggleEmployeeStatus = async (emp) => {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to change ${emp.name}'s status to ${newStatus}?`)) return;
    try {
      await api.updateEmployee(emp.id, { status: newStatus });
      loadAdminData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Bulk Download all submitted PDFs
  const handleBulkDownload = async () => {
    const submittedList = allReports.filter(r => r.status === 'submitted');
    if (submittedList.length === 0) {
      alert('No submitted GRT reports available for download.');
      return;
    }

    setIsBulkDownloading(true);
    try {
      for (const rep of submittedList) {
        const full = await api.getSHG(rep.id);
        await generateSHGPdfReport(full, { download: true });
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err) {
      alert('Bulk download encountered an issue: ' + err.message);
    } finally {
      setIsBulkDownloading(false);
    }
  };

  // Filtered reports for the admin table
  const filteredReports = allReports.filter(r => {
    const matchesSearch = !searchQuery || 
      (r.shg_name && r.shg_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.report_id && r.report_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.village && r.village.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.employee_name && r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesBranch = !branchFilter || r.branch_name === branchFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter.toLowerCase();

    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
              SERD FOUNDATION • ADMIN PORTAL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-700" />
            <span>GRT Operations & Executive Auditing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage field staff, inspect all submitted SERD Foundation GRT records, download bulk reports, and export datasets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh All Data</span>
          </button>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {[
          { id: 'overview', label: 'Executive Overview', icon: Activity },
          { id: 'reports', label: `All GRT Reports (${allReports.length})`, icon: FileText },
          { id: 'employees', label: `Officers & Staff (${employees.length})`, icon: Users },
          { id: 'export', label: 'Excel / CSV Exports', icon: FileSpreadsheet },
          { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 1. OVERVIEW SUBTAB */}
      {/* ======================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Executive Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total GRT Groups</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{stats.totalSHGs}</p>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                {stats.submitted} verified submitted
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Members Geotagged</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{stats.totalMembers || (stats.totalSHGs * 10)}</p>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                10 members per group
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Field Officers</p>
              <p className="text-2xl sm:text-3xl font-black text-sky-700 mt-1">{stats.activeEmployees || employees.length}</p>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                Across regional branches
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Today</p>
              <p className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1">{stats.reportsToday}</p>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                Live field submissions
              </span>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveSubTab('export')}
              className="bg-emerald-900 hover:bg-emerald-800 text-white rounded-2xl p-6 cursor-pointer shadow-lg transition-all"
            >
              <FileSpreadsheet className="w-8 h-8 text-emerald-300 mb-3" />
              <h3 className="text-base font-bold">Export SERD Dataset</h3>
              <p className="text-xs text-emerald-100 mt-1">Download complete GRT records and Member GPS roster to Excel & CSV</p>
            </div>

            <div
              onClick={handleBulkDownload}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-6 cursor-pointer shadow-lg transition-all"
            >
              <Download className="w-8 h-8 text-sky-300 mb-3" />
              <h3 className="text-base font-bold">Bulk Download Verified PDFs</h3>
              <p className="text-xs text-slate-300 mt-1">Generate and download official PDF dossiers for all submitted GRT groups</p>
            </div>

            <div
              onClick={() => setActiveSubTab('employees')}
              className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 cursor-pointer shadow-sm transition-all"
            >
              <UserPlus className="w-8 h-8 text-amber-600 mb-3" />
              <h3 className="text-base font-bold text-slate-900">Manage Field Staff</h3>
              <p className="text-xs text-slate-500 mt-1">Create officer accounts, assign branches, and manage login access</p>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ALL SHG REPORTS SUBTAB */}
      {/* ======================================================== */}
      {activeSubTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              <input
                type="text"
                placeholder="Search Group Name, Report ID, Village, Officer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">✅ Submitted</option>
                <option value="DRAFT">📝 Drafts</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDownload}
                disabled={isBulkDownloading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{isBulkDownloading ? 'Downloading...' : 'Bulk PDF Download'}</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-3.5 font-bold">Report ID</th>
                  <th className="py-3 px-3.5 font-bold">Group Name</th>
                  <th className="py-3 px-3.5 font-bold">Village & GP</th>
                  <th className="py-3 px-3.5 font-bold">Field Officer</th>
                  <th className="py-3 px-3.5 font-bold">Loan Amount</th>
                  <th className="py-3 px-3.5 font-bold">Status</th>
                  <th className="py-3 px-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{r.report_id || `DRAFT-${r.id}`}</td>
                    <td className="py-3 px-3.5 font-bold text-slate-900">{r.shg_name}</td>
                    <td className="py-3 px-3.5 text-slate-600">{r.village}, {r.taluk}</td>
                    <td className="py-3 px-3.5 text-slate-800 font-semibold">{r.employee_name} ({r.employee_id})</td>
                    <td className="py-3 px-3.5 font-bold text-emerald-800">₹{Number(r.loan_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => setViewReportId(r.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. EMPLOYEES MANAGEMENT SUBTAB */}
      {/* ======================================================== */}
      {activeSubTab === 'employees' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">SERD Foundation Officers & Staff</h2>
              <p className="text-xs text-slate-500">Configure authentication credentials and branch allocations</p>
            </div>

            <button
              onClick={handleOpenCreateEmployee}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Officer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-3.5 font-bold">Employee ID</th>
                  <th className="py-3 px-3.5 font-bold">Full Name</th>
                  <th className="py-3 px-3.5 font-bold">Role</th>
                  <th className="py-3 px-3.5 font-bold">Branch Office</th>
                  <th className="py-3 px-3.5 font-bold">Contact</th>
                  <th className="py-3 px-3.5 font-bold">Status</th>
                  <th className="py-3 px-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{emp.employee_id}</td>
                    <td className="py-3 px-3.5 font-bold text-slate-900">{emp.name}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {emp.role?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">{emp.branch || 'Central Operations'}</td>
                    <td className="py-3 px-3.5 text-slate-600 font-mono">{emp.phone || emp.email || 'N/A'}</td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {emp.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditEmployee(emp)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                          title="Edit Officer Details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleEmployeeStatus(emp)}
                          className={`p-1.5 rounded-lg text-xs font-semibold ${
                            emp.status === 'active' ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-emerald-50 text-emerald-600'
                          }`}
                          title={emp.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {emp.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. EXCEL / CSV EXPORTS SUBTAB */}
      {/* ======================================================== */}
      {activeSubTab === 'export' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Export SERD Foundation GRT Datasets</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Export spreadsheet datasets containing complete Group metadata, 10-member loan shares, and GPS geotag coordinates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Excel Card */}
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Microsoft Excel Workbook (.xlsx)</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Formatted multi-sheet workbook: <strong>Sheet 1:</strong> GRT Master Records, <strong>Sheet 2:</strong> 10-Member GPS & Audit Roster.
                </p>
              </div>

              <a
                href={api.getExcelExportUrl()}
                download
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download Full Excel (.xlsx)</span>
              </a>
            </div>

            {/* CSV Card */}
            <div className="border border-slate-300 bg-slate-50 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center mb-3">
                  <FileDown className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Raw Comma Separated Values (.csv)</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Standard CSV output optimized for direct import into core banking systems and audit ERP pipelines.
                </p>
              </div>

              <a
                href={api.getCSVExportUrl()}
                download
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download Raw CSV (.csv)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. AUDIT TRAIL SUBTAB */}
      {/* ======================================================== */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">System Security Audit Log</h2>
            <p className="text-xs text-slate-500">Immutable trace of user logins, submissions, sync operations, and record mutations</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 px-3.5 font-bold">Timestamp</th>
                  <th className="py-3 px-3.5 font-bold">Officer / User</th>
                  <th className="py-3 px-3.5 font-bold">Action</th>
                  <th className="py-3 px-3.5 font-bold">Record Ref</th>
                  <th className="py-3 px-3.5 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 font-mono">
                    <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 font-sans">{log.employee_name} ({log.employee_id})</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-emerald-800">{log.record_id || '-'}</td>
                    <td className="py-2.5 px-3.5 text-slate-600 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Add / Edit Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingEmployee ? 'Edit Officer Account' : 'Register New Field Officer'}
            </h3>

            <form onSubmit={handleSaveEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingEmployee)}
                  value={employeeFormData.employee_id}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, employee_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={employeeFormData.name}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                  placeholder="e.g. Anand Gowda"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Branch Name</label>
                <input
                  type="text"
                  value={employeeFormData.branch}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, branch: e.target.value })}
                  placeholder="e.g. Mandya Rural Branch"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    value={employeeFormData.role}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="employee">Field Officer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={employeeFormData.phone}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
                    placeholder="98XXXXXXXX"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  {editingEmployee ? 'New Password (Leave blank to keep unchanged)' : 'Login Password'}
                </label>
                <input
                  type="text"
                  required={!editingEmployee}
                  value={employeeFormData.password}
                  onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                  placeholder={editingEmployee ? '••••••••' : 'e.g. field123'}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Dossier Modal */}
      {viewReportId && (
        <ReportViewerModal
          shgId={viewReportId}
          onClose={() => setViewReportId(null)}
        />
      )}

    </div>
  );
}
