import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { BranchApplication, BranchDocument, DocumentVerificationStatus } from '../../../types';
import {
  X,
  Store,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  Key,
  Copy,
  Check,
} from 'lucide-react';

interface BranchApplicationReviewModalProps {
  application: BranchApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onApplicationUpdated?: () => void;
}

export const BranchApplicationReviewModal: React.FC<BranchApplicationReviewModalProps> = ({
  application,
  isOpen,
  onClose,
  onApplicationUpdated,
}) => {
  const {
    verifyDocument,
    approveBranchApplication,
    rejectBranchApplication,
    requestDocumentResubmission,
    themeMode,
  } = useData();
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'history'>('documents');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docRemarks, setDocRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    branch: any;
    managerAccount: any;
    staffAccount: any;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const docs = application.documents || [];
  const verifiedDocsCount = docs.filter((d) => d.status === 'verified').length;
  const pendingDocsCount = docs.filter((d) => d.status === 'pending').length;
  const rejectedDocsCount = docs.filter((d) => d.status === 'rejected' || d.status === 'resubmission_requested').length;

  const handleVerifyDoc = (docId: string, status: DocumentVerificationStatus) => {
    verifyDocument(docId, status, docRemarks || (status === 'verified' ? 'Approved by HQ Compliance' : 'Rejected'));
    setDocRemarks('');
    setSelectedDocId(null);
    setShowResubmitForm(false);
  };

  const handleApproveApplication = () => {
    setApprovalError(null);
    try {
      const res = approveBranchApplication(application.id);
      if (!res) {
        setApprovalError('This application could not be found or has already been processed. Refresh the branch list and try again.');
        return;
      }
      setApprovalResult(res);
      if (onApplicationUpdated) onApplicationUpdated();
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'Branch approval failed. Please try again.');
    }
  };

  const handleRejectApplication = () => {
    if (!rejectReason.trim()) return;
    rejectBranchApplication(application.id, rejectReason.trim());
    setShowRejectForm(false);
    onClose();
    if (onApplicationUpdated) onApplicationUpdated();
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      id="branch-review-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="branch-review-modal-card"
        className={`relative w-full max-w-4xl my-6 rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
          isDark ? 'bg-[#121212] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#80C7F2]/15 text-[#80C7F2] flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">{application.branchName}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-neutral-800 text-neutral-300">
                  {application.branchCode}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    application.status === 'Approved'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : application.status === 'Rejected'
                      ? 'bg-red-500/15 text-red-400'
                      : application.status === 'Requires Revision'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-sky-500/15 text-sky-400'
                  }`}
                >
                  {application.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Franchise Onboarding Review • Submitted {new Date(application.submittedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* If successfully approved, display generated credentials */}
          {approvalResult ? (
            <div className="py-6 space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black">Branch Successfully Approved & Activated!</h3>
                <p className="text-xs text-neutral-400 max-w-lg mx-auto">
                  The store profile <span className="text-white font-bold">{approvalResult.branch.name}</span> has been
                  instantiated in the central franchise database with initial 0-stock inventory catalog. Default staff credentials have been
                  generated:
                </p>
              </div>

              {/* Account Credentials Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch Manager Account */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-[#181818] border-neutral-700' : 'bg-neutral-50 border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <div className="flex items-center space-x-2 text-[#F37021]">
                      <Key className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Branch Manager Login</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                      Manager Role
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-neutral-500">Name:</span>{' '}
                      <span className="font-semibold">{approvalResult.managerAccount.fullName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Email:</span>{' '}
                      <span className="font-mono text-neutral-300">{approvalResult.managerAccount.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Username:</span>{' '}
                      <span className="font-mono text-neutral-300">{approvalResult.managerAccount.username}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-neutral-500">Temporary Password:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[#80C7F2] font-bold">
                          {approvalResult.managerAccount.temporaryPassword}
                        </span>
                        <button
                          onClick={() => copyToClipboard(approvalResult.managerAccount.temporaryPassword, 'mgr-pass')}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                          title="Copy Password"
                        >
                          {copiedKey === 'mgr-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Counter Staff Account */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-[#181818] border-neutral-700' : 'bg-neutral-50 border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <div className="flex items-center space-x-2 text-[#80C7F2]">
                      <Key className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Counter Staff Login</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 font-bold">
                      Staff Role
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-neutral-500">Name:</span>{' '}
                      <span className="font-semibold">{approvalResult.staffAccount.fullName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Email:</span>{' '}
                      <span className="font-mono text-neutral-300">{approvalResult.staffAccount.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Username:</span>{' '}
                      <span className="font-mono text-neutral-300">{approvalResult.staffAccount.username}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-neutral-500">Temporary Password:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[#80C7F2] font-bold">
                          {approvalResult.staffAccount.temporaryPassword}
                        </span>
                        <button
                          onClick={() => copyToClipboard(approvalResult.staffAccount.temporaryPassword, 'staff-pass')}
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                          title="Copy Password"
                        >
                          {copiedKey === 'staff-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#F37021] text-white text-xs font-bold hover:bg-[#d85e15] shadow-lg transition-all"
                >
                  Close & View Active Branch
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Review Tabs */}
              <div className="flex border-b border-neutral-800 space-x-4">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`pb-2.5 text-xs font-bold transition-all relative ${
                    activeTab === 'documents'
                      ? 'text-[#F37021] border-b-2 border-[#F37021]'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>Compliance Documents ({docs.length})</span>
                  {pendingDocsCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-400 text-[10px]">
                      {pendingDocsCount} pending
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-2.5 text-xs font-bold transition-all ${
                    activeTab === 'profile'
                      ? 'text-[#F37021] border-b-2 border-[#F37021]'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Store & Manager Details
                </button>
              </div>

              {/* TAB 1: DOCUMENTS VERIFICATION */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {/* Summary Metric Header */}
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className={`p-3 rounded-xl border text-center ${
                        isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <span className="text-[10px] text-neutral-500 font-bold uppercase">Total Uploaded</span>
                      <p className="text-base font-black mt-0.5">{docs.length}</p>
                    </div>
                    <div
                      className={`p-3 rounded-xl border text-center ${
                        isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <span className="text-[10px] text-emerald-500 font-bold uppercase">Verified & Passed</span>
                      <p className="text-base font-black text-emerald-400 mt-0.5">{verifiedDocsCount}</p>
                    </div>
                    <div
                      className={`p-3 rounded-xl border text-center ${
                        isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <span className="text-[10px] text-amber-500 font-bold uppercase">Pending Verification</span>
                      <p className="text-base font-black text-amber-400 mt-0.5">{pendingDocsCount}</p>
                    </div>
                  </div>

                  {/* Documents List */}
                  <div className="space-y-3">
                    {docs.map((doc) => {
                      const isSelected = selectedDocId === doc.id;

                      return (
                        <div
                          key={doc.id}
                          className={`p-4 rounded-xl border transition-all ${
                            doc.status === 'verified'
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : doc.status === 'rejected'
                              ? 'border-red-500/30 bg-red-500/5'
                              : doc.status === 'resubmission_requested'
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : isDark
                              ? 'border-neutral-800 bg-[#161616]'
                              : 'border-neutral-200 bg-neutral-50'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start space-x-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                  doc.status === 'verified'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : doc.status === 'rejected'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-neutral-800 text-neutral-300'
                                }`}
                              >
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-xs font-bold">{doc.title}</h4>
                                  <span
                                    className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                                      doc.status === 'verified'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : doc.status === 'rejected'
                                        ? 'bg-red-500/15 text-red-400'
                                        : doc.status === 'resubmission_requested'
                                        ? 'bg-amber-500/15 text-amber-400'
                                        : 'bg-neutral-800 text-neutral-400'
                                    }`}
                                  >
                                    {doc.status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                                  {doc.fileName} • {doc.fileSize || '1.8 MB'} • Uploaded{' '}
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </p>
                                {doc.remarks && (
                                  <p className="text-[11px] text-amber-300 mt-1 italic">
                                    Notes: &quot;{doc.remarks}&quot;
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            {application.status !== 'Approved' && (
                              <div className="flex items-center space-x-2 self-end sm:self-center">
                                <button
                                  onClick={() => {
                                    setSelectedDocId(isSelected ? null : doc.id);
                                    setShowResubmitForm(false);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-neutral-700 text-xs font-semibold hover:bg-neutral-800 text-neutral-300 transition-colors"
                                >
                                  {isSelected ? 'Collapse' : 'Review Doc'}
                                </button>

                                {doc.status !== 'verified' && (
                                  <button
                                    onClick={() => handleVerifyDoc(doc.id, 'verified')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all flex items-center space-x-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Expanded Document Action Drawer */}
                          {isSelected && (
                            <div
                              className={`mt-4 pt-4 border-t space-y-3 ${
                                isDark ? 'border-neutral-800' : 'border-neutral-200'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={docRemarks}
                                  onChange={(e) => setDocRemarks(e.target.value)}
                                  placeholder="Enter verification notes or required correction remarks..."
                                  className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                                    isDark
                                      ? 'bg-[#1e1e1e] border-neutral-700 text-white placeholder-neutral-500'
                                      : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400'
                                  }`}
                                />

                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleVerifyDoc(doc.id, 'verified')}
                                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center space-x-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark Passed</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      requestDocumentResubmission(
                                        application.id,
                                        doc.id,
                                        docRemarks || 'Document expired or illegible. Please re-upload latest copy.'
                                      );
                                      setSelectedDocId(null);
                                    }}
                                    className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center space-x-1"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Request Re-upload</span>
                                  </button>
                                  <button
                                    onClick={() => handleVerifyDoc(doc.id, 'rejected')}
                                    className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center space-x-1"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: STORE & MANAGER PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Business Info */}
                    <div
                      className={`p-4 rounded-xl border space-y-3 ${
                        isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 text-[#80C7F2] pb-2 border-b border-neutral-800">
                        <Building className="w-4 h-4" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Business Location</h4>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Branch Name:</span>
                          <span className="font-semibold">{application.branchName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Business Model:</span>
                          <span className="font-semibold">{application.businessType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Address:</span>
                          <span className="font-semibold text-right max-w-[200px]">{application.address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Official Phone:</span>
                          <span className="font-semibold">{application.contactNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Store Email:</span>
                          <span className="font-semibold">{application.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Operating Schedule:</span>
                          <span className="font-semibold">{application.operatingHours}</span>
                        </div>
                      </div>
                    </div>

                    {/* Manager Info */}
                    <div
                      className={`p-4 rounded-xl border space-y-3 ${
                        isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 text-[#F37021] pb-2 border-b border-neutral-800">
                        <UserCheck className="w-4 h-4" />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Manager & Franchisee</h4>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Full Legal Name:</span>
                          <span className="font-semibold">{application.managerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Mobile Phone:</span>
                          <span className="font-semibold">{application.managerPhone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Email Address:</span>
                          <span className="font-semibold">{application.managerEmail}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Government ID:</span>
                          <span className="font-mono text-emerald-400 font-bold">{application.managerGovId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Application Date:</span>
                          <span className="font-semibold">
                            {new Date(application.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejection Form Overlay inside modal if active */}
              {showRejectForm && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
                  <div className="flex items-center space-x-2 text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Reject Franchise Application</span>
                  </div>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide detailed compliance or legal reasons for application rejection..."
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-400 ${
                      isDark ? 'bg-[#1c1212] border-red-500/40 text-white' : 'bg-white border-red-300 text-neutral-900'
                    }`}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRejectApplication}
                      className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {approvalError && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-600 dark:text-red-300" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{approvalError}</span>
          </div>
        )}

        {/* Modal Footer Controls */}
        {!approvalResult && application.status !== 'Approved' && (
          <div
            className={`px-6 py-4 border-t flex items-center justify-between ${
              isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/15 text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Application</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors"
              >
                Close
              </button>

              <button
                onClick={handleApproveApplication}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg transition-all flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Branch & Provision Accounts</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
