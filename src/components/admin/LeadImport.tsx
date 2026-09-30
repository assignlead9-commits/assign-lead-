import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Department, UserProfile } from '../../types/crm';
import { validateImportLeads, executeImportLeads, ImportValidationResult } from '../../services/db';
import { useToast } from '../common/Toast';
import { useAuth } from '../../context/AuthContext';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  CopyX,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

interface LeadImportProps {
  departments: Department[];
  users: UserProfile[];
  onImportComplete: () => void;
}

export const LeadImport: React.FC<LeadImportProps> = ({
  departments,
  users,
  onImportComplete,
}) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(departments[0]?.id || '');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<{ [key: string]: string }>({
    customer_name: '',
    mobile: '',
    alternate_mobile: '',
    city: '',
    state: '',
    product: '',
    amount: '',
    source: '',
    department: '',
  });

  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<'UNASSIGNED' | 'ASSIGN_TO_USER'>('UNASSIGNED');
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Telecallers only for assignment
  const telecallers = users.filter((u) => u.role === 'TELECALLER' && u.active);

  // STEP 1: Handle File Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      showToast('Please upload a valid .xlsx, .xls, or .csv spreadsheet file', 'error');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();

    if (ext === 'csv') {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              const keys = Object.keys(results.data[0] as object);
              setHeaders(keys);
              setParsedData(results.data);
              autoDetectMapping(keys);
              setCurrentStep(2);
            } else {
              showToast('File appears to be empty.', 'error');
            }
          },
          error: (err: any) => {
            showToast(`CSV parse error: ${err.message}`, 'error');
          },
        });
      };
      reader.readAsText(file);
    } else {
      // Excel reader
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (json && json.length > 0) {
            const keys = Object.keys(json[0] as object);
            setHeaders(keys);
            setParsedData(json);
            autoDetectMapping(keys);
            setCurrentStep(2);
          } else {
            showToast('Spreadsheet contains no records.', 'error');
          }
        } catch (err: any) {
          showToast(`Excel parse error: ${err.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Smart Header Auto-detection
  const autoDetectMapping = (colKeys: string[]) => {
    const newMapping: { [key: string]: string } = {
      customer_name: '',
      mobile: '',
      alternate_mobile: '',
      city: '',
      state: '',
      product: '',
      amount: '',
      source: '',
      department: '',
    };

    colKeys.forEach((key) => {
      const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('name') || lower.includes('customer') || lower.includes('client')) {
        if (!newMapping.customer_name) newMapping.customer_name = key;
      } else if (lower.includes('alt') && lower.includes('mobile')) {
        if (!newMapping.alternate_mobile) newMapping.alternate_mobile = key;
      } else if (lower.includes('mobile') || lower.includes('phone') || lower.includes('contact') || lower.includes('number')) {
        if (!newMapping.mobile) newMapping.mobile = key;
      } else if (lower.includes('city') || lower.includes('town') || lower.includes('district')) {
        if (!newMapping.city) newMapping.city = key;
      } else if (lower.includes('state') || lower.includes('region')) {
        if (!newMapping.state) newMapping.state = key;
      } else if (lower.includes('product') || lower.includes('item') || lower.includes('kit') || lower.includes('service')) {
        if (!newMapping.product) newMapping.product = key;
      } else if (lower.includes('amount') || lower.includes('price') || lower.includes('cost') || lower.includes('value')) {
        if (!newMapping.amount) newMapping.amount = key;
      } else if (lower.includes('source') || lower.includes('campaign') || lower.includes('channel') || lower.includes('medium')) {
        if (!newMapping.source) newMapping.source = key;
      } else if (lower.includes('dept') || lower.includes('department')) {
        if (!newMapping.department) newMapping.department = key;
      }
    });

    setFieldMapping(newMapping);
  };

  // STEP 4 -> 5: Trigger Validation
  const handleValidate = () => {
    if (!fieldMapping.customer_name) {
      showToast('Please map the Customer Name column.', 'error');
      return;
    }
    if (!fieldMapping.mobile) {
      showToast('Please map the Mobile column.', 'error');
      return;
    }

    const result = validateImportLeads(parsedData, fieldMapping, selectedDepartment);
    setValidationResult(result);
    setCurrentStep(5);
  };

  // STEP 6: Execute Import
  const handleFinalImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) {
      showToast('No valid leads available to import.', 'error');
      return;
    }

    if (assignmentMode === 'ASSIGN_TO_USER' && !assignedUserId) {
      showToast('Please select a telecaller to assign the leads to.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const res = await executeImportLeads(validationResult.validRows, {
        departmentId: selectedDepartment,
        assignToUserId: assignmentMode === 'ASSIGN_TO_USER' ? assignedUserId : null,
        importedByUserId: currentUser?.id || 'admin',
      });

      showToast(`Successfully imported ${res.importedCount} leads!`, 'success');
      onImportComplete();
    } catch (err: any) {
      showToast(`Import failed: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl font-bold text-slate-900">Excel / CSV Lead Import</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Upload customer spreadsheets (.xlsx, .xls, .csv), map columns, deduplicate mobile numbers, and assign
        </p>
      </div>

      {/* 6 Steps Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          {[
            '1. File',
            '2. Department',
            '3. Preview',
            '4. Mapping',
            '5. Validate',
            '6. Finalize',
          ].map((stepName, i) => {
            const stepNum = i + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mr-2 text-xs font-bold transition ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-slate-900 text-white ring-4 ring-slate-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                </div>
                <span className={`hidden md:inline ${isCurrent ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                  {stepName}
                </span>
                {stepNum < 6 && <div className="hidden sm:block w-8 sm:w-12 h-0.5 bg-slate-200 mx-2" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Select File */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs text-center">
          <div className="max-w-md mx-auto border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-8 transition cursor-pointer relative bg-slate-50/50">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1">Click or Drag & Drop File</h3>
              <p className="text-xs text-slate-500 mb-3">Supports Microsoft Excel (.xlsx, .xls) and CSV</p>
              <span className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition">
                Select Spreadsheet File
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Select Department */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base">Step 2: Select Target Department</h3>
          </div>
          <p className="text-xs text-slate-500">
            Choose the default department to apply to all leads in this spreadsheet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className={`p-3.5 rounded-lg border text-xs cursor-pointer transition flex items-start space-x-3 ${
                  selectedDepartment === dept.id
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="dept"
                  value={dept.id}
                  checked={selectedDepartment === dept.id}
                  onChange={() => setSelectedDepartment(dept.id)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-900">{dept.name}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{dept.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              Continue to Preview &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview Uploaded Data */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Step 3: Preview Spreadsheet Records</h3>
              <p className="text-xs text-slate-500">
                Found {parsedData.length} records in <span className="font-semibold">{selectedFile?.name}</span>
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
              Showing first 5 rows
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-2 whitespace-nowrap text-slate-700">
                        {String(row[h] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              Proceed to Column Mapping &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Column Mapping */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Step 4: Column Mapping</h3>
            <p className="text-xs text-slate-500">
              Map the columns from your spreadsheet to the corresponding CRM fields.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { field: 'customer_name', label: 'Customer Name *', required: true },
              { field: 'mobile', label: 'Mobile Number (Primary) *', required: true },
              { field: 'alternate_mobile', label: 'Alternate Mobile', required: false },
              { field: 'city', label: 'City', required: false },
              { field: 'state', label: 'State', required: false },
              { field: 'product', label: 'Product / Service', required: false },
              { field: 'amount', label: 'Lead Amount (₹)', required: false },
              { field: 'source', label: 'Lead Source (e.g. Meta Ads, Google)', required: false },
              { field: 'department', label: 'Department Column (Optional)', required: false },
            ].map(({ field, label, required }) => (
              <div key={field} className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {label}
                </label>
                <select
                  value={fieldMapping[field] || ''}
                  onChange={(e) => setFieldMapping({ ...fieldMapping, [field]: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Select Column from File --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={handleValidate}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs"
            >
              Validate Records &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Validation Results */}
      {currentStep === 5 && validationResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Step 5: Record Validation Summary</h3>
            <p className="text-xs text-slate-500">
              Scanned {validationResult.totalRows} rows against duplicate numbers and format rules.
            </p>
          </div>

          {/* Validation Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="text-xl font-bold text-slate-800">{validationResult.totalRows}</div>
              <div className="text-xs text-slate-500 font-medium">Total Rows</div>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-xl font-bold text-emerald-700">{validationResult.validRows.length}</div>
              <div className="text-xs text-emerald-800 font-medium">Valid Ready to Import</div>
            </div>
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <div className="text-xl font-bold text-rose-700">{validationResult.invalidRows.length}</div>
              <div className="text-xs text-rose-800 font-medium">Invalid Format</div>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <div className="text-xl font-bold text-amber-700">{validationResult.duplicateRows.length}</div>
              <div className="text-xs text-amber-800 font-medium">Duplicate Mobiles</div>
            </div>
          </div>

          {/* Duplicates / Invalids warning box */}
          {(validationResult.duplicateRows.length > 0 || validationResult.invalidRows.length > 0) && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Deduplication Protection:</p>
              <p>
                {validationResult.duplicateRows.length} duplicate mobile numbers and{' '}
                {validationResult.invalidRows.length} malformed records will be skipped automatically to keep your CRM clean.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Mapping
            </button>
            <button
              onClick={() => setCurrentStep(6)}
              disabled={validationResult.validRows.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Proceed to Finalize &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Finalize & Lead Assignment Option */}
      {currentStep === 6 && validationResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Step 6: Import & Assignment Options</h3>
            <p className="text-xs text-slate-500">
              Ready to import <span className="font-bold text-emerald-700">{validationResult.validRows.length}</span> leads.
            </p>
          </div>

          {/* Allocation Choice */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Assignment Mode:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                  assignmentMode === 'UNASSIGNED'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="assignOption"
                  value="UNASSIGNED"
                  checked={assignmentMode === 'UNASSIGNED'}
                  onChange={() => setAssignmentMode('UNASSIGNED')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">Import as Unassigned</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Leads will go to the Unassigned Pool. Admin can assign them later manually from the Assign Leads menu.
                  </div>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                  assignmentMode === 'ASSIGN_TO_USER'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="assignOption"
                  value="ASSIGN_TO_USER"
                  checked={assignmentMode === 'ASSIGN_TO_USER'}
                  onChange={() => setAssignmentMode('ASSIGN_TO_USER')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">Import & Assign to User</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Immediately allocate all imported leads directly to a selected telecaller.
                  </div>
                </div>
              </label>
            </div>

            {assignmentMode === 'ASSIGN_TO_USER' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-3 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-700">
                  Select Telecaller to Receive {validationResult.validRows.length} Leads:
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Telecaller --</option>
                  {telecallers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              onClick={handleFinalImport}
              disabled={isImporting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing {validationResult.validRows.length} Leads...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Lead Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
