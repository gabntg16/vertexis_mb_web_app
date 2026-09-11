import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { BranchBusinessType, BranchDocument, DocumentType } from '../../../types';
import { validateUploadedFile } from '../../../utils/fileValidation';
import {
  X,
  Store,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  User,
  Clock,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Trash2,
  FileCheck,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface BranchApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BUSINESS_TYPES: BranchBusinessType[] = [
  'Franchise Kiosk',
  'Mall Inline Store',
  'Full Dine-In Branch',
  'Food Hall Booth',
  'Express Counter',
];

interface RequiredDocConfig {
  type: DocumentType;
  title: string;
  description: string;
  required: boolean;
}

const REQUIRED_DOCS_LIST: RequiredDocConfig[] = [
  {
    type: 'business_permit',
    title: 'Business Permit / Mayor\'s Permit',
    description: 'Current City/Municipal Mayor\'s business operating permit (LGU)',
    required: true,
  },
  {
    type: 'dti_registration',
    title: 'DTI Registration Certificate',
    description: 'Department of Trade and Industry certificate of business name registration',
    required: true,
  },
  {
    type: 'bir_registration',
    title: 'BIR Form 2303 Registration',
    description: 'Certificate of Registration with Bureau of Internal Revenue and TIN',
    required: true,
  },
  {
    type: 'government_id',
    title: 'Valid Government ID of Owner/Manager',
    description: 'Passport, Driver\'s License, UMID, National ID, or SSS ID with photo & signature',
    required: true,
  },
  {
    type: 'lease_contract',
    title: 'Lease Contract / Location Title',
    description: 'Signed commercial lease contract, mall authorization letter, or property deed',
    required: true,
  },
  {
    type: 'other',
    title: 'Sanitary & Food Safety Clearance',
    description: 'City health office sanitary permit and food handler certifications',
    required: false,
  },
];

export const BranchApplicationModal: React.FC<BranchApplicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { submitBranchApplication, themeMode, branches, branchApplications } = useData();
  const isDark = themeMode === 'dark';

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Business Information
  const [branchName, setBranchName] = useState('');
  const [businessType, setBusinessType] = useState<BranchBusinessType>('Franchise Kiosk');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [operatingHours, setOperatingHours] = useState('10:00 AM - 9:00 PM (Mall Hours)');

  // Step 2: Branch Manager Information
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerGovId, setManagerGovId] = useState('');

  // Step 3: Uploaded Documents State
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      type: DocumentType;
      title: string;
      fileName: string;
      fileSize: string;
      fileUrl: string;
      fileType: string;
    }>
  >([]);

  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccessAppId, setSubmittedSuccessAppId] = useState<string | null>(null);
  const [scanningDocType, setScanningDocType] = useState<DocumentType | null>(null);

  if (!isOpen) return null;

  // Auto-calculated branch code preview
  const estimatedCode = () => {
    const citySlug = (address.split(',')[0] || branchName || 'PH')
      .replace(/Marsh Bites/gi, '')
      .trim()
      .substring(0, 3)
      .toUpperCase();
    return `MB-${citySlug || 'PH'}-${String(branches.length + branchApplications.length + 1).padStart(2, '0')}`;
  };

  const handleRealFileUpload = async (docConfig: RequiredDocConfig, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningDocType(docConfig.type);
    setValidationError('');

    try {
      const validation = await validateUploadedFile(file, {
        maxSizeBytes: 15 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        verifyImageDecodable: true,
      });

      if (!validation.isValid) {
        setValidationError(`Security Error (${docConfig.title}): ${validation.error || 'File failed verification'}`);
        return;
      }

      const fileSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      setUploadedFiles((prev) => [
        ...prev.filter((f) => f.type !== docConfig.type),
        {
          type: docConfig.type,
          title: docConfig.title,
          fileName: file.name,
          fileSize,
          fileUrl: validation.dataUrl || `https://storage.vertexis.marshbites.internal/compliance/${file.name}`,
          fileType: validation.detectedMimeType || file.type,
        },
      ]);
    } catch (err: any) {
      setValidationError(`Upload failed: ${err.message}`);
    } finally {
      setScanningDocType(null);
    }
  };

  const handleMockFileUpload = (docConfig: RequiredDocConfig) => {
    const mockFileNames: Partial<Record<DocumentType, string>> = {
      business_permit: `Mayor_Permit_2026_${branchName.replace(/\s+/g, '_') || 'Store'}.pdf`,
      dti_registration: `DTI_Cert_Reg_${branchName.replace(/\s+/g, '_') || 'Store'}.pdf`,
      bir_registration: 'BIR_Form_2303_TaxReg.pdf',
      government_id: `Gov_Passport_${managerName.replace(/\s+/g, '_') || 'Manager'}.pdf`,
      lease_contract: `Commercial_Lease_Agreement_${branchName.replace(/\s+/g, '_') || 'Mall'}.pdf`,
      other: 'Sanitary_Health_Clearance_2026.pdf',
    };

    const fileName = mockFileNames[docConfig.type] || `${docConfig.type.replace(/\s+/g, '_')}.pdf`;
    const fileSize = `${(Math.random() * 2 + 1.2).toFixed(1)} MB`;

    // Replace if existing of this type
    setUploadedFiles((prev) => [
      ...prev.filter((f) => f.type !== docConfig.type),
      {
        type: docConfig.type,
        title: docConfig.title,
        fileName,
        fileSize,
        fileUrl: `https://storage.vertexis.marshbites.internal/compliance/${fileName}`,
        fileType: 'application/pdf',
      },
    ]);
  };

  const handleRemoveFile = (docType: DocumentType) => {
    setUploadedFiles((prev) => prev.filter((f) => f.type !== docType));
  };

  const validateStep1 = () => {
    if (!branchName.trim()) {
      setValidationError('Please provide a complete Branch Name.');
      return false;
    }
    if (!address.trim()) {
      setValidationError('Please specify the complete Branch Location & Physical Address.');
      return false;
    }
    if (!contactNumber.trim()) {
      setValidationError('Please enter a business contact number.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setValidationError('Please provide a valid branch email address.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const validateStep2 = () => {
    if (!managerName.trim()) {
      setValidationError('Branch Manager / Franchisee Full Name is required.');
      return false;
    }
    if (!managerPhone.trim()) {
      setValidationError('Manager mobile contact number is required.');
      return false;
    }
    if (!managerEmail.trim() || !managerEmail.includes('@')) {
      setValidationError('A valid manager email address is required for credential dispatch.');
      return false;
    }
    if (!managerGovId.trim()) {
      setValidationError('Government ID Number (e.g. SSS, UMID, Passport) is required.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmitApplication = async () => {
    // Check mandatory documents
    const missingDocs = REQUIRED_DOCS_LIST.filter(
      (d) => d.required && !uploadedFiles.some((f) => f.type === d.type)
    );

    if (missingDocs.length > 0) {
      setValidationError(
        `Please attach all mandatory compliance documents: ${missingDocs.map((d) => d.title).join(', ')}`
      );
      return;
    }

    setIsSubmitting(true);
    setValidationError('');

    try {
      const docsToSave: BranchDocument[] = uploadedFiles.map((f, idx) => ({
        id: `doc-${Date.now()}-${idx}`,
        title: f.title,
        documentType: f.type,
        fileName: f.fileName,
        fileUrl: f.fileUrl,
        fileSize: f.fileSize,
        fileType: f.fileType,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
      }));

      const newApp = submitBranchApplication({
        branchName: branchName.trim(),
        businessType,
        address: address.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        operatingHours: operatingHours.trim(),
        managerName: managerName.trim(),
        managerPhone: managerPhone.trim(),
        managerEmail: managerEmail.trim(),
        managerGovId: managerGovId.trim(),
        documents: docsToSave,
      });

      setSubmittedSuccessAppId(newApp.id);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="branch-application-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="branch-application-modal-card"
        className={`relative w-full max-w-3xl my-8 rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden ${
          isDark ? 'bg-[#121212] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-neutral-800 bg-[#181818]' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F37021]/15 text-[#F37021] flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Apply for New Franchise Branch</h2>
              <p className="text-xs text-neutral-500">
                Submit store business information, manager credentials, and compliance documents for HQ review.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-branch-app-btn"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with multi-step or success state */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {submittedSuccessAppId ? (
            /* Success Feedback View */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black">Franchise Application Submitted!</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                  Application <span className="font-mono text-[#F37021] font-bold">{estimatedCode()}</span> for{' '}
                  <span className="text-white font-bold">{branchName}</span> has been routed to Headquarters for document
                  verification and approval.
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border max-w-md mx-auto text-left text-xs space-y-2 ${
                  isDark ? 'bg-[#181818] border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-neutral-500">Branch Name:</span>
                  <span className="font-semibold">{branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Business Model:</span>
                  <span className="font-semibold">{businessType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Branch Manager:</span>
                  <span className="font-semibold">{managerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Attached Documents:</span>
                  <span className="font-semibold text-emerald-400">{uploadedFiles.length} files verified & queued</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-neutral-800">
                  <span className="text-neutral-500">Application State:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
                    Pending Review
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-bold shadow-lg transition-all"
                >
                  Done & Return to Branches
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stepper Wizard Bar */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl text-left border transition-all ${
                    currentStep === 1
                      ? 'border-[#F37021] bg-[#F37021]/10 text-white font-bold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 1 ? 'bg-[#F37021] text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    1
                  </span>
                  <span className="text-xs truncate">Business Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setCurrentStep(2);
                  }}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl text-left border transition-all ${
                    currentStep === 2
                      ? 'border-[#F37021] bg-[#F37021]/10 text-white font-bold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 2 ? 'bg-[#F37021] text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    2
                  </span>
                  <span className="text-xs truncate">Branch Manager</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1() && validateStep2()) setCurrentStep(3);
                  }}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl text-left border transition-all ${
                    currentStep === 3
                      ? 'border-[#F37021] bg-[#F37021]/10 text-white font-bold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 3 ? 'bg-[#F37021] text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    3
                  </span>
                  <span className="text-xs truncate">Required Documents</span>
                </button>
              </div>

              {/* Validation Banner */}
              {validationError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* STEP 1: BUSINESS INFORMATION */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <div className="flex items-center space-x-2 text-[#80C7F2]">
                      <Building className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Business & Store Details</h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                      Auto Code: {estimatedCode()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Branch Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="e.g. Marsh Bites SM Mall of Asia"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Business Type <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value as BranchBusinessType)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                        }`}
                      >
                        {BUSINESS_TYPES.map((bt) => (
                          <option key={bt} value={bt}>
                            {bt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Complete Physical Address & Location <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 2nd Level South Wing, SM Mall of Asia, Pasay City, Metro Manila"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Branch Official Contact Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="e.g. +63 917 888 1234 or (02) 8123-4567"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Official Store Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. moa@marshbites.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Operating Hours Schedule
                      </label>
                      <input
                        type="text"
                        value={operatingHours}
                        onChange={(e) => setOperatingHours(e.target.value)}
                        placeholder="e.g. 10:00 AM - 9:00 PM Monday-Sunday"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: BRANCH MANAGER INFORMATION */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <div className="flex items-center space-x-2 text-[#80C7F2]">
                      <User className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Branch Manager & Franchisee Info</h3>
                    </div>
                    <span className="text-[10px] text-neutral-400">Account login will be generated upon approval</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Full Legal Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        placeholder="e.g. Patricia Joy Mendoza"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Mobile Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={managerPhone}
                        onChange={(e) => setManagerPhone(e.target.value)}
                        placeholder="e.g. +63 917 555 8899"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Manager Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={managerEmail}
                        onChange={(e) => setManagerEmail(e.target.value)}
                        placeholder="e.g. patricia.mendoza@gmail.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                      <p className="text-[10px] text-neutral-500 mt-1">Credentials & initial password will be sent here.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Government ID Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={managerGovId}
                        onChange={(e) => setManagerGovId(e.target.value)}
                        placeholder="e.g. SSS: 04-1234567-8 / Passport: P1234567A"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-[#80C7F2] ${
                          isDark
                            ? 'bg-[#181818] border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: REQUIRED COMPLIANCE DOCUMENTS */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <div className="flex items-center space-x-2 text-[#80C7F2]">
                      <ShieldCheck className="w-4 h-4" />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Required Compliance Document Uploads</h3>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400">
                      {uploadedFiles.length} of {REQUIRED_DOCS_LIST.filter((d) => d.required).length} mandatory attached
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400">
                    Upload scanned digital copies (PDF, PNG, JPG max 15MB) of statutory government certificates and permits for
                    compliance audit verification.
                  </p>

                  <div className="space-y-3">
                    {REQUIRED_DOCS_LIST.map((doc) => {
                      const uploaded = uploadedFiles.find((f) => f.type === doc.type);

                      return (
                        <div
                          key={doc.type}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            uploaded
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : isDark
                              ? 'border-neutral-800 bg-[#161616]'
                              : 'border-neutral-200 bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                uploaded
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {uploaded ? <FileCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold">{doc.title}</span>
                                {doc.required ? (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-red-500/15 text-red-400 rounded font-semibold">
                                    Required
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-neutral-800 text-neutral-400 rounded">
                                    Optional
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500">{doc.description}</p>
                              {uploaded && (
                                <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                                  ✓ {uploaded.fileName} ({uploaded.fileSize})
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                            {uploaded ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(doc.type)}
                                className="px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/15 transition-colors flex items-center space-x-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  id={`file-upload-${doc.type.replace(/\s+/g, '-')}`}
                                  accept="image/png,image/jpeg,image/webp,application/pdf"
                                  onChange={(e) => handleRealFileUpload(doc, e)}
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`file-upload-${doc.type.replace(/\s+/g, '-')}`}
                                  className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#80C7F2]/15 text-[#80C7F2] hover:bg-[#80C7F2]/25 text-xs font-bold transition-all flex items-center space-x-1.5"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{scanningDocType === doc.type ? 'Scanning...' : 'Upload File'}</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleMockFileUpload(doc)}
                                  className="px-2.5 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-400 text-xs font-medium transition-all"
                                  title="Attach sample compliance document"
                                >
                                  <span>Preset</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!submittedSuccessAppId && (
          <div
            className={`px-6 py-4 border-t flex items-center justify-between ${
              isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
                    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#80C7F2] text-neutral-900 text-xs font-black hover:bg-[#6cb6e3] shadow-md transition-all flex items-center space-x-1.5"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitApplication}
                  className="px-6 py-2.5 rounded-xl bg-[#F37021] hover:bg-[#d85e15] text-white text-xs font-black shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Application to HQ</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
