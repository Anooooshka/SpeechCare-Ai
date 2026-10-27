import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Activity, 
  Clock, 
  Trash2, 
  Download, 
  ChevronRight, 
  TrendingUp, 
  PlusCircle, 
  AlertCircle, 
  Sparkles,
  Sliders,
  ShieldCheck,
  FileText,
  User,
  HeartPulse,
  Edit3,
  CheckCircle2,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend 
} from 'recharts';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Profile Drawer / Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [patientProfile, setPatientProfile] = useState(null);
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('Female');
  const [editLanguage, setEditLanguage] = useState('English');
  const [editConditions, setEditConditions] = useState([]);
  const [editOnset, setEditOnset] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editPrior, setEditPrior] = useState('');
  const [editTreatments, setEditTreatments] = useState('');
  const [editNeeds, setEditNeeds] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

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

  const fetchHistoryAndProfile = async () => {
    try {
      setLoading(true);
      const [historyData, profileData] = await Promise.all([
        api.getAssessments(),
        user ? api.getPatientProfile(user.id).catch(() => null) : null
      ]);
      setAssessments(historyData || []);
      if (profileData) {
        setPatientProfile(profileData);
        setEditAge(profileData.age || '');
        setEditGender(profileData.gender || 'Female');
        setEditLanguage(profileData.preferred_language || 'English');
        setEditConditions(profileData.neurological_conditions || ['None reported']);
        setEditOnset(profileData.symptom_onset || '');
        setEditDuration(profileData.symptom_duration_months || '');
        setEditPrior(profileData.previous_assessments || '');
        setEditTreatments(profileData.treatment_history || '');
        setEditNeeds(profileData.communication_needs || '');
      }
    } catch (err) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndProfile();
  }, [user]);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingProfile(true);
      const updated = await api.updatePatientProfile(user.id, {
        age: editAge ? parseInt(editAge) : null,
        gender: editGender,
        preferred_language: editLanguage,
        neurological_conditions: editConditions,
        symptom_onset: editOnset,
        symptom_duration_months: editDuration ? parseInt(editDuration) : null,
        previous_assessments: editPrior,
        treatment_history: editTreatments,
        communication_needs: editNeeds
      });
      setPatientProfile(updated);
      setShowProfileModal(false);
    } catch (err) {
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this assessment and its audio recording (Right to Erasure)?")) {
      return;
    }
    try {
      await api.deleteAssessment(id);
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Prepare longitudinal data for Recharts
  const chartData = [...assessments].reverse().map(a => ({
    name: new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    intelligibility: a.acoustic_biomarkers?.intelligibility_index || a.intelligibility_index || 0,
    speech_rate: a.acoustic_biomarkers?.speech_rate_wpm || a.speech_rate_wpm || 0,
    confidence: a.confidence,
    jitter: a.acoustic_biomarkers?.jitter_percent || 0,
    hnr: a.acoustic_biomarkers?.hnr_db || 0,
    severity: a.severity_score !== null ? a.severity_score : 0,
  }));

  const latest = assessments[0];
  const patientCode = patientProfile?.patient_code || `SC-PT-${user?.id || 1001}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Patient Progress Dashboard</h1>
            <span className="bg-teal-50 text-teal-800 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
              {patientCode}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Welcome back, <span className="font-semibold text-slate-800">{user?.full_name || 'Patient'}</span> • Longitudinal Speech Monitoring & Clinical History
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowProfileModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
            <span>Edit Clinical History</span>
          </button>

          <Link
            to="/assessment"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Speech Screening</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Patient Medical & Neurological Context Banner */}
      {patientProfile && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              Patient Profile & Medical History on Record
            </span>
            <span className="text-[11px] text-slate-400">Preferred Language: <strong>{patientProfile.preferred_language || 'English'}</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Neurological History</span>
              <span className="font-bold text-slate-900 text-xs block truncate">
                {(patientProfile.neurological_conditions || []).join(", ") || "None reported"}
              </span>
              <span className="text-[10px] text-slate-400 block pt-0.5">Onset: {patientProfile.symptom_onset || "Not specified"}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Speech Therapy History</span>
              <span className="font-bold text-slate-900 text-xs block truncate">
                {patientProfile.treatment_history || "None recorded"}
              </span>
              <span className="text-[10px] text-slate-400 block pt-0.5">Prior: {patientProfile.previous_assessments || "None"}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Communication Needs</span>
              <span className="font-bold text-slate-900 text-xs block truncate">
                {patientProfile.communication_needs || "None noted"}
              </span>
              <span className="text-[10px] text-slate-400 block pt-0.5">{patientProfile.age ? `${patientProfile.age} yrs / ${patientProfile.gender}` : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sessions */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">Completed Sessions</span>
          <div className="text-3xl font-extrabold text-slate-900">{assessments.length}</div>
          <span className="text-[11px] text-teal-600 block">Longitudinal Speech Record</span>
        </div>

        {/* Latest Severity Category */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">Latest Dysarthria Severity</span>
          <div className="text-base font-extrabold text-slate-900 truncate">
            {latest ? (latest.dysarthria_severity_category || (latest.is_abstained ? "Review Required" : latest.predicted_class)) : "None yet"}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {latest ? `${latest.confidence}% confidence` : "Start your first session"}
          </span>
        </div>

        {/* Latest Intelligibility */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">Estimated Intelligibility</span>
          <div className="text-2xl font-extrabold text-slate-900">
            {latest?.acoustic_biomarkers?.intelligibility_index ? `${latest.acoustic_biomarkers.intelligibility_index}%` : (latest?.intelligibility_index ? `${latest.intelligibility_index}%` : "N/A")}
          </div>
          <span className="text-[11px] text-emerald-600 block">Acoustic clarity score</span>
        </div>

        {/* Voice Quality (HNR) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-2 shadow-sm">
          <span className="text-slate-500 text-xs font-medium">Voice Periodicity (HNR)</span>
          <div className="text-2xl font-extrabold text-slate-900">
            {latest?.acoustic_biomarkers?.hnr_db ? `${latest.acoustic_biomarkers.hnr_db} dB` : "N/A"}
          </div>
          <span className="text-[11px] text-teal-600 block">Norm: &gt; 15.0 dB</span>
        </div>

      </div>

      {/* Longitudinal Progress Chart (Recharts) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Longitudinal Speech Biomarker Trends
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparing speech intelligibility (%), speech rate (WPM), and voice clarity (HNR dB) across recorded sessions.
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
            {assessments.length} Timepoint Data
          </span>
        </div>

        {chartData.length > 1 ? (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="intelligibility"
                  name="Intelligibility (%)"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0d9488' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="speech_rate"
                  name="Speech Rate (WPM / 2)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="hnr"
                  name="Harmonics-to-Noise (dB)"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <Activity className="w-8 h-8 text-slate-400 mx-auto" />
            <p>Complete at least 2 speech screening assessments to visualize longitudinal progress curves.</p>
          </div>
        )}

        {/* Clinical Disclaimer on measurement changes */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-500 leading-relaxed italic">
          <strong>Longitudinal Monitoring Notice:</strong> Changes in acoustic metrics over time reflect recording variation across sessions and must NOT be interpreted as definitive proof of clinical improvement or recovery without formal evaluation by a certified Speech-Language Pathologist.
        </div>
      </div>

      {/* Assessment Session History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            Assessment History & Audio Records
          </h2>
          <span className="text-xs text-slate-500">{assessments.length} sessions</span>
        </div>

        {assessments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p>No screening sessions completed yet.</p>
            <Link to="/assessment" className="inline-block px-4 py-2 bg-teal-600 text-white rounded-xl font-semibold">
              Start Your First Assessment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Dysarthria Severity</th>
                  <th className="py-3 px-4">Intelligibility</th>
                  <th className="py-3 px-4">Speech Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {new Date(a.created_at).toLocaleDateString()}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      {a.task_type.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {a.dysarthria_severity_category || a.severity_band || "Evaluated"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-teal-700">
                      {a.acoustic_biomarkers?.intelligibility_index ? `${a.acoustic_biomarkers.intelligibility_index}%` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {a.acoustic_biomarkers?.speech_rate_wpm ? `${a.acoustic_biomarkers.speech_rate_wpm} WPM` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      {a.clinician_approved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Pending Review</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        to={`/results/${a.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold text-[11px] transition-colors"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>

                      <button
                        onClick={() => api.downloadReportBlob(a.id)}
                        className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                        title="Download PDF Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                        title="Delete Recording (Right to Erasure)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Clinical History Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Edit Patient Clinical & Neurological Profile</h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Age</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Language</label>
                  <input
                    type="text"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
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
                          sel ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                  <label className="font-semibold text-slate-700">Symptom Onset</label>
                  <input
                    type="text"
                    placeholder="e.g. Subacute (8 months ago)"
                    value={editOnset}
                    onChange={(e) => setEditOnset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Duration (Months)</label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Prior Assessments</label>
                <input
                  type="text"
                  placeholder="e.g. Frenchay Dysarthria Assessment-2 (FDA-2)"
                  value={editPrior}
                  onChange={(e) => setEditPrior(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Treatments & Therapies</label>
                <input
                  type="text"
                  placeholder="e.g. Outpatient speech therapy 2x/wk, LSVT LOUD"
                  value={editTreatments}
                  onChange={(e) => setEditTreatments(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Communication Needs</label>
                <input
                  type="text"
                  placeholder="e.g. Vocal fatigue after 15 minutes, hearing aid left ear"
                  value={editNeeds}
                  onChange={(e) => setEditNeeds(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 shadow-sm"
                >
                  {savingProfile ? "Saving..." : "Save Clinical Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
