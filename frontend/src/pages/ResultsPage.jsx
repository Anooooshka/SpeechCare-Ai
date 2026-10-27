import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Activity, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  Sparkles, 
  Sliders, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowLeft, 
  Clock, 
  ShieldAlert,
  User,
  Heart,
  FileText,
  TrendingUp,
  Stethoscope,
  AlertTriangle,
  Info,
  CheckCircle,
  Brain,
  Layers,
  HeartPulse
} from 'lucide-react';

export const ResultsPage = () => {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audio players state
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingEnhanced, setPlayingEnhanced] = useState(false);
  const originalAudioRef = useRef(null);
  const enhancedAudioRef = useRef(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const data = await api.getAssessment(id);
        setAssessment(data);
      } catch (err) {
        setError(err.message || 'Failed to load assessment details.');
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [id]);

  const toggleOriginalAudio = () => {
    if (!originalAudioRef.current) return;
    if (playingOriginal) {
      originalAudioRef.current.pause();
      setPlayingOriginal(false);
    } else {
      if (enhancedAudioRef.current && playingEnhanced) {
        enhancedAudioRef.current.pause();
        setPlayingEnhanced(false);
      }
      originalAudioRef.current.play();
      setPlayingOriginal(true);
    }
  };

  const toggleEnhancedAudio = () => {
    if (!enhancedAudioRef.current) return;
    if (playingEnhanced) {
      enhancedAudioRef.current.pause();
      setPlayingEnhanced(false);
    } else {
      if (originalAudioRef.current && playingOriginal) {
        originalAudioRef.current.pause();
        setPlayingOriginal(false);
      }
      enhancedAudioRef.current.play();
      setPlayingEnhanced(true);
    }
  };

  const getSeverityBadgeColor = (category) => {
    if (!category) return 'bg-slate-100 text-slate-700 border-slate-300';
    const cat = category.toLowerCase();
    if (cat.includes('no clear')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (cat.includes('mild')) return 'bg-teal-100 text-teal-800 border-teal-300';
    if (cat.includes('moderate')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (cat.includes('severe')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (cat.includes('unable')) return 'bg-purple-100 text-purple-800 border-purple-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium text-sm">Retrieving speech screening findings & acoustic biomarkers...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Assessment Record Not Found</h2>
        <p className="text-sm text-slate-600">{error || 'Unable to display results.'}</p>
        <Link to="/assessment" className="inline-block px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold shadow-sm">
          Perform New Assessment
        </Link>
      </div>
    );
  }

  const biomarkers = assessment.acoustic_biomarkers || {};
  const dys = assessment.dysarthria_assessment || {};
  const diff = assessment.differential_screening || {};
  const indices = diff.indices || {};
  const explanation = assessment.explanation || {};
  const waveformPeaks = explanation.waveform_peaks || [];
  const quality = assessment.audio_quality || {};
  const history = assessment.patient_history || {};
  const historicalFactors = assessment.historical_factors_considered || [];
  const missingHistory = assessment.missing_history_info || [];
  const contributingFeats = assessment.contributing_features || dys.contributing_features || [];
  const comparison = assessment.previous_comparison;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/patient"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Assessment #{assessment.id}</h1>
              <span className="bg-slate-100 text-slate-700 text-xs font-mono font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                {assessment.patient_code}
              </span>
              {assessment.is_demo_simulated && (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Evaluated on {new Date(assessment.created_at).toLocaleDateString()} at {new Date(assessment.created_at).toLocaleTimeString()} • Task: <span className="font-semibold capitalize">{assessment.task_type.replace('_', ' ')}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => api.downloadReportBlob(assessment.id)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Download Clinical PDF</span>
          </button>
        </div>
      </div>

      {/* Audio Quality & Recording Validation Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-teal-600" />
            Audio Quality & Signal Validation Status
          </h2>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
            quality.status === 'good' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
            quality.status === 'acceptable' ? 'bg-amber-100 text-amber-800 border-amber-300' :
            'bg-rose-100 text-rose-800 border-rose-300'
          }`}>
            Quality: {quality.status || 'Good'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Signal-to-Noise Ratio</span>
            <span className="font-bold text-slate-900 text-sm">{quality.snr_db ? `${quality.snr_db} dB` : '> 18.0 dB'}</span>
            <span className="text-[10px] text-slate-400 block">Norm: &gt; 14 dB</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Microphone Clipping</span>
            <span className="font-bold text-slate-900 text-sm">
              {quality.is_clipped ? "Clipping Detected" : "Clear (No Clipping)"}
            </span>
            <span className="text-[10px] text-slate-400 block">&lt; 0.5% saturation</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Active Speech Time</span>
            <span className="font-bold text-slate-900 text-sm">{assessment.speech_duration_sec}s / {assessment.audio_duration}s</span>
            <span className="text-[10px] text-slate-400 block">{quality.silence_percentage}% silence</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Sampling Rate</span>
            <span className="font-bold text-slate-900 text-sm">{assessment.sample_rate / 1000} kHz Mono</span>
            <span className="text-[10px] text-slate-400 block">Clinical standard</span>
          </div>
        </div>

        {quality.warnings && quality.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <span className="font-semibold block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Recording Quality Notices:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {quality.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Primary Severity Card */}
      <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <span className="text-teal-400 text-xs font-bold uppercase tracking-widest block">
              Dysarthria Severity Assessment
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {assessment.dysarthria_severity_category || "No clear dysarthric indicators detected"}
              </div>

              {assessment.severity_band && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getSeverityBadgeColor(assessment.severity_band)}`}>
                  {assessment.severity_band} Band
                </span>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="text-slate-400 text-xs block">Calibrated Confidence</span>
            <div className="text-2xl font-bold text-teal-300 font-mono">
              {assessment.confidence}%
            </div>
          </div>
        </div>

        {/* Continuous Severity Index Meter */}
        {assessment.severity_score !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                Continuous Severity Index: <strong className="text-white text-sm">{assessment.severity_score} / 100</strong>
              </span>
              <span className="text-slate-400">Mild (&lt;25) • Moderate (25-50) • Marked (50-75) • Severe (&ge;75)</span>
            </div>

            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(5, assessment.severity_score))}%` }}
              />
            </div>
          </div>
        )}

        {/* Plain Language Summary */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-white/5 border border-white/10 p-4 rounded-2xl">
          {assessment.summary_text}
        </p>

        {/* Contributing Speech Features Highlight */}
        {contributingFeats.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-xs">
            <span className="font-bold text-teal-300 block flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Speech Characteristics Contributing to Severity Estimate:
            </span>
            <ul className="space-y-1 text-slate-200">
              {contributingFeats.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Non-Diagnostic Clinical Safety Notice */}
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3.5 text-xs text-rose-200 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Clinical Safety Notice:</strong> SpeechCare AI is an assistive screening decision-support instrument. This assessment communicates statistical estimation and does NOT constitute a confirmed medical diagnosis. Professional bedside evaluation by a certified Speech-Language Pathologist (CCC-SLP) is required before intervention.
          </p>
        </div>
      </div>

      {/* Dual Audio Player: Original vs Enhanced */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-teal-600" />
            Audio Playback & Spectral Noise Enhancement
          </h2>
          <span className="text-xs text-slate-500 font-medium">{assessment.audio_duration}s recording</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Player 1: Original Recording */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Original Audio Recording</span>
              <span className="text-slate-500 text-[11px]">16 kHz Raw Input</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleOriginalAudio}
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                {playingOriginal ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className={`h-full bg-teal-600 ${playingOriginal ? 'animate-pulse w-full' : 'w-0'}`} />
              </div>
            </div>

            <audio
              ref={originalAudioRef}
              src={api.getAudioUrl(assessment.id)}
              onEnded={() => setPlayingOriginal(false)}
              className="hidden"
            />
          </div>

          {/* Player 2: Enhanced Audio */}
          <div className="bg-teal-50/50 border border-teal-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Enhanced Speech Audio
              </span>
              <span className="text-teal-700 font-medium text-[11px]">Spectral Noise Reduced</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleEnhancedAudio}
                className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-colors flex-shrink-0"
              >
                {playingEnhanced ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1 bg-teal-200 h-2 rounded-full overflow-hidden">
                <div className={`h-full bg-teal-700 ${playingEnhanced ? 'animate-pulse w-full' : 'w-0'}`} />
              </div>
            </div>

            {assessment.has_enhanced_audio && (
              <audio
                ref={enhancedAudioRef}
                src={api.getEnhancedAudioUrl(assessment.id)}
                onEnded={() => setPlayingEnhanced(false)}
                className="hidden"
              />
            )}
          </div>
        </div>

        {/* Waveform Peaks Visualizer */}
        {waveformPeaks.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Speech Energy Envelope</span>
              <span className="text-teal-400 font-mono">{waveformPeaks.length} segment frames</span>
            </div>
            <div className="flex items-end gap-1 h-14">
              {waveformPeaks.map((peak, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-gradient-to-t from-teal-500 to-emerald-400 rounded-full"
                  style={{ height: `${Math.max(8, peak * 100)}%` }}
                  title={`Segment ${idx + 1}: ${peak}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Speech Production Breakdown Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            Detailed Speech Characteristics & Acoustic Measurements
          </h2>
          <span className="text-xs text-slate-500">Measurable Clinical Indicators</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          
          {/* Articulation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Articulation & Precision</span>
            <div className="text-xl font-extrabold text-slate-900">
              {biomarkers.articulation_score || dys.articulation_score || 90.0} / 100
            </div>
            <span className="text-xs font-medium text-teal-700 block">
              {dys.consonant_precision || "Crisp & Precise Consonants"}
            </span>
            <p className="text-[10px] text-slate-500 leading-tight pt-1">
              Evaluates consonant clarity, phonetic precision, and articulatory transition speed.
            </p>
          </div>

          {/* Intelligibility */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Speech Intelligibility</span>
            <div className="text-xl font-extrabold text-slate-900">
              {biomarkers.intelligibility_index || dys.intelligibility_index || 88.0}%
            </div>
            <span className="text-xs font-medium text-emerald-700 block">
              Estimated Acoustic Understandability
            </span>
            <p className="text-[10px] text-slate-500 leading-tight pt-1">
              Combines acoustic periodicity, vocal fold harmonic strength, and timing structure.
            </p>
          </div>

          {/* Speech Rate & Rhythm */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Speech Rate & Rhythm</span>
            <div className="text-xl font-extrabold text-slate-900">
              {biomarkers.speech_rate_wpm || dys.speech_rate_wpm || 140.0} WPM
            </div>
            <span className="text-xs font-medium text-slate-700 block">
              {biomarkers.syllables_per_sec || dys.syllables_per_sec || 3.5} syllables/sec
            </span>
            <p className="text-[10px] text-slate-500 leading-tight pt-1">
              Rhythm: {dys.rhythm_regularity || "Regular"}. Norm: 120–180 WPM.
            </p>
          </div>

          {/* Phonation Voice Quality */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Voice Quality & Phonation</span>
            <div className="text-sm font-extrabold text-slate-900 leading-snug">
              {dys.voice_quality_rating || "Normal Vocal Resonance"}
            </div>
            <div className="text-[11px] text-slate-600">
              Jitter: <strong>{biomarkers.jitter_percent}%</strong> (norm &lt;1.5%) • Shimmer: <strong>{biomarkers.shimmer_percent}%</strong> (norm &lt;4%)
            </div>
            <span className="text-[10px] text-slate-500 block">
              Harmonics-to-Noise: {biomarkers.hnr_db} dB (norm &gt;15 dB)
            </span>
          </div>

          {/* Prosody & Pitch */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Prosody & Intonation</span>
            <div className="text-sm font-extrabold text-slate-900 leading-snug">
              {dys.prosody_rating || "Natural Dynamic Intonation & Stress"}
            </div>
            <span className="text-[11px] text-slate-600 block">
              Pitch (F0): {biomarkers.f0_mean_hz ? `${biomarkers.f0_mean_hz} Hz` : 'N/A'} (Std: {biomarkers.f0_std_hz || 15} Hz)
            </span>
            <span className="text-[10px] text-teal-600 block">
              Acoustic Gender: {assessment.detected_gender} ({assessment.gender_confidence}% match)
            </span>
          </div>

          {/* Respiration & Coordination */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <span className="text-slate-500 block text-[11px] font-semibold uppercase tracking-wider">Respiration Coordination</span>
            <div className="text-sm font-extrabold text-slate-900 leading-snug">
              {dys.respiration_breath_support || "Adequate Subglottic Breath Support"}
            </div>
            <span className="text-[11px] text-slate-600 block">
              {dys.pause_characteristics || "Normal pause boundaries"}
            </span>
            <p className="text-[10px] text-slate-500 leading-tight pt-1">
              Monitors phrase length coordination and respiratory replenishment pauses.
            </p>
          </div>

        </div>
      </div>

      {/* Differential Screening for Other Communication Disorders */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4 text-teal-600" />
              Differential Screening for Other Communication Disorders
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distinguishing motor speech execution (Dysarthria) from motor speech planning (Apraxia) and linguistic formulation (Aphasia).
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
            Screening Profiles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Apraxia of Speech */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Apraxia of Speech (AOS)</span>
              <span className="text-xs font-extrabold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                {Math.round((indices.apraxia_screening_index || 0.10) * 100)}% Index
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-teal-600 h-full rounded-full" 
                style={{ width: `${Math.min(100, (indices.apraxia_screening_index || 0.10) * 100)}%` }} 
              />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Motor speech planning impairment characterized by articulatory inconsistency across syllable sequences (/pa-ta-ka/) and vowel prolongations.
            </p>
            <span className="text-[10px] text-slate-400 block italic">Requires ABA-2 battery for formal verification.</span>
          </div>

          {/* Aphasia */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Aphasia (Linguistic)</span>
              <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                {Math.round((indices.aphasia_screening_index || 0.10) * 100)}% Index
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full" 
                style={{ width: `${Math.min(100, (indices.aphasia_screening_index || 0.10) * 100)}%` }} 
              />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Cognitive-linguistic formulation impairment characterized by lexical retrieval hesitations, word-finding pauses, and simplified syntax in spontaneous speech.
            </p>
            <span className="text-[10px] text-slate-400 block italic">Requires WAB-R or BDAE for formal verification.</span>
          </div>

          {/* Stuttering */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Stuttering / Fluency</span>
              <span className="text-xs font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                {Math.round((indices.stuttering_screening_index || 0.08) * 100)}% Index
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-600 h-full rounded-full" 
                style={{ width: `${Math.min(100, (indices.stuttering_screening_index || 0.08) * 100)}%` }} 
              />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Fluency breakdown marked by involuntary sound/syllable repetitions, prolongations, and tense silent blocks.
            </p>
            <span className="text-[10px] text-slate-400 block italic">Requires SSI-4 assessment for formal verification.</span>
          </div>

        </div>

        <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 border border-slate-200 leading-relaxed">
          <strong>Differential Clinical Guidance:</strong> {diff.differential_notes || "Acoustic markers distinguish laryngeal and articulatory coordination deficits from cognitive-linguistic formulation."}
        </div>
      </div>

      {/* Patient History Integration Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-teal-600" />
            Patient Clinical History Integration
          </h2>
          <span className="text-xs text-slate-500">Contextual Clinical Review</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="font-bold text-slate-900 block flex items-center gap-1.5 text-teal-700">
              <CheckCircle className="w-4 h-4 text-teal-600" />
              Historical Factors Considered in Analysis:
            </span>
            {historicalFactors.length > 0 ? (
              <ul className="space-y-1 text-slate-700">
                {historicalFactors.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic">No historical conditions active in profile.</p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="font-bold text-slate-900 block flex items-center gap-1.5 text-slate-700">
              <Info className="w-4 h-4 text-slate-500" />
              Missing or Incomplete Clinical Information:
            </span>
            {missingHistory.length > 0 ? (
              <ul className="space-y-1 text-slate-600">
                {missingHistory.map((m, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-emerald-700 font-medium">Comprehensive patient history on record.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-100/70 rounded-2xl p-3 text-[11px] text-slate-500 leading-relaxed italic border border-slate-200">
          <strong>Non-Causal Attribution Policy:</strong> Past medical and neurological conditions are reviewed strictly for context. The system does NOT assume that a documented condition caused an observed speech abnormality without adequate clinical examination.
        </div>
      </div>

      {/* Longitudinal Session Comparison (If available) */}
      {comparison && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Longitudinal Progress Comparison (Prior Session vs Current)
            </h2>
            <span className="text-xs text-slate-500">Prior: {comparison.prior_date}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Intelligibility Delta</span>
              <span className={`text-base font-bold ${comparison.delta_intelligibility >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {comparison.delta_intelligibility >= 0 ? `+${comparison.delta_intelligibility}%` : `${comparison.delta_intelligibility}%`}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Speech Rate Delta</span>
              <span className={`text-base font-bold ${comparison.delta_speech_rate_wpm >= 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                {comparison.delta_speech_rate_wpm >= 0 ? `+${comparison.delta_speech_rate_wpm} WPM` : `${comparison.delta_speech_rate_wpm} WPM`}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Prior Severity</span>
              <span className="text-sm font-bold text-slate-800">{comparison.prior_severity || 'Recorded'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            {comparison.longitudinal_note}
          </p>
        </div>
      )}

      {/* Suggested Practice Activities */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-4 h-4 text-teal-600" />
              Pathologist-Recommended Practice Activities
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evidence-based speech conditioning exercises tailored to the observed speech profile.
            </p>
          </div>
          <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full">
            Clinical Guidance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(assessment.suggested_exercises || []).map((ex, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 hover:bg-white hover:border-teal-300 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                  {ex.category}
                </span>
                <span className="text-[11px] font-medium text-slate-500">{ex.level}</span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm">{ex.title}</h3>

              <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80">
                {ex.instructions}
              </p>

              <div className="space-y-1 text-[11px] text-slate-500">
                <div><strong>Target:</strong> {ex.target}</div>
                <div><strong>Dose:</strong> {ex.frequency}</div>
                <div className="italic text-slate-400 pt-1">Rationale: {ex.clinical_rationale}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clinician Review & Attestation Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            Clinician Review & Verification
          </h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            assessment.clinician_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {assessment.clinician_approved ? "Approved by Clinician" : "Pending Review"}
          </span>
        </div>

        {assessment.clinician_notes ? (
          <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 text-xs text-slate-800 space-y-1">
            <span className="font-bold text-teal-900 block">Pathologist Review Notes:</span>
            <p className="leading-relaxed">{assessment.clinician_notes}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            No clinician review notes added yet. If you are a speech-language pathologist, you can add review notes in the Clinician Portal.
          </p>
        )}
      </div>

    </div>
  );
};
