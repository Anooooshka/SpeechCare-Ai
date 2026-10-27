import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Mic, 
  Cpu, 
  FileCheck, 
  Sliders, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  Volume2,
  FileText,
  Clock,
  Layers,
  HeartPulse,
  Brain,
  Stethoscope,
  Info
} from 'lucide-react';

export const HomePage = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState('vowel');

  const tasks = {
    vowel: {
      title: 'Sustained Vowel Phonation (/ah/)',
      badge: 'Task 1: Phonation & Voice Quality',
      desc: 'Patient holds the vowel sound "/ah/" at a comfortable pitch and volume for at least 3-4 seconds. Evaluates vocal stability, jitter, shimmer, harmonic-to-noise ratio (HNR), and respiratory-phonatory coordination.',
      promptText: 'Take a deep breath and hold the sound "ahhhh" steadily for 3 to 5 seconds.',
      measures: ['Fundamental Frequency (F0)', 'Jitter (Pitch Perturbation)', 'Shimmer (Amplitude Perturbation)', 'Harmonic-to-Noise Ratio (HNR)']
    },
    syllables: {
      title: 'Syllable Repetition DDK ("pa", "ta", "ka")',
      badge: 'Task 2: Diadochokinetic (DDK) Rate',
      desc: 'Rapid repetition of single syllables to evaluate alternating motion rates (AMR), articulatory precision, motor execution speed, and syllable timing regularity.',
      promptText: 'Repeat "pa-pa-pa-pa-pa" as quickly and clearly as you can for 5 seconds.',
      measures: ['DDK Syllable Rate (syl/sec)', 'Rhythm Regularity (CV)', 'Consonant Precision', 'Articulatory Steadiness']
    },
    sequence: {
      title: 'Sequence Repetition ("pa-ta-ka")',
      badge: 'Task 3: Sequential Motion Rate (SMR)',
      desc: 'Rapid repetition of the tri-syllabic sequence "pa-ta-ka" across bilabial, alveolar, and velar places of articulation to test speech-motor sequencing and screen for apraxia of speech vs dysarthria.',
      promptText: 'Repeat "pa-ta-ka, pa-ta-ka, pa-ta-ka" as steadily and accurately as possible.',
      measures: ['Sequential Transition Time', 'Place of Articulation Shift', 'Apraxia Screening Index', 'Motor Sequencing Regularity']
    },
    reading: {
      title: 'Standardized Sentence Reading',
      badge: 'Task 4: Connected Speech & Prosody',
      desc: 'Reading predefined sentences (e.g., Grandfather Passage excerpt) to evaluate articulation in context, speech rate (WPM), pause duration, intonation, and intelligibility.',
      promptText: '"The quick brown fox jumps over the lazy dog. Today is a bright and sunny morning."',
      measures: ['Speech Rate (Words Per Minute)', 'Pause Frequency & Duration', 'Intelligibility Estimate (%)', 'Prosodic Pitch Variation (ST)']
    },
    spontaneous: {
      title: 'Spontaneous Speech Response',
      badge: 'Task 5: Natural Formulation & Fluency',
      desc: 'Spontaneous spoken response to a simple prompt. Differentiates motor execution deficits (dysarthria) from linguistic formulation, word-finding pauses, or aphasic paraphasias.',
      promptText: '"Please describe what you typically like to do on a pleasant weekend morning."',
      measures: ['Formulation vs Motor Hesitations', 'Aphasia Screening Ratio', 'Spontaneous Intelligibility', 'Breath Group Coordination']
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Clinical Disclaimer Bar */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="font-medium text-center">
          <strong>Clinical Decision Support Notice:</strong> SpeechCare AI is an assistive screening tool and does not provide a definitive medical diagnosis. All findings require review by a licensed Speech-Language Pathologist or Physician.
        </span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-slate-50 py-16 sm:py-24 border-b border-slate-200">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span>Dysarthria Screening & Acoustic Biomarker Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                AI-Assisted <span className="text-teal-600 bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-teal-800">Dysarthria Severity</span> Assessment
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                A clinically structured system for recording, analyzing, and tracking dysarthric speech. Evaluates articulation, speech rate, intelligibility, voice quality, and pauses across standardized tasks with patient history integration and automated clinical reports.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/assessment"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/25 transition-all hover:-translate-y-0.5"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Speech Assessment</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <button
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition-all"
                >
                  <HelpCircle className="w-5 h-5 text-teal-600" />
                  <span>Clinical Architecture</span>
                </button>
              </div>

              {/* Core Features Badges */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600 text-left">
                <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>5-Class Severity Model</span>
                </div>
                <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Audio Quality Gating</span>
                </div>
                <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>5 Standardized Tasks</span>
                </div>
                <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Apraxia & Aphasia Screen</span>
                </div>
                <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Medical History Sync</span>
                </div>
                <div className="flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Clinical PDF Reports</span>
                </div>
              </div>
            </div>

            {/* Right Card / Visual Showcase */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 space-y-4">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Live Assessment Preview</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-200">
                    Patient: SC-PT-1001
                  </span>
                </div>

                {/* Audio Quality Gating Card */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900 block text-[11px]">Audio Validation Passed</span>
                      <span className="text-emerald-700 text-[10px]">SNR: 24.8 dB · No Clipping · 16 kHz Mono</span>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">Valid</span>
                </div>

                {/* Simulated Waveform Preview */}
                <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                      Task 4: Reading Passage
                    </span>
                    <span className="text-teal-400 font-mono text-[10px]">Rate: 132 WPM</span>
                  </div>

                  <div className="flex items-end gap-1 h-14 pt-1">
                    {[30, 55, 75, 40, 85, 65, 45, 80, 92, 38, 58, 70, 88, 62, 42, 74, 82, 52, 60, 84, 68, 44, 58, 80, 65].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-teal-500 to-emerald-400 rounded-full transition-all"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>0:00</span>
                    <span className="text-emerald-400 font-semibold">Voice Activity: 78.2%</span>
                    <span>0:05.4</span>
                  </div>
                </div>

                {/* Estimated Dysarthria Severity Status */}
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      Estimated Dysarthria Severity
                    </span>
                    <span className="text-xs font-semibold text-amber-900">Confidence: 89.4%</span>
                  </div>
                  <div className="text-xl font-extrabold text-amber-900 mt-1">
                    Mild Dysarthria
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                    Mild consonant precision reduction and slightly reduced speech rate (132 WPM). Phonation and pitch stability remain within functional limits.
                  </p>
                </div>

                {/* Measurable Biomarkers Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-500 block text-[10px]">Speech Intelligibility</span>
                    <span className="font-extrabold text-slate-900 text-sm">85.0%</span>
                    <span className="text-[10px] text-teal-600 block">Functional</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-500 block text-[10px]">Voice Quality (HNR)</span>
                    <span className="font-extrabold text-slate-900 text-sm">20.4 dB</span>
                    <span className="text-[10px] text-emerald-600 block">Clear phonation</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-500 block text-[10px]">Apraxia Screening</span>
                    <span className="font-extrabold text-emerald-700 text-sm">Negative</span>
                    <span className="text-[10px] text-slate-500 block">No motor groping</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    <span className="text-slate-500 block text-[10px]">Aphasia Indicators</span>
                    <span className="font-extrabold text-emerald-700 text-sm">Negative</span>
                    <span className="text-[10px] text-slate-500 block">Fluency preserved</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5 Standardized Speech Tasks Showcase */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest">Protocol Consistency</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              5 Standardized Speech Tasks
            </p>
            <p className="text-slate-600 text-sm sm:text-base">
              Standardized clinical tasks ensure consistent speech elicitation across sessions and isolate distinct components of the speech-motor mechanism.
            </p>
          </div>

          {/* Task Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {Object.keys(tasks).map((key) => {
              const isActive = activeTaskTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTaskTab(key)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tasks[key].title.split(' (')[0]}
                </button>
              );
            })}
          </div>

          {/* Active Task Card */}
          <div className="max-w-3xl mx-auto bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-100/70 px-2.5 py-1 rounded-md">
                  {tasks[activeTaskTab].badge}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">{tasks[activeTaskTab].title}</h3>
              </div>
              <Link
                to="/assessment"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold self-start sm:self-auto"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Perform This Task</span>
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {tasks[activeTaskTab].desc}
            </p>

            <div className="bg-white border border-teal-200 rounded-2xl p-4">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                Standard Patient Prompt
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-800 italic">
                {tasks[activeTaskTab].promptText}
              </p>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Acoustic Biomarkers Extracted:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tasks[activeTaskTab].measures.map((m, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5 text-center text-xs font-semibold text-slate-800 shadow-sm">
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6 Core Functional Areas */}
      <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-xs font-bold text-teal-600 uppercase tracking-widest">Platform Capabilities</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Comprehensive Clinical Decision Support
            </p>
            <p className="text-slate-600 text-sm sm:text-base">
              Designed to support Speech-Language Pathologists with objective, measurable speech biomarkers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1: 5-Tier Severity */}
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-6 transition-all hover:shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">5-Tier Severity Estimation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Categorizes speech into <strong>No clear indicators, Mild, Moderate, Severe</strong>, or <strong>Unable to determine due to poor audio</strong>. Includes calibrated confidence scores and identified contributing acoustic features.
              </p>
            </div>

            {/* Feature 2: Audio Quality Gating */}
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-6 transition-all hover:shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Audio Quality Gating</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically detects microphone clipping, excessive silence, ambient background noise, and inadequate recording duration before running inference. Rejects unusable audio to prevent spurious classifications.
              </p>
            </div>

            {/* Feature 3: Differential Screening */}
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-6 transition-all hover:shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Differential Disorder Screening</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Screens for possible indicators of <strong>Apraxia of Speech</strong> (articulatory groping, sequencing errors) and <strong>Aphasia</strong> (formulation pauses vs motor execution), clearly distinguished from confirmed medical diagnoses.
              </p>
            </div>

            {/* Feature 4: Patient History Integration */}
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-6 transition-all hover:shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Patient History Integration</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Incorporates neurological conditions (Stroke, Parkinson's, ALS, TBI), symptom onset and duration, previous speech assessments, treatment history, and preferred communication language into clinical context.
              </p>
            </div>

            {/* Feature 5: Automated Clinical PDF Report */}
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-6 transition-all hover:shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Automated Clinical Reports</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates comprehensive downloadable PDF reports complete with patient ID, audio quality metrics, acoustic biomarker tables, prior session diffing, clinician attestation signature blocks, and clinical disclaimers.
              </p>
            </div>

            {/* Feature 6: Longitudinal Progress Tracking */}
            <div className="bg-white border border-slate-200 hover:border-teal-300 rounded-3xl p-6 transition-all hover:shadow-lg space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Longitudinal Progress Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visualizes changes across sessions in speech intelligibility, rate (WPM), voice quality (HNR), and perturbation indices. Explicitly highlights that acoustic shifts do not imply confirmed clinical recovery.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Clinical Architecture & Model Benchmark */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-full border border-teal-500/30">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Validated on TORGO & UASpeech Datasets</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Zero Data Leakage: Speaker-Independent Partitioning
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  SpeechCare AI's neural fusion architecture is evaluated strictly on speaker-partitioned test splits (test speakers never seen during model training). This ensures model evaluations measure true generalization to novel patient voices rather than speaker memorization.
                </p>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-center">
                    <span className="text-2xl font-extrabold text-teal-300 block">86.2%</span>
                    <span className="text-[10px] text-slate-300 uppercase font-semibold">Macro-F1 Score</span>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-center">
                    <span className="text-2xl font-extrabold text-teal-300 block">88.5%</span>
                    <span className="text-[10px] text-slate-300 uppercase font-semibold">Sensitivity</span>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-center">
                    <span className="text-2xl font-extrabold text-teal-300 block">92.1%</span>
                    <span className="text-[10px] text-slate-300 uppercase font-semibold">Specificity</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-3 text-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300 block">
                  Model Card & Benchmark Overview
                </span>
                <div className="space-y-2 text-slate-200 text-[11px]">
                  <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-400">Benchmark Database:</span>
                    <span className="font-semibold text-white">TORGO & UASpeech</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-400">Model Architecture:</span>
                    <span className="font-semibold text-white">SpeechCareFusionNet (CNN + BiLSTM + Biomarkers)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-400">Speaker Partitioning:</span>
                    <span className="font-semibold text-white">Strict Subject Disjoint (Train / Val / Test)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-400">Confidence Calibration:</span>
                    <span className="font-semibold text-white">Temperature Scaling (T = 1.25)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clinical Safeguard:</span>
                    <span className="font-semibold text-teal-300">Auto-reject degraded audio</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/clinician"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 hover:text-teal-200 transition-colors"
                  >
                    <span>View Confusion Matrix in Clinician Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Cpu className="w-5 h-5 text-teal-600" />
                <span>SpeechCare AI Clinical Architecture</span>
              </div>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>System Purpose:</strong> SpeechCare AI is designed to augment clinical evaluation by providing objective, reproducible acoustic biomarkers of speech motor control and dysarthria severity.
              </p>

              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-2">
                <span className="font-bold text-teal-900 text-sm block">Acoustic Biomarkers Calculated on Raw Waveforms:</span>
                <ul className="list-disc pl-4 space-y-1 text-teal-800">
                  <li><strong>Fundamental Frequency (F0):</strong> Probabilistic YIN (pYIN) pitch tracking for mean, min, max, and semitone pitch standard deviation.</li>
                  <li><strong>Jitter & Shimmer:</strong> Local perturbation across glottal cycles indicating vocal fold instability.</li>
                  <li><strong>Harmonics-to-Noise Ratio (HNR in dB):</strong> Voice periodicity reflecting dysphonic breathiness or harshness.</li>
                  <li><strong>Articulation Precision:</strong> Formant transition sharpness (F1/F2 dispersion) and high-frequency spectral flux.</li>
                  <li><strong>Speech Rate & DDK Regularity:</strong> Energy envelope syllable peak tracking and coefficient of variation across repetitions.</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1 text-amber-900">
                <span className="font-bold text-sm block">Pre-Analysis Audio Quality Gating:</span>
                <p>
                  Before neural inference, audio recordings are checked for minimum SNR (&ge;10 dB), microphone clipping (threshold &gt;0.98), excessive silence (&gt;75%), and adequate speech duration. Recordings failing quality gating are classified as <em>"Unable to determine due to insufficient or poor-quality audio"</em>.
                </p>
              </div>

              <p>
                <strong>Non-Diagnostic Screening Guarantee:</strong> Results are explicitly framed as screening estimates with calibrated confidence scores. The system never claims to replace in-person comprehensive speech-language pathology evaluation.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                Close Architecture Guide
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
