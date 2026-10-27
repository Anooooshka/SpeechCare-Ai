import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { convertBlobToWav } from '../utils/audioEncoder';
import { 
  Mic, 
  Square, 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Volume2, 
  Clock, 
  FileAudio,
  ShieldCheck,
  Sparkles,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  HeartPulse
} from 'lucide-react';

export const AssessmentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode: 'record' or 'upload'
  const [inputMode, setInputMode] = useState('record');
  
  // Standardized Speech Task Selection (5 Tasks)
  const [taskType, setTaskType] = useState('reading_passage');
  
  // Patient Consent
  const [consentGiven, setConsentGiven] = useState(true);
  const [allowDemo, setAllowDemo] = useState(true);

  // Patient Clinical Context & Medical History state
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('Female');
  const [preferredLang, setPreferredLang] = useState('English');
  const [selectedConditions, setSelectedConditions] = useState(['None reported']);
  const [symptomOnset, setSymptomOnset] = useState('Subacute (< 6 months)');
  const [symptomDuration, setSymptomDuration] = useState('');
  const [previousAssessments, setPreviousAssessments] = useState('');
  const [treatmentHistory, setTreatmentHistory] = useState('');
  const [communicationNeeds, setCommunicationNeeds] = useState('');

  // Prepopulate from user profile if available
  useEffect(() => {
    if (user?.profile) {
      const p = user.profile;
      if (p.age) setPatientAge(p.age);
      if (p.gender) setPatientGender(p.gender);
      if (p.preferred_language) setPreferredLang(p.preferred_language);
      if (p.neurological_conditions && p.neurological_conditions.length > 0) {
        setSelectedConditions(p.neurological_conditions);
      }
      if (p.symptom_onset) setSymptomOnset(p.symptom_onset);
      if (p.symptom_duration_months) setSymptomDuration(p.symptom_duration_months);
      if (p.previous_assessments && p.previous_assessments !== "None recorded") setPreviousAssessments(p.previous_assessments);
      if (p.treatment_history && p.treatment_history !== "None recorded") setTreatmentHistory(p.treatment_history);
      if (p.communication_needs && p.communication_needs !== "None noted") setCommunicationNeeds(p.communication_needs);
    }
  }, [user]);

  // Recording states
  const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'recording', 'paused', 'preview'
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Audio Playback Preview State
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef(null);

  // Submission / Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const processingStepsList = [
    "Validating audio container, duration, and sampling rate...",
    "Scanning audio waveform for clipping, SNR noise floor, and silence ratio...",
    "Resampling to 16 kHz mono & extracting log-Mel spectrogram...",
    "Extracting acoustic biomarkers: Pitch (F0), Jitter, Shimmer, and HNR...",
    "Estimating articulation precision score and speech rate dynamics...",
    "Executing SpeechCareFusionNet neural inference & calibrated confidence...",
    "Evaluating differential screening indicators (Apraxia of Speech & Aphasia)...",
    "Integrating patient neurological history & compiling clinical report..."
  ];

  // Standardized tasks catalog
  const speechTasks = [
    {
      id: 'sustained_vowel',
      title: '1. Sustained Vowel (/ah/)',
      subtitle: 'Glottal Stability & Phonation',
      description: 'Hold the vowel sound "ah" steadily at conversational pitch for 5-8 seconds to measure vocal tremor, jitter, shimmer, and HNR.',
      target: 'Phonatory stability & voice quality',
      promptText: '"Take a comfortable breath, open your mouth wide, and say \'Ahhhh\' as steadily and evenly as you can at your normal speaking pitch and volume. Hold it for at least 5 to 8 seconds without stopping."'
    },
    {
      id: 'syllable_repetition',
      title: '2. Syllable Repetition (DDK)',
      subtitle: 'Labial, Alveolar & Velar Speed',
      description: 'Repeat "pa-pa-pa", "ta-ta-ta", and "ka-ka-ka" as rapidly and clearly as possible to measure diadochokinetic syllable rate and articulatory precision.',
      target: 'Single-place articulation speed & precision',
      promptText: '"Take a breath and repeat \'pa-pa-pa-pa-pa\' as quickly and clearly as you can for 5 seconds. Then do the same with \'ta-ta-ta-ta-ta\', followed by \'ka-ka-ka-ka-ka\'."'
    },
    {
      id: 'sequence_repetition',
      title: '3. Sequence Repetition (pa-ta-ka)',
      subtitle: 'Motor Speech Coordination',
      description: 'Repeat the multisyllabic sequence "pa-ta-ka" rapidly to evaluate speech-motor planning, sequencing, and rhythm coordination.',
      target: 'Alternating motion rate (distinguishes dysarthria from apraxia of speech)',
      promptText: '"Take a deep breath and repeat the sequence \'pa-ta-ka, pa-ta-ka, pa-ta-ka\' as rapidly, smoothly, and accurately as possible until told to stop (about 5 to 8 seconds)."'
    },
    {
      id: 'reading_passage',
      title: '4. Reading Sentences & Passage',
      subtitle: 'Connected Speech & Articulation',
      description: 'Read the standardized phonetically balanced Rainbow Passage to assess connected articulation, reading speech rate, and prosody.',
      target: 'Connected speech prosody, intonation, and phrasing',
      promptText: '"When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon."'
    },
    {
      id: 'spontaneous_speech',
      title: '5. Spontaneous Speech Prompt',
      subtitle: 'Cognitive-Linguistic Fluency',
      description: 'Speak freely in response to an open clinical prompt for 15-30 seconds to evaluate spontaneous phrasing, lexical latency, and phrase length.',
      target: 'Spontaneous formulation & screening for aphasia hesitations',
      promptText: '"Please describe your typical morning routine from the moment you wake up, or tell me about a hobby you enjoy. Speak in complete sentences for about 15 to 30 seconds."'
    }
  ];

  const currentTaskObj = speechTasks.find(t => t.id === taskType) || speechTasks[3];

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

  const toggleCondition = (cond) => {
    if (cond === "None reported") {
      setSelectedConditions(["None reported"]);
      return;
    }
    const filtered = selectedConditions.filter(c => c !== "None reported");
    if (filtered.includes(cond)) {
      const next = filtered.filter(c => c !== cond);
      setSelectedConditions(next.length > 0 ? next : ["None reported"]);
    } else {
      setSelectedConditions([...filtered, cond]);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  // Recording Timer
  useEffect(() => {
    if (recordingState === 'recording') {
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [recordingState]);

  // Audio recording handlers
  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    try {
      const audioConstraints = {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (constraintErr) {
        console.warn("Fallback to basic audio constraints:", constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        try {
          const wavBlob = await convertBlobToWav(rawBlob, 16000);
          setAudioBlob(wavBlob);
          const url = URL.createObjectURL(wavBlob);
          setAudioUrl(url);
        } catch (convErr) {
          console.warn("WAV conversion fallback:", convErr);
          setAudioBlob(rawBlob);
          const url = URL.createObjectURL(rawBlob);
          setAudioUrl(url);
        }
        setRecordingState('preview');
      };

      recorder.start(100);
      setRecordDuration(0);
      setRecordingState('recording');
    } catch (err) {
      setErrorMessage(`Microphone access error: ${err.message}. Please allow microphone permissions in your browser.`);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setUploadedFile(null);
    setRecordDuration(0);
    setRecordingState('idle');
    setIsPlayingPreview(false);
    setErrorMessage(null);
  };

  const togglePreviewPlayback = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleFileUpload = (e) => {
    setErrorMessage(null);
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      setErrorMessage("Audio file exceeds maximum allowed size (16MB).");
      return;
    }

    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setRecordingState('preview');
  };

  // Submission handler
  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!consentGiven) {
      setErrorMessage("Patient consent is required before performing speech analysis.");
      return;
    }

    const fileToUpload = inputMode === 'record' ? audioBlob : uploadedFile;
    if (!fileToUpload) {
      setErrorMessage("Please record audio or upload an audio file before analyzing.");
      return;
    }

    if (inputMode === 'record' && recordDuration < 2) {
      setErrorMessage("Audio recording is too brief (less than 2 seconds). Please record at least 3-5 seconds of sustained vocalization.");
      return;
    }

    // Build patient history payload
    const patientHistoryPayload = {
      age: patientAge ? parseInt(patientAge) : (user?.profile?.age || null),
      gender: patientGender || user?.profile?.gender || "Female",
      preferred_language: preferredLang,
      neurological_conditions: selectedConditions,
      symptom_onset_duration: symptomOnset,
      symptom_duration_months: symptomDuration ? parseInt(symptomDuration) : null,
      previous_assessments: previousAssessments || "None recorded",
      treatment_history: treatmentHistory || "None recorded",
      communication_needs: communicationNeeds || "None noted",
      primary_concern: "Speech screening and dysarthria severity evaluation"
    };

    // Prepare FormData
    const formData = new FormData();
    if (inputMode === 'record') {
      formData.append('audio', fileToUpload, 'microphone_recording.wav');
    } else {
      formData.append('audio', fileToUpload, fileToUpload.name);
    }
    formData.append('task_type', taskType);
    formData.append('consent', 'true');
    formData.append('allow_demo', allowDemo ? 'true' : 'false');
    formData.append('patient_history', JSON.stringify(patientHistoryPayload));

    setIsProcessing(true);
    setProcessingStep(0);

    const stepInterval = setInterval(() => {
      setProcessingStep(prev => (prev < processingStepsList.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const response = await api.submitAssessment(formData);
      clearInterval(stepInterval);
      setIsProcessing(false);
      navigate(`/results/${response.assessment.id}`);
    } catch (err) {
      clearInterval(stepInterval);
      setIsProcessing(false);
      setErrorMessage(err.message || "An unexpected error occurred during audio processing.");
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      
      {/* Title & Guidance Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold px-2.5 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Standardized Clinical Screening Protocol</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Speech & Language Assessment</h1>
        <p className="text-sm text-slate-600">
          Complete the standardized speech task below using your microphone or by uploading an audio recording. All signals undergo pre-analysis audio validation (SNR, clipping, silence check) and multi-task biomarker screening.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-sm">Assessment Validation Alert</span>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Step 1: Select Standardized Speech Task */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">1</span>
            Select Standardized Speech Task (5 Protocols)
          </h2>
          <span className="text-xs text-slate-500 font-medium">Standardized Speech-Motor Tasks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {speechTasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTaskType(t.id)}
              className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                taskType === t.id
                  ? 'border-teal-500 bg-teal-50/60 shadow-sm ring-1 ring-teal-500'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="font-bold text-slate-900 text-xs mb-0.5">{t.title}</div>
                <div className="text-[11px] font-semibold text-teal-700 mb-1">{t.subtitle}</div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t.target}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Task Prompt Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Info className="w-4 h-4 text-teal-600" />
              Task Instructions & Phonetic Cue:
            </span>
            <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
              {currentTaskObj.title}
            </span>
          </div>

          <p className="italic font-serif leading-relaxed text-slate-800 text-sm bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            {currentTaskObj.promptText}
          </p>

          <p className="text-[11px] text-slate-500 pt-1">
            <strong>Clinical purpose:</strong> {currentTaskObj.description}
          </p>
        </div>
      </div>

      {/* Step 2: Patient Clinical Medical History Context (Expandable) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-sm">
        <div 
          onClick={() => setShowHistoryForm(!showHistoryForm)}
          className="flex items-center justify-between cursor-pointer pb-2 border-b border-slate-100"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">2</span>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                Patient Medical & Neurological Context
              </h2>
              <p className="text-[11px] text-slate-500">
                Optional demographic and neurological history used to contextualize speech analysis findings.
              </p>
            </div>
          </div>

          <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
            {showHistoryForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {showHistoryForm && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Patient Age</label>
                <input
                  type="number"
                  placeholder="e.g. 54"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Biological Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white"
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
                  placeholder="e.g. English, Spanish"
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Neurological Conditions Chips */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Neurological Conditions on File
              </label>
              <div className="flex flex-wrap gap-2">
                {neurologicalConditionsList.map((cond) => {
                  const isSelected = selectedConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleCondition(cond)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isSelected 
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Symptom Onset & Duration</label>
                <select
                  value={symptomOnset}
                  onChange={(e) => setSymptomOnset(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="Sudden (<24h)">Sudden (Acute onset &lt; 24h, e.g. stroke)</option>
                  <option value="Subacute (< 6 months)">Subacute (1 to 6 months)</option>
                  <option value="Gradual / Insidious (> 6 months)">Gradual / Insidious (&gt; 6 months, e.g. neurodegenerative)</option>
                  <option value="Congenital / Developmental">Congenital / Developmental</option>
                  <option value="Unknown / Not specified">Unknown / Not specified</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Duration in Months</label>
                <input
                  type="number"
                  placeholder="e.g. 12"
                  value={symptomDuration}
                  onChange={(e) => setSymptomDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Prior Speech Assessments</label>
                <input
                  type="text"
                  placeholder="e.g. Frenchay Dysarthria Assessment-2 (2024)"
                  value={previousAssessments}
                  onChange={(e) => setPreviousAssessments(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Previous / Current Treatments</label>
                <input
                  type="text"
                  placeholder="e.g. LSVT LOUD, Levodopa, physical therapy"
                  value={treatmentHistory}
                  onChange={(e) => setTreatmentHistory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Communication Needs & Compensatory Habits</label>
              <input
                type="text"
                placeholder="e.g. Wears hearing aid in left ear, severe vocal fatigue after afternoon speech"
                value={communicationNeeds}
                onChange={(e) => setCommunicationNeeds(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Record or Upload Speech */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">3</span>
            Audio Recording & Signal Capture
          </h2>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => { setInputMode('record'); resetRecording(); }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                inputMode === 'record' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Microphone
            </button>
            <button
              onClick={() => { setInputMode('upload'); resetRecording(); }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                inputMode === 'upload' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Audio
            </button>
          </div>
        </div>

        {/* Microphone Recording Interface */}
        {inputMode === 'record' && (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-6">
            
            {/* Live Timer & Recording Status */}
            <div className="text-center space-y-1">
              <div className="text-4xl font-mono font-extrabold text-slate-800 tracking-wider">
                {formatTimer(recordDuration)}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs">
                {recordingState === 'recording' && (
                  <span className="flex items-center gap-1.5 text-rose-600 font-semibold animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    Recording in progress... (speak clearly)
                  </span>
                )}
                {recordingState === 'paused' && (
                  <span className="text-amber-600 font-semibold">Recording paused</span>
                )}
                {recordingState === 'preview' && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Audio captured successfully ({formatTimer(recordDuration)})
                  </span>
                )}
                {recordingState === 'idle' && (
                  <span className="text-slate-500">Ready to record. Click red microphone button below to start.</span>
                )}
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center gap-4">
              {recordingState === 'idle' && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform hover:scale-105"
                  title="Start Recording"
                >
                  <Mic className="w-7 h-7" />
                </button>
              )}

              {recordingState === 'recording' && (
                <>
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="w-12 h-12 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center shadow-sm"
                    title="Pause"
                  >
                    <Pause className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform hover:scale-105"
                    title="Stop & Save Recording"
                  >
                    <Square className="w-6 h-6" />
                  </button>
                </>
              )}

              {recordingState === 'paused' && (
                <>
                  <button
                    type="button"
                    onClick={resumeRecording}
                    className="w-12 h-12 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-sm"
                    title="Resume"
                  >
                    <Play className="w-5 h-5 ml-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md"
                    title="Finish Recording"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </>
              )}

              {recordingState === 'preview' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePreviewPlayback}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm"
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlayingPreview ? "Pause Audio" : "Listen Preview"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetRecording}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Re-record</span>
                  </button>
                </div>
              )}
            </div>

            {audioUrl && (
              <audio
                ref={audioPreviewRef}
                src={audioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
            )}
          </div>
        )}

        {/* File Upload Dropzone Interface */}
        {inputMode === 'upload' && (
          <div className="p-8 border-2 border-dashed border-slate-300 hover:border-teal-400 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-4 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileAudio className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <label className="cursor-pointer font-semibold text-teal-600 hover:text-teal-700 text-sm">
                <span>Click to browse audio files</span>
                <input
                  type="file"
                  accept="audio/wav,audio/mp3,audio/ogg,audio/webm,audio/flac,audio/m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500">Supports WAV, MP3, OGG, WEBM, FLAC, M4A (Max 16MB)</p>
            </div>

            {uploadedFile && (
              <div className="bg-white border border-teal-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 text-xs max-w-md w-full">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{uploadedFile.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 flex-shrink-0">{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <button
                    type="button"
                    onClick={togglePreviewPlayback}
                    className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-semibold"
                  >
                    {isPlayingPreview ? "Pause" : "Play"}
                  </button>
                </div>
              </div>
            )}

            {audioUrl && (
              <audio
                ref={audioPreviewRef}
                src={audioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
            )}
          </div>
        )}

      </div>

      {/* Step 4: Consent & AI Analysis Execution */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-6 shadow-sm">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs flex items-center justify-center font-bold">4</span>
          Informed Consent & AI Screening Execution
        </h2>

        {/* Consent Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition-colors">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 mt-0.5"
          />
          <div className="text-xs text-slate-700 leading-relaxed space-y-1">
            <span className="font-semibold text-slate-900 block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Informed Patient Consent for Clinical Screening & Acoustic Biomarker Processing
            </span>
            <p>
              I authorize SpeechCare AI to evaluate my audio recording to extract acoustic biomarkers, perform dysarthria severity estimation, screen for associated communication disorder indicators, and generate clinical decision-support summaries. I understand that I retain the right to permanently delete my recordings at any time (Right to Erasure).
            </p>
          </div>
        </label>

        {/* Submit Button & Progress State */}
        <div className="pt-2">
          {isProcessing ? (
            <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                <span className="font-semibold text-sm">Processing Audio Waveform & Speech Dynamics...</span>
              </div>

              {/* Progress Steps */}
              <div className="space-y-2 text-xs">
                {processingStepsList.map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 transition-opacity ${
                      idx === processingStep
                        ? 'text-teal-300 font-semibold opacity-100'
                        : idx < processingStep
                        ? 'text-slate-400 opacity-60'
                        : 'text-slate-600 opacity-30'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={(!audioBlob && !uploadedFile) || !consentGiven}
              className={`w-full py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all ${
                (!audioBlob && !uploadedFile) || !consentGiven
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 hover:-translate-y-0.5'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>Run AI Speech Analysis & Severity Assessment</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
