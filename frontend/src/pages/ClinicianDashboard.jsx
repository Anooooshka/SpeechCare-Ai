import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Stethoscope, 
  Users, 
  Clock, 
  CheckCircle, 
  Download, 
  Play, 
  Pause, 
  Edit3, 
  AlertCircle, 
  Search,
  Filter,
  FileCheck,
  Brain,
  Layers,
  HeartPulse,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  X,
  FileText
} from 'lucide-react';

export const ClinicianDashboard = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientProgress, setPatientProgress] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' or 'model_validation'

  // Model validation metrics state
  const [modelMetrics, setModelMetrics] = useState(null);

  // Review modal state
  const [reviewModalSession, setReviewModalSession] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewApproved, setReviewApproved] = useState(false);
  const [savingReview, setSavingReview] = useState(false);

  // Edit Patient Clinical History Modal state
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('Female');
  const [editLanguage, setEditLanguage] = useState('English');
  const [editConditions, setEditConditions] = useState([]);
  const [editOnset, setEditOnset] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPrior, setEditPrior] = useState('');
  const [editTreatments, setEditTreatments] = useState('');
  const [editNeeds, setEditNeeds] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingPatientProfile, setSavingPatientProfile] = useState(false);

  const neurologicalConditionsList = [
    "Stroke (Ischemic / Hemorrhagic)",
    "Parkinson's Disease",
    "Amyotrophic Lateral Sclerosis (ALS)",
    "Traumatic Brain Injury (TBI)",
    "Multiple Sclerosis (MS)",
    "Cerebral Palsy",
    "Essential Tremor",
    "None reported"
  ];

  const fetchClinicianData = async () => {
    try {
      setLoading(true);
      const [patientsData, assessmentsData, metricsData] = await Promise.all([
        api.getClinicianPatients(),
        api.getAssessments(),
        api.getModelEvaluation().catch(() => null)
      ]);
      setPatients(patientsData || []);
      setAssessments(assessmentsData || []);
      setModelMetrics(metricsData);
      if (patientsData && patientsData.length > 0) {
        selectPatient(patientsData[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load clinician dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicianData();
  }, []);

  const selectPatient = async (p) => {
    setSelectedPatient(p);
    try {
      const progress = await api.getPatientProgress(p.id);
      setPatientProgress(progress);
    } catch (err) {
      console.error("Failed to fetch patient progress:", err);
    }
  };

  const openEditPatientModal = (p) => {
    setEditAge(p.age || '');
    setEditGender(p.gender || 'Female');
    setEditLanguage(p.preferred_language || 'English');
    setEditConditions(p.neurological_conditions || ['None reported']);
    setEditOnset(p.symptom_onset || '');
    setEditDuration(p.symptom_duration_months || '');
    setEditPrior(p.previous_assessments || '');
    setEditTreatments(p.treatment_history || '');
    setEditNeeds(p.communication_needs || '');
    setEditNotes(p.medical_notes || '');
    setShowEditPatientModal(true);
  };

  const handleSavePatientProfile = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      setSavingPatientProfile(true);
      const updated = await api.updatePatientProfile(selectedPatient.id, {
        age: editAge ? parseInt(editAge) : null,
        gender: editGender,
        preferred_language: editLanguage,
        neurological_conditions: editConditions,
        symptom_onset: editOnset,
        symptom_duration_months: editDuration ? parseInt(editDuration) : null,
        previous_assessments: editPrior,
        treatment_history: editTreatments,
        communication_needs: editNeeds,
        medical_notes: editNotes
      });

      // Update local patient state
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, ...updated } : p));
      setSelectedPatient(prev => ({ ...prev, ...updated }));
      setShowEditPatientModal(false);
    } catch (err) {
      alert(`Failed to update patient profile: ${err.message}`);
    } finally {
      setSavingPatientProfile(false);
    }
  };

  const toggleCondition = (cond) => {
    if (cond === "None reported") {
      setEditConditions(["None reported"]);
      return;
    }
    const filtered = editConditions.filter(c => c !== "None reported");
    if (filtered.includes(cond)) {
      const next = filtered.filter(c => c !== cond);
      setEditConditions(next.length > 0 ? next : ["None reported"]);
    } else {
      setEditConditions([...filtered, cond]);
    }
  };

  const openReviewModal = (session) => {
    setReviewModalSession(session);
    setReviewNotes(session.clinician_notes || '');
    setReviewApproved(session.clinician_approved || false);
  };

  const submitReview = async () => {
    if (!reviewModalSession) return;
    try {
      setSavingReview(true);
      const res = await api.reviewAssessment(reviewModalSession.id, {
        notes: reviewNotes,
        approved: reviewApproved
      });

      setAssessments(prev => prev.map(s => (s.id === reviewModalSession.id ? res.assessment : s)));
      if (selectedPatient) {
        selectPatient(selectedPatient);
      }
      setReviewModalSession(null);
    } catch (err) {
      alert(`Failed to save review: ${err.message}`);
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Clinician Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
            <span>Speech-Language Pathology Clinical Oversight</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Clinician Caseload & Case Management</h1>
          <p className="text-xs text-slate-500">
            Review speech screening sessions, examine measured acoustic biomarkers, update patient neurological history, and attest clinical decisions.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'cases' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Patient Caseload
          </button>
          <button
            onClick={() => setActiveTab('model_validation')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'model_validation' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            Model Performance & Validation
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: PATIENT CASELOAD & LONGITUDINAL PROGRESS */}
      {activeTab === 'cases' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Authorized Patients (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Assigned Patients ({patients.length})
                </h2>
                <span className="text-[11px] text-slate-400">Unique Patient IDs</span>
              </div>

              <div className="space-y-2">
                {patients.map((p) => {
                  const isSel = selectedPatient?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectPatient(p)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSel
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs">{p.full_name}</span>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                          {p.patient_code || `SC-PT-${String(p.id).padStart(4, '0')}`}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                        <div className="truncate">
                          {p.neurological_conditions && p.neurological_conditions.length > 0 
                            ? p.neurological_conditions.join(", ") 
                            : "No conditions documented"}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>{p.age ? `${p.age} yrs / ${p.gender}` : 'Demographics pending'}</span>
                          <span className="font-semibold text-slate-600">{p.assessment_count} sessions</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Patient Review & Session Timeline (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {selectedPatient ? (
              <>
                {/* Patient Profile Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-slate-900">{selectedPatient.full_name}</h2>
                        <span className="bg-blue-50 text-blue-800 text-xs font-mono font-bold px-2 py-0.5 rounded-md border border-blue-200">
                          {selectedPatient.patient_code || `SC-PT-${String(selectedPatient.id).padStart(4, '0')}`}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{selectedPatient.email}</span>
                    </div>

                    <button
                      onClick={() => openEditPatientModal(selectedPatient)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update Clinical History</span>
                    </button>
                  </div>

                  {/* Clinical Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 block text-[11px] font-semibold">Neurological Record</span>
                      <span className="font-bold text-slate-900 block truncate">
                        {(selectedPatient.neurological_conditions || []).join(", ") || "None documented"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Onset: {selectedPatient.symptom_onset || "Unspecified"}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 block text-[11px] font-semibold">Treatment & Therapy</span>
                      <span className="font-bold text-slate-900 block truncate">
                        {selectedPatient.treatment_history || "None recorded"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Prior: {selectedPatient.previous_assessments || "None"}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 block text-[11px] font-semibold">Communication Needs</span>
                      <span className="font-bold text-slate-900 block truncate">
                        {selectedPatient.communication_needs || "None noted"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Lang: {selectedPatient.preferred_language || "English"}</span>
                    </div>
                  </div>
                </div>

                {/* Longitudinal Timeline of Assessments */}
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Patient Screening Sessions & Clinical Attestation
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Examine dysarthria severity, intelligibility, and sign off on case reviews.
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{patientProgress?.timeline?.length || 0} sessions</span>
                  </div>

                  {(!patientProgress?.timeline || patientProgress.timeline.length === 0) ? (
                    <div className="p-12 text-center text-xs text-slate-500">
                      No speech assessment sessions recorded for this patient yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {patientProgress.timeline.map((s) => (
                        <div key={s.session_id} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                Assessment #{s.session_id}
                              </span>
                              <span className="text-[11px] text-slate-500">• {s.date}</span>
                              <span className="capitalize font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                                {s.task_type.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                              <span className="font-bold text-slate-800">
                                {s.dysarthria_severity_category || s.predicted_class} ({s.confidence}%)
                              </span>
                              <span className="text-teal-700">
                                Intel: <strong>{s.intelligibility_index ? `${s.intelligibility_index}%` : 'N/A'}</strong>
                              </span>
                              <span className="text-slate-600">
                                Rate: <strong>{s.speech_rate_wpm ? `${s.speech_rate_wpm} WPM` : 'N/A'}</strong>
                              </span>
                              <span className="text-slate-500">
                                HNR: <strong>{s.hnr ? `${s.hnr} dB` : 'N/A'}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <Link
                              to={`/results/${s.session_id}`}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                            >
                              Inspect Details
                            </Link>

                            <button
                              onClick={() => {
                                const fullSession = assessments.find(a => a.id === s.session_id) || s;
                                openReviewModal(fullSession);
                              }}
                              className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                                s.clinician_approved 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                              }`}
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>{s.clinician_approved ? "Approved" : "Review & Sign"}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200">
                Select a patient from the caseload list on the left to inspect their clinical records.
              </div>
            )}

          </div>

        </div>
      )}

      {/* TAB 2: MODEL PERFORMANCE & CLINICAL VALIDATION */}
      {activeTab === 'model_validation' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-1">
                <Brain className="w-3.5 h-3.5 text-purple-600" />
                <span>Clinical Machine Learning Benchmark (TORGO & UASpeech)</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">AI Model Architecture, Evaluation & Data Governance</h2>
              <p className="text-xs text-slate-500">
                Evaluation results derived strictly from patient-independent train/validation/test partitions.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
              SpeechCareFusionNet v1.0
            </span>
          </div>

          {modelMetrics ? (
            <div className="space-y-6 text-xs">
              
              {/* Benchmark Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-purple-50/60 border border-purple-200 p-4 rounded-2xl space-y-1">
                  <span className="text-purple-700 block text-[11px] font-semibold">Macro-F1 Score</span>
                  <div className="text-2xl font-extrabold text-purple-900 font-mono">
                    {modelMetrics.evaluation_metrics?.macro_f1_percent}%
                  </div>
                  <span className="text-[10px] text-purple-600 block">Class-balanced metric</span>
                </div>

                <div className="bg-teal-50/60 border border-teal-200 p-4 rounded-2xl space-y-1">
                  <span className="text-teal-700 block text-[11px] font-semibold">Overall Accuracy</span>
                  <div className="text-2xl font-extrabold text-teal-900 font-mono">
                    {modelMetrics.evaluation_metrics?.overall_accuracy_percent}%
                  </div>
                  <span className="text-[10px] text-teal-600 block">Patient-independent test set</span>
                </div>

                <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-1">
                  <span className="text-blue-700 block text-[11px] font-semibold">Macro-Sensitivity (Recall)</span>
                  <div className="text-2xl font-extrabold text-blue-900 font-mono">
                    {modelMetrics.evaluation_metrics?.macro_sensitivity_recall_percent}%
                  </div>
                  <span className="text-[10px] text-blue-600 block">True positive rate</span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl space-y-1">
                  <span className="text-emerald-700 block text-[11px] font-semibold">Macro-Specificity</span>
                  <div className="text-2xl font-extrabold text-emerald-900 font-mono">
                    {modelMetrics.evaluation_metrics?.macro_specificity_percent}%
                  </div>
                  <span className="text-[10px] text-emerald-600 block">True negative rate</span>
                </div>
              </div>

              {/* Patient Separation & Data Leakage Prevention */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5 text-xs">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Patient-Level Partitioning & Data Leakage Safeguards
                </span>
                <p className="text-slate-600 leading-relaxed">
                  To prevent speech pattern memorization, speaker identity leakage is strictly eliminated: all utterances from any individual speaker are exclusively assigned to a single partition.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block text-[11px]">Training Partition</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {modelMetrics.patient_partitioning?.training_speakers?.join(", ")}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block text-[11px]">Validation Partition</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {modelMetrics.patient_partitioning?.validation_speakers?.join(", ")}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block text-[11px]">Test Partition</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {modelMetrics.patient_partitioning?.test_speakers?.join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confusion Matrix Table */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 block text-xs">
                  Confusion Matrix (Patient-Independent Test Evaluation)
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse border border-slate-200 text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      <tr>
                        <th className="border border-slate-200 p-2 text-left">True Class \ Predicted</th>
                        <th className="border border-slate-200 p-2">Control</th>
                        <th className="border border-slate-200 p-2">Mild</th>
                        <th className="border border-slate-200 p-2">Moderate</th>
                        <th className="border border-slate-200 p-2">Severe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Control', 'Mild', 'Moderate', 'Severe'].map((rowLabel, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="border border-slate-200 p-2 text-left font-bold text-slate-800">{rowLabel}</td>
                          {[0, 1, 2, 3].map((cIdx) => {
                            const val = modelMetrics.evaluation_metrics?.confusion_matrix?.[rIdx]?.[cIdx] ?? 0;
                            const isDiagonal = rIdx === cIdx;
                            return (
                              <td 
                                key={cIdx} 
                                className={`border border-slate-200 p-2 font-mono font-bold ${
                                  isDiagonal ? 'bg-teal-50 text-teal-800 font-extrabold' : 'text-slate-400'
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Documented Clinical Limitations */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                <span className="font-bold block flex items-center gap-1.5 text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Documented Model Limitations & Clinical Constraints:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {(modelMetrics.clinical_limitations || []).map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>

            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">Loading benchmark metrics...</div>
          )}
        </div>
      )}

      {/* Clinician Review & Attestation Sign-Off Modal */}
      {reviewModalSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Clinician Assessment Sign-Off</h3>
              </div>
              <button onClick={() => setReviewModalSession(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Session ID:</span>
                <span className="font-bold text-slate-800 font-mono">#{reviewModalSession.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Evaluated Task:</span>
                <span className="font-semibold text-slate-800 capitalize">{reviewModalSession.task_type?.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Severity Assessment:</span>
                <span className="font-bold text-teal-700">{reviewModalSession.dysarthria_severity_category || reviewModalSession.predicted_class}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">Pathologist Clinical Notes & Observations</label>
              <textarea
                rows={4}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter clinical observations, articulatory findings, or recommended therapy modifications..."
                className="w-full p-3 rounded-2xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs p-3 rounded-xl bg-blue-50/60 border border-blue-200">
              <input
                type="checkbox"
                checked={reviewApproved}
                onChange={(e) => setReviewApproved(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-semibold text-blue-900">
                Attest & Approve Clinical Decision Support Record
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalSession(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={savingReview}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
              >
                {savingReview ? "Saving Attestation..." : "Sign & Save Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Profile Modal */}
      {showEditPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Update Patient Medical History & Profile</h3>
              </div>
              <button onClick={() => setShowEditPatientModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatientProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Patient Age</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Preferred Language</label>
                  <input
                    type="text"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Neurological Conditions */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Neurological Conditions</label>
                <div className="flex flex-wrap gap-1.5">
                  {neurologicalConditionsList.map((cond) => {
                    const sel = editConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          sel ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Symptom Onset Timeline</label>
                  <input
                    type="text"
                    value={editOnset}
                    onChange={(e) => setEditOnset(e.target.value)}
                    placeholder="e.g. Subacute (8 months ago)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Duration (Months)</label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Previous Speech Assessments</label>
                <input
                  type="text"
                  value={editPrior}
                  onChange={(e) => setEditPrior(e.target.value)}
                  placeholder="e.g. Frenchay Dysarthria Assessment-2 (FDA-2)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Treatment & Therapy History</label>
                <input
                  type="text"
                  value={editTreatments}
                  onChange={(e) => setEditTreatments(e.target.value)}
                  placeholder="e.g. Outpatient speech therapy 2x/wk, LSVT LOUD protocol"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Communication Needs</label>
                <input
                  type="text"
                  value={editNeeds}
                  onChange={(e) => setEditNeeds(e.target.value)}
                  placeholder="e.g. Needs rate pacing board, vocal fatigue after conversation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditPatientModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPatientProfile}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm"
                >
                  {savingPatientProfile ? "Saving Profile..." : "Save Patient Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
