import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { generateSHGPdfReport } from '../utils/pdfGenerator';
import { formatDateTime } from '../utils/location';
import {
  X,
  Download,
  Printer,
  MapPin,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Building,
  User,
  Users,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export default function ReportViewerModal({ shgId, onClose }) {
  const [shg, setShg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (shgId) {
      fetchDetails();
    }
  }, [shgId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getSHG(shgId);
      setShg(data);
    } catch (err) {
      console.error('Fetch report details failed:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!shg) return;
    setIsGeneratingPdf(true);
    try {
      await generateSHGPdfReport(shg, { download: true });
    } catch (err) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!shgId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-50 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto">
        
        {/* Modal Top Header with SERD logo */}
        <div className="bg-slate-900 text-white px-5 sm:px-8 py-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 flex items-center justify-center text-white overflow-hidden flex-shrink-0">
              <img src="/serd-logo.jpg" alt="SERD Foundation" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  SERD FOUNDATION • {shg?.shg_name || 'GRT Verification Report'}
                </h2>
                {shg?.status === 'submitted' ? (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    GRT VERIFIED
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                    DRAFT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Report Ref: {shg?.report_id || `DRAFT-${shg?.id}`} • Officer: {shg?.employee_name} ({shg?.employee_id})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isGeneratingPdf || !shg}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{isGeneratingPdf ? 'Generating...' : 'Download Official PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-slate-600">Loading SERD Foundation GRT record...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center">
              <p className="font-bold">Error loading report</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : shg ? (
            <>
              {/* SHG Metadata Grid */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Village & Gram Panchayat</span>
                  <span className="font-bold text-slate-900 text-sm">{shg.village}, {shg.panchayat || ''}</span>
                  <span className="text-[11px] text-slate-500 block">{shg.taluk}, {shg.district}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Loan Sanction Amount</span>
                  <span className="font-bold text-emerald-800 text-base">₹ {Number(shg.loan_amount || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-slate-500 block">A/C: {shg.loan_account_number || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Branch & Code</span>
                  <span className="font-semibold text-slate-800">{shg.branch_name}</span>
                  <span className="text-[11px] text-slate-500 block">Code: {shg.branch_code || 'MND01'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">GRT Verification Date</span>
                  <span className="font-semibold text-slate-800">{shg.meeting_date}</span>
                  <span className="text-[11px] text-slate-500 block">{formatDateTime(shg.submitted_at || shg.created_at)}</span>
                </div>
              </div>

              {/* Group Photograph Card */}
              {(() => {
                const groupPhoto = (shg.photos || []).find(p => p.photo_type === 'GROUP');
                return (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>SERD FOUNDATION • Group GRT Photograph</span>
                      </h3>
                      {groupPhoto?.latitude && (
                        <a
                          href={`https://www.google.com/maps?q=${groupPhoto.latitude},${groupPhoto.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View on Google Maps</span>
                        </a>
                      )}
                    </div>

                    {groupPhoto ? (
                      <div className="w-full aspect-[21/9] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer" onClick={() => setSelectedPhoto(groupPhoto.stamped_image_url || groupPhoto.original_image_url)}>
                        <img
                          src={groupPhoto.stamped_image_url || groupPhoto.original_image_url}
                          alt="Group Photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-500">
                        No group photograph on file.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 10 Individual Member Photographs & GPS Table */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Member GRT Verification & Geotags ({shg.members?.length || 0}/10)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {(shg.members || []).map((m, idx) => {
                    const photo = (shg.photos || []).find(p => p.photo_type === 'MEMBER' && p.member_number === m.member_number);
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 flex flex-col justify-between"
                      >
                        <div
                          className="aspect-square rounded-lg overflow-hidden bg-slate-900 cursor-pointer relative group"
                          onClick={() => photo && setSelectedPhoto(photo.stamped_image_url || photo.original_image_url)}
                        >
                          {photo ? (
                            <img
                              src={photo.stamped_image_url || photo.original_image_url}
                              alt={m.member_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                              No Photo
                            </div>
                          )}
                          <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            #{m.member_number}
                          </span>
                        </div>

                        <div className="text-xs space-y-0.5">
                          <p className="font-bold text-slate-900 truncate">{m.member_name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">ID: {m.member_id || 'N/A'}</p>
                          <p className="font-bold text-emerald-700">₹ {Number(m.loan_amount || 0).toLocaleString('en-IN')}</p>
                          {photo?.latitude ? (
                            <p className="text-[10px] text-sky-700 font-mono pt-1">
                              📍 {Number(photo.latitude).toFixed(4)}°, {Number(photo.longitude).toFixed(4)}°
                            </p>
                          ) : (
                            <p className="text-[10px] text-rose-600">⚠️ No GPS</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

      </div>

      {/* Full Photo Zoom Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={selectedPhoto} alt="Enlarged view" className="max-w-full max-h-[88vh] rounded-2xl shadow-2xl object-contain" />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
