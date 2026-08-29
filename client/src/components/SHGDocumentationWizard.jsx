import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { saveLocalDraft, getLocalDraft, deleteLocalDraft } from '../services/offlineDb';
import { api } from '../services/api';
import { generateSHGPdfReport } from '../utils/pdfGenerator';
import CameraCapture from './CameraCapture';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Save,
  Send,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Camera,
  ShieldCheck,
  Building,
  MapPin,
  Calendar,
  IndianRupee,
  Phone,
  FileText,
  Eye,
  RefreshCw
} from 'lucide-react';

export default function SHGDocumentationWizard({ initialDraftId = null, onFinished, onCancel }) {
  const { user } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();

  // Wizard Step:
  // 1 = Group / SHG Details
  // 2 - 11 = Member 1 to 10
  // 12 = Group Photo
  // 13 = Review & Submit
  // 14 = Submission Success & PDF Download
  const [currentStep, setCurrentStep] = useState(1);

  // SHG Details State
  const [shgData, setShgData] = useState({
    shg_name: '',
    shg_code: '',
    village: '',
    panchayat: '',
    taluk: '',
    district: '',
    state: 'Karnataka',
    branch_name: user?.branch || 'Mandya Rural Branch',
    branch_code: 'MND01',
    loan_amount: '500000',
    loan_account_number: 'GRT-AC-' + Math.floor(100000 + Math.random() * 900000),
    num_members: 10,
    meeting_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // Exactly 10 members array
  const [members, setMembers] = useState(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      member_number: i + 1,
      member_name: '',
      member_id: '',
      loan_amount: '50000',
      mobile_number: ''
    }));
  });

  // Photos array (10 member photos + 1 group photo)
  const [photos, setPhotos] = useState([]);

  // Active Camera Capture modal / inline state
  const [activeCameraTarget, setActiveCameraTarget] = useState(null); // { type: 'MEMBER'|'GROUP', memberNumber: 1..10 }

  // Draft & Submission States
  const [localId, setLocalId] = useState(initialDraftId || null);
  const [serverId, setServerId] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Load existing draft if editing
  useEffect(() => {
    if (initialDraftId) {
      loadDraft(initialDraftId);
    }
  }, [initialDraftId]);

  const loadDraft = async (id) => {
    try {
      const draft = await getLocalDraft(id);
      if (draft) {
        setLocalId(draft.localId);
        setServerId(draft.server_id || null);
        if (draft.shgData) setShgData(draft.shgData);
        if (draft.members && draft.members.length === 10) setMembers(draft.members);
        if (draft.photos) setPhotos(draft.photos);
      }
    } catch (e) {
      console.warn('Failed to load draft from local DB:', e);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Quick auto-fill sample GRT group data for rapid testing
  const autoFillSample = () => {
    const sampleNames = [
      'Sarojini Devi', 'Lakshmi Bai', 'Meenakshiamma', 'Kavitha Gowda', 'Sunita Patil',
      'Geetha Kumari', 'Radha Murthy', 'Shobha Rani', 'Bhavani Shetty', 'Anusuya Bai'
    ];

    setShgData({
      shg_name: 'Mahila Shakthi Swasahaya Sangha',
      shg_code: 'SERD-GRT-' + Math.floor(1000 + Math.random() * 9000),
      village: 'Hulivana',
      panchayat: 'Keragodu Gram Panchayat',
      taluk: 'Mandya',
      district: 'Mandya District',
      state: 'Karnataka',
      branch_name: user?.branch || 'Mandya Rural Branch',
      branch_code: 'MND01',
      loan_amount: '500000',
      loan_account_number: 'SERD-AC-' + Math.floor(10000000 + Math.random() * 90000000),
      num_members: 10,
      meeting_date: new Date().toISOString().split('T')[0],
      remarks: 'SERD Foundation GRT (Group Recognition Test) successfully completed. All 10 members verified.'
    });

    setMembers(
      sampleNames.map((name, idx) => ({
        member_number: idx + 1,
        member_name: name,
        member_id: `CUST-SERD-${String(idx + 101)}`,
        loan_amount: '50000',
        mobile_number: `98450${Math.floor(10000 + Math.random() * 90000)}`
      }))
    );

    showToast('Auto-filled sample SERD Foundation GRT Group & 10 members!');
  };

  // Handle SHG input changes
  const handleShgChange = (e) => {
    const { name, value } = e.target;
    setShgData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Member input changes
  const handleMemberChange = (index, field, value) => {
    setMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Photo Confirmed Callback from CameraCapture
  const handlePhotoConfirmed = (photoRecord) => {
    setPhotos(prev => {
      const filtered = prev.filter(p => {
        if (photoRecord.photo_type === 'GROUP') {
          return p.photo_type !== 'GROUP';
        }
        return !(p.photo_type === 'MEMBER' && p.member_number === photoRecord.member_number);
      });
      return [...filtered, photoRecord];
    });

    setActiveCameraTarget(null);
    showToast(
      photoRecord.photo_type === 'GROUP'
        ? '✅ Group photograph verified and GPS stamped!'
        : `✅ Member ${photoRecord.member_number} photo verified and GPS stamped!`
    );

    autoSaveDraft();
  };

  // Auto-save or Manual Save Draft
  const autoSaveDraft = async (status = 'draft') => {
    setIsSavingDraft(true);
    try {
      const draftObj = {
        localId: localId || `draft_${Date.now()}`,
        server_id: serverId,
        shgData,
        members,
        photos,
        status,
        syncStatus: 'saved_locally',
        employee_id: user?.employee_id
      };

      const saved = await saveLocalDraft(draftObj);
      setLocalId(saved.localId);
      await refreshPendingCount();

      if (isOnline) {
        try {
          if (serverId) {
            const sRes = await api.updateSHG(serverId, {
              shgData,
              members,
              photos
            });
            setServerId(sRes.id);
          } else {
            const sRes = await api.createSHG({
              shgData: { ...shgData, status },
              members,
              photos
            });
            setServerId(sRes.id);
          }
        } catch (serverErr) {
          console.warn('Background server save error, draft kept locally:', serverErr);
        }
      }

      return saved;
    } catch (e) {
      console.error('Draft save error:', e);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleManualSaveDraft = async () => {
    await autoSaveDraft('draft');
    showToast('💾 GRT Form draft saved successfully!');
  };

  // Member photo completion count
  const memberPhotosCompleted = photos.filter(p => p.photo_type === 'MEMBER').length;
  const isGroupPhotoCompleted = photos.some(p => p.photo_type === 'GROUP');

  // Step Validation logic
  const validateCurrentStep = () => {
    setValidationErrors([]);
    const errors = [];

    if (currentStep === 1) {
      if (!shgData.shg_name.trim()) errors.push('Group / SHG Name is mandatory.');
      if (!shgData.village.trim()) errors.push('Village name is mandatory.');
      if (!shgData.loan_amount) errors.push('Loan Amount is required.');
    } else if (currentStep >= 2 && currentStep <= 11) {
      const memberIndex = currentStep - 2;
      const member = members[memberIndex];
      const photo = photos.find(p => p.photo_type === 'MEMBER' && p.member_number === (memberIndex + 1));

      if (!member.member_name.trim()) {
        errors.push(`Member ${memberIndex + 1} Name is mandatory.`);
      }
      if (!photo) {
        errors.push(`Photograph with GPS is mandatory for Member ${memberIndex + 1}.`);
      }
    } else if (currentStep === 12) {
      if (!isGroupPhotoCompleted) {
        errors.push('Group Photograph with GPS watermark is mandatory.');
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < 13) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setValidationErrors([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final Checklist Validation
  const getChecklistStatus = () => {
    const items = [
      { id: 'shg', label: 'Group Profile & Loan Details', done: Boolean(shgData.shg_name && shgData.village && shgData.loan_amount) },
      ...members.map((m, idx) => {
        const photo = photos.find(p => p.photo_type === 'MEMBER' && p.member_number === (idx + 1));
        return {
          id: `m_${idx + 1}`,
          label: `Member ${idx + 1}: ${m.member_name || 'Pending'} Photo + GPS`,
          done: Boolean(m.member_name && photo && photo.latitude)
        };
      }),
      { id: 'group_photo', label: 'Group Photo + GPS Geotag', done: isGroupPhotoCompleted },
      { id: 'employee_info', label: `Field Officer Verification (${user?.name})`, done: Boolean(user?.employee_id) }
    ];

    const allCompleted = items.every(i => i.done);
    return { items, allCompleted };
  };

  // Handle Final Submission
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        shgData: {
          ...shgData,
          status: 'submitted',
          employee_id: user?.employee_id,
          employee_name: user?.name,
          branch_name: shgData.branch_name || user?.branch
        },
        members,
        photos
      };

      let finalReport;
      if (isOnline) {
        if (serverId) {
          finalReport = await api.updateSHG(serverId, { ...payload, shgData: { ...payload.shgData, status: 'submitted' } });
        } else {
          finalReport = await api.createSHG({ ...payload, shgData: { ...payload.shgData, status: 'submitted' } });
        }
      } else {
        const offlineReportId = `SERD-GRT-${Date.now().toString().slice(-6)}`;
        finalReport = {
          ...shgData,
          id: localId,
          report_id: offlineReportId,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          members,
          photos
        };
      }

      await saveLocalDraft({
        localId: localId || `draft_${Date.now()}`,
        server_id: finalReport.id,
        report_id: finalReport.report_id,
        shgData: { ...shgData, status: 'submitted', report_id: finalReport.report_id },
        members,
        photos,
        status: 'submitted',
        syncStatus: isOnline ? 'synced' : 'pending_sync'
      });

      await refreshPendingCount();
      setSubmittedRecord(finalReport);
      setShowSubmitModal(false);
      setCurrentStep(14);
      showToast(`🎉 SERD Foundation GRT Documentation submitted! Report ID: ${finalReport.report_id}`);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Failed to submit documentation: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    const record = submittedRecord || {
      ...shgData,
      id: serverId || localId,
      members,
      photos,
      employee_name: user?.name,
      employee_id: user?.employee_id,
      status: 'submitted'
    };
    await generateSHGPdfReport(record, { download: true });
    showToast('📄 Official SERD Foundation GRT report downloaded!');
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 animate-bounce ${
          toastMessage.type === 'success' ? 'bg-emerald-600 border border-emerald-400' : 'bg-rose-600 border border-rose-400'
        }`}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Progress & Title Header */}
      {currentStep <= 13 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                <img src="/serd-logo.jpg" alt="SERD Foundation" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  SERD FOUNDATION • Step {currentStep} of 13
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {currentStep === 1 && '1. GRT Group Profile & Loan Details'}
                  {currentStep >= 2 && currentStep <= 11 && `${currentStep}. Member ${currentStep - 1} of 10 Verification`}
                  {currentStep === 12 && '12. Final Group GRT Photograph'}
                  {currentStep === 13 && '13. Final Review & GRT Document Submission'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSaveDraft}
                disabled={isSavingDraft}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
              </button>

              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={autoFillSample}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-300 transition-all"
                  title="Auto-fill with sample SERD Foundation GRT data"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-fill Sample</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Counters */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span>GRT Verification Progress</span>
              <span className="text-emerald-700 font-bold">
                Member Photos: {memberPhotosCompleted}/10 completed {isGroupPhotoCompleted ? '• Group Photo ✅' : ''}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((currentStep / 13) * 100)}%` }}
              ></div>
            </div>

            {/* Quick Step Nav Buttons for 10 Members */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1">
              <button
                onClick={() => setCurrentStep(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  currentStep === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                GRT Info
              </button>

              {members.map((m, idx) => {
                const memberNum = idx + 1;
                const hasPhoto = photos.some(p => p.photo_type === 'MEMBER' && p.member_number === memberNum);
                const isCurrent = currentStep === memberNum + 1;
                return (
                  <button
                    key={memberNum}
                    onClick={() => setCurrentStep(memberNum + 1)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      isCurrent
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-500'
                        : hasPhoto
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>M{memberNum}</span>
                    {hasPhoto && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentStep(12)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  currentStep === 12
                    ? 'bg-emerald-700 text-white ring-2 ring-emerald-500'
                    : isGroupPhotoCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Group</span>
                {isGroupPhotoCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              </button>

              <button
                onClick={() => setCurrentStep(13)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  currentStep === 13 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors Notice */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-rose-900 mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Please resolve the following before proceeding:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-2 text-rose-700">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: SHG DETAILS FORM */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            <span>SERD FOUNDATION • Group Recognition Test (GRT) Profile</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* SHG Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Group / SHG Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="shg_name"
                required
                value={shgData.shg_name}
                onChange={handleShgChange}
                placeholder="e.g. Mahila Shakthi Swasahaya Sangha"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-semibold"
              />
            </div>

            {/* SHG Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                GRT / Group Code
              </label>
              <input
                type="text"
                name="shg_code"
                value={shgData.shg_code}
                onChange={handleShgChange}
                placeholder="e.g. SERD-GRT-402"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Village */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Village <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="village"
                required
                value={shgData.village}
                onChange={handleShgChange}
                placeholder="e.g. Hulivana"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Gram Panchayat */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Gram Panchayat
              </label>
              <input
                type="text"
                name="panchayat"
                value={shgData.panchayat}
                onChange={handleShgChange}
                placeholder="e.g. Keragodu GP"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Taluk */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Taluk
              </label>
              <input
                type="text"
                name="taluk"
                value={shgData.taluk}
                onChange={handleShgChange}
                placeholder="e.g. Mandya"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                District
              </label>
              <input
                type="text"
                name="district"
                value={shgData.district}
                onChange={handleShgChange}
                placeholder="e.g. Mandya District"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                State
              </label>
              <input
                type="text"
                name="state"
                value={shgData.state}
                onChange={handleShgChange}
                placeholder="e.g. Karnataka"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Branch Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Branch Name
              </label>
              <input
                type="text"
                name="branch_name"
                value={shgData.branch_name}
                onChange={handleShgChange}
                placeholder="e.g. Mandya Rural Branch"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Branch Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Branch Code
              </label>
              <input
                type="text"
                name="branch_code"
                value={shgData.branch_code}
                onChange={handleShgChange}
                placeholder="e.g. MND01"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Loan Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Total Loan Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  name="loan_amount"
                  required
                  value={shgData.loan_amount}
                  onChange={handleShgChange}
                  placeholder="500000"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-bold text-emerald-800"
                />
              </div>
            </div>

            {/* Loan Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Loan Account Number
              </label>
              <input
                type="text"
                name="loan_account_number"
                value={shgData.loan_account_number}
                onChange={handleShgChange}
                placeholder="e.g. GRT-AC-908123"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
              />
            </div>

            {/* Number of Members */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Number of Members
              </label>
              <input
                type="number"
                disabled
                value={10}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold"
              />
            </div>

            {/* Meeting Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                GRT Field Verification Date
              </label>
              <input
                type="date"
                name="meeting_date"
                value={shgData.meeting_date}
                onChange={handleShgChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Remarks */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Field Officer GRT Remarks
              </label>
              <textarea
                name="remarks"
                rows={2}
                value={shgData.remarks}
                onChange={handleShgChange}
                placeholder="Enter remarks regarding member comprehension, group cohesion, and loan verification..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEPS 2 to 11: INDIVIDUAL MEMBERS 1 to 10 */}
      {/* ======================================================== */}
      {currentStep >= 2 && currentStep <= 11 && (() => {
        const memberIndex = currentStep - 2;
        const memberNum = memberIndex + 1;
        const member = members[memberIndex];
        const existingPhoto = photos.find(p => p.photo_type === 'MEMBER' && p.member_number === memberNum);

        return (
          <div className="space-y-6">
            
            {/* Member Details Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-black flex items-center justify-center text-lg">
                    {String(memberNum).padStart(2, '0')}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Member {memberNum} GRT Verification
                    </h2>
                    <p className="text-xs text-slate-500">
                      Group: {shgData.shg_name || 'SERD Foundation Group'}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div>
                  {existingPhoto ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Photo & GPS Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Photo Pending</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Member Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Member Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={member.member_name}
                    onChange={(e) => handleMemberChange(memberIndex, 'member_name', e.target.value)}
                    placeholder={`e.g. Member ${memberNum} Name`}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Customer ID / Member ID
                  </label>
                  <input
                    type="text"
                    value={member.member_id}
                    onChange={(e) => handleMemberChange(memberIndex, 'member_id', e.target.value)}
                    placeholder={`e.g. CUST-SERD-${memberNum + 100}`}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Individual Loan Share (₹)
                  </label>
                  <input
                    type="number"
                    value={member.loan_amount}
                    onChange={(e) => handleMemberChange(memberIndex, 'loan_amount', e.target.value)}
                    placeholder="50000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={member.mobile_number}
                    onChange={(e) => handleMemberChange(memberIndex, 'mobile_number', e.target.value)}
                    placeholder="98XXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Member Photo Capture Section */}
            {activeCameraTarget?.memberNumber === memberNum ? (
              <CameraCapture
                photoType="MEMBER"
                memberNumber={memberNum}
                memberName={member.member_name}
                memberId={member.member_id}
                shgName={shgData.shg_name}
                existingPhoto={existingPhoto}
                onPhotoConfirmed={handlePhotoConfirmed}
                onCancel={() => setActiveCameraTarget(null)}
              />
            ) : existingPhoto ? (
              /* Already Captured Preview Card */
              <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-emerald-200">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-full sm:w-64 h-64 sm:h-48 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 relative group">
                    <img
                      src={existingPhoto.stamped_image_url || existingPhoto.original_image_url}
                      alt={`Member ${memberNum}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      SERD Stamped Photo
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        ✅ Geotagged Stamped Photo Verified
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p><strong>GPS Coordinates:</strong> Lat: {existingPhoto.latitude}°, Lon: {existingPhoto.longitude}° (±{existingPhoto.gps_accuracy}m)</p>
                      <p><strong>Timestamp:</strong> {existingPhoto.captured_at}</p>
                      <p><strong>Location:</strong> {existingPhoto.address}</p>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveCameraTarget({ type: 'MEMBER', memberNumber: memberNum })}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Retake Member Photo</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Trigger Photo Capture Button */
              <div className="bg-slate-900 rounded-2xl p-8 text-center text-white border border-slate-800 shadow-xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Capture Member {memberNum} Photograph</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Live GPS location and SERD Foundation watermark stamp will be embedded automatically onto the photograph.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCameraTarget({ type: 'MEMBER', memberNumber: memberNum })}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm shadow-xl shadow-emerald-950/80 transition-all inline-flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  <span> Open Camera & Capture Photo</span>
                </button>
              </div>
            )}

          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* STEP 12: GROUP PHOTOGRAPH */}
      {/* ======================================================== */}
      {currentStep === 12 && (() => {
        const groupPhoto = photos.find(p => p.photo_type === 'GROUP');

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-black flex items-center justify-center text-lg">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      SERD FOUNDATION • Final Group GRT Photograph
                    </h2>
                    <p className="text-xs text-slate-500">
                      All 10 loan members must be present in this group verification photograph.
                    </p>
                  </div>
                </div>

                <div>
                  {groupPhoto ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Group Photo Captured</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Group Photo Pending</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeCameraTarget?.type === 'GROUP' ? (
              <CameraCapture
                photoType="GROUP"
                shgName={shgData.shg_name}
                existingPhoto={groupPhoto}
                onPhotoConfirmed={handlePhotoConfirmed}
                onCancel={() => setActiveCameraTarget(null)}
              />
            ) : groupPhoto ? (
              <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-emerald-200">
                <div className="space-y-4">
                  <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative">
                    <img
                      src={groupPhoto.stamped_image_url || groupPhoto.original_image_url}
                      alt="Group Photo"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-600 space-y-0.5">
                      <p><strong>GPS:</strong> Lat: {groupPhoto.latitude}°, Lon: {groupPhoto.longitude}° (±{groupPhoto.gps_accuracy}m)</p>
                      <p><strong>Location:</strong> {groupPhoto.address}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveCameraTarget({ type: 'GROUP' })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Retake Group Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl p-8 text-center text-white border border-slate-800 shadow-xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Capture Final Group GRT Photograph</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Take a comprehensive group photo with the members present together at the meeting location.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCameraTarget({ type: 'GROUP' })}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm shadow-xl shadow-emerald-950/80 transition-all inline-flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>📷 Open Camera & Capture Group Photo</span>
                </button>
              </div>
            )}

          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* STEP 13: CHECKLIST & FULL REVIEW */}
      {/* ======================================================== */}
      {currentStep === 13 && (() => {
        const { items: checklistItems, allCompleted } = getChecklistStatus();
        const groupPhoto = photos.find(p => p.photo_type === 'GROUP');

        return (
          <div className="space-y-6">
            
            {/* Required Documentation Checklist */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span>SERD FOUNDATION • GRT Form Verification Checklist</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold ${
                      item.done
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SHG Summary Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Group Profile Information</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  Edit Details
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Group Name:</span>
                  <span className="font-bold text-slate-900 text-sm">{shgData.shg_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Village & GP:</span>
                  <span className="font-semibold text-slate-800">{shgData.village}, {shgData.panchayat}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Loan Amount:</span>
                  <span className="font-bold text-emerald-800 text-sm">₹ {Number(shgData.loan_amount).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Branch & Officer:</span>
                  <span className="font-semibold text-slate-800">{shgData.branch_name} ({user?.name})</span>
                </div>
              </div>
            </div>

            {/* 10 Member Photo Gallery Grid */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                Individual Member Photographs (10 of 10)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {members.map((m, idx) => {
                  const photo = photos.find(p => p.photo_type === 'MEMBER' && p.member_number === (idx + 1));
                  return (
                    <div
                      key={idx}
                      className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex flex-col justify-between"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-slate-200 mb-2 relative">
                        {photo ? (
                          <img
                            src={photo.stamped_image_url || photo.original_image_url}
                            alt={m.member_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                            No Photo
                          </div>
                        )}
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          M{idx + 1}
                        </span>
                      </div>

                      <div className="text-[11px] leading-tight">
                        <p className="font-bold text-slate-900 truncate">{m.member_name || `Member ${idx + 1}`}</p>
                        <p className="text-emerald-700 font-semibold">₹{Number(m.loan_amount || 0).toLocaleString('en-IN')}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(idx + 2)}
                        className="mt-2 text-[10px] text-emerald-700 font-bold hover:underline text-center"
                      >
                        {photo ? 'Retake' : 'Capture'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group Photo Card in Review */}
            <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Final Group Photograph</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(12)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  {groupPhoto ? 'Retake Group Photo' : 'Capture Group Photo'}
                </button>
              </div>

              {groupPhoto ? (
                <div className="w-full aspect-[21/9] rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                  <img
                    src={groupPhoto.stamped_image_url || groupPhoto.original_image_url}
                    alt="Group Verification"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Group Photograph is missing! Please complete Step 12.</span>
                </div>
              )}
            </div>

            {/* Final Submission Button Area */}
            <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Ready for Official GRT Submission</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {allCompleted
                    ? 'All 10 member photos, GPS geotags, and group verification are complete.'
                    : '⚠️ Some mandatory fields or photos are still pending.'}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleManualSaveDraft}
                  className="flex-1 sm:flex-initial px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-slate-700"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={!allCompleted || isSubmitting}
                  onClick={() => setShowSubmitModal(true)}
                  className="flex-1 sm:flex-initial px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm shadow-xl shadow-emerald-950/80 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit GRT Form</span>
                </button>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* STEP 14: SUCCESS & DOWNLOAD PDF SCREEN */}
      {/* ======================================================== */}
      {currentStep === 14 && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-white p-2 shadow-lg ring-2 ring-emerald-500 flex items-center justify-center mx-auto overflow-hidden">
            <img src="/serd-logo.jpg" alt="SERD Foundation" className="w-full h-full object-contain" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              SERD FOUNDATION • GRT FORM VERIFIED
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              GRT Documentation Submitted!
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              The record has been audited, geotagged, and locked.
            </p>
          </div>

          {/* Generated Report ID Box */}
          <div className="p-4 bg-slate-900 rounded-2xl text-white font-mono text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Official Report Reference ID</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
              {submittedRecord?.report_id || 'SERD-GRT-2026-000125'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Group: {shgData.shg_name} • Officer: {user?.name}
            </p>
          </div>

          {/* Download & Actions Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download SERD Foundation PDF Report</span>
            </button>

            <button
              type="button"
              onClick={() => onFinished && onFinished('reports')}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm border border-slate-300"
            >
              View in Report History
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer Controls (for Steps 1 to 12) */}
      {currentStep <= 12 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={handlePrevStep}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-300 disabled:opacity-40 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Step {currentStep} of 13
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold shadow-md shadow-emerald-900/20 transition-all"
          >
            <span>{currentStep === 12 ? 'Review All Data' : 'Save & Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirm GRT Submission</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to submit this GRT Form to SERD Foundation? Once submitted, the record receives an official Report ID and will be locked.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-left text-slate-700 space-y-1">
              <p><strong>Group:</strong> {shgData.shg_name}</p>
              <p><strong>Members:</strong> 10 photos geotagged & verified</p>
              <p><strong>Officer:</strong> {user?.name} ({user?.employee_id})</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel / Review Again
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Yes, Submit GRT</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
