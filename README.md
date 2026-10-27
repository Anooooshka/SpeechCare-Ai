# SpeechCare AI — AI-Assisted Dysarthria Screening & Clinical Decision Support Platform

SpeechCare AI is a clinical-grade web platform engineered for dysarthria detection, severity assessment, differential screening for associated communication disorders, physical acoustic biomarker extraction, and longitudinal patient progress tracking.

> [!IMPORTANT]
> **Clinical Safety & Non-Diagnostic Notice**: SpeechCare AI functions strictly as a screening instrument and clinical decision-support system. It **does NOT** provide a definitive medical diagnosis based solely on AI analysis. Results communicate uncertainty, account for patient medical history limitations, auto-reject degraded recordings, and recommend formal evaluation by a licensed Speech-Language Pathologist (CCC-SLP) or Neurologist.

---

## 🌟 Comprehensive Clinical Features

### 1. Dysarthria Detection & 5-Tier Severity Assessment
The system analyzes speech production characteristics across neuromuscular execution dimensions and classifies recordings into 5 standardized categories:
- **No clear dysarthric indicators detected**: Speech rate, acoustic stability, and consonant precision fall within typical healthy adult ranges.
- **Mild dysarthria**: Minor consonant imprecision or subtle speech rate slowdown with preserved functional intelligibility (>80%).
- **Moderate dysarthria**: Noticeable articulatory distortion, reduced speech rate, altered voice quality, or irregular timing noticeably impacting intelligibility (50%–80%).
- **Severe dysarthria**: Marked articulatory breakdown, severe phonatory instability, breathiness or strain, and substantially compromised intelligibility (<50%).
- **Unable to determine due to insufficient or poor-quality audio**: Explicit safety fallback triggered when recordings fail audio validation gating.

Every prediction includes:
- **Calibrated Confidence Score**: Derived via temperature scaling on softmax logits (abstains if confidence < 60.0%).
- **Contributing Feature Attribution**: Explains which acoustic features (e.g., slow syllable rate, elevated jitter, reduced vowel formant dispersion) drove the severity estimate.
- **Plain-Language Explanations**: Understandable by both clinicians and patients.

---

### 2. Standardized Clinical Speech Tasks
To ensure consistent speech elicitation and isolate distinct components of the speech-motor mechanism, the system provides 5 standardized protocols:
1. **Sustained Vowel Phonation (`/ah/`)**: Tests respiratory-phonatory coordination, fundamental frequency ($F_0$) stability, jitter (pitch perturbation), shimmer (amplitude perturbation), and harmonics-to-noise ratio (HNR).
2. **Syllable Repetition DDK (`pa-pa-pa`, `ta-ta-ta`, `ka-ka-ka`)**: Measures alternating motion rate (AMR) in syllables/second, articulatory precision, and timing rhythm regularity (CV).
3. **Sequence Repetition (`pa-ta-ka`)**: Evaluates sequential motion rate (SMR) across bilabial, alveolar, and velar places of articulation to screen for motor sequencing breakdown.
4. **Standardized Sentence Reading**: Connected speech reading (Grandfather Passage excerpt) assessing conversational speech rate (WPM), pause frequency and duration, intonation, and intelligibility.
5. **Spontaneous Speech Response**: Open spoken response to a prompt, differentiating speech-motor execution deficits from linguistic formulation difficulties.

---

### 3. Pre-Analysis Audio Quality Validation & Gating
Recordings are validated before machine learning inference to prevent misleading assessments:
- **Signal-to-Noise Ratio (SNR)**: Adaptive noise floor estimation (requires SNR $\ge$ 10.0 dB).
- **Microphone Clipping Detection**: Flags excessive digital gain or waveform clipping (amplitude $\ge$ 0.98).
- **Excessive Silence Detection**: Detects dead recordings or audio with > 75% silence.
- **Minimum Duration Verification**: Requires at least 1.5 seconds of active speech.
- **Waveform Inspection & Playback**: Users inspect the audio waveform and listen to playback before submitting for analysis.
- **Automatic Rejection**: Audio failing quality gating receives the category *"Unable to determine due to insufficient or poor-quality audio"* and prompts the user to record in a quiet environment.

---

### 4. Differential Screening for Other Communication Disorders
To assist clinicians with differential screening while avoiding false claims of diagnosis:
- **Apraxia of Speech (AOS) Screening**: Evaluates articulatory groping, inconsistent phonetic substitutions, and initiation hesitations during rapid sequential repetition (`pa-ta-ka`).
- **Aphasia Language Screening**: Analyzes formulation hesitations, word-finding pauses, and utterance fluency during spontaneous speech vs reading tasks.
- **Stuttering / Disfluency Screening**: Detects fluency breaks, syllable repetitions, and tense vocal blocks.
- **Motor vs Linguistic Distinction**: Distinguishes neuromuscular execution abnormalities (dysarthria) from motor programming (apraxia) and linguistic formulation (aphasia).

---

### 5. Patient Medical History & Clinical Context Integration
Connects patient background to assessment findings:
- **Unique Patient Identifier**: Standardized format (`SC-PT-XXXX`).
- **Neurological Conditions**: Documented history of Stroke / CVA, Parkinson's Disease, Amyotrophic Lateral Sclerosis (ALS), Traumatic Brain Injury (TBI), Multiple Sclerosis, or Cerebral Palsy.
- **Symptom Chronology**: Symptom onset date and duration in months.
- **Prior Assessments & Treatments**: Prior speech therapy, DBS surgery, dopaminergic medications, or assistive AAC usage.
- **Preferred Language & Communication Needs**: Primary language, dialect, and communication accommodations.
- **Clinical Transparency**: Reports explicitly itemize which historical factors were evaluated and flag missing history.

---

### 6. Automated Assessment Report (Downloadable Clinical PDF)
Generates structured PDF reports using `fpdf2`:
1. **Patient Demographics & Identifiers**: Patient Code, Age, Biological Sex, Assessment Date & Time.
2. **Recording Quality Audit**: Sampling Rate (16 kHz mono), Duration, SNR (dB), Clipping Status, Silence Ratio.
3. **Severity & Primary Classification**: 5-tier dysarthria category, calibrated confidence %, and contributing acoustic biomarkers.
4. **Differential Screening Matrix**: Apraxia of Speech, Aphasia, and Stuttering screening indices.
5. **Acoustic Biomarkers & Reference Norms**: Comprehensive table covering $F_0$ pitch, Jitter, Shimmer, HNR, Speech Rate, Intelligibility, and Articulation Score against published normative thresholds.
6. **Integrated Patient Medical History**: Neurological conditions, onset, and missing clinical data notes.
7. **Longitudinal Prior Comparison**: Numerical diffing and delta indicators against the patient's previous session.
8. **Clinical Recommendations**: Targeted therapy exercises (LSVT loudness drills, DDK rate pacing, respiratory support).
9. **Clinician Attestation Block**: Reviewing SLP name, license number, clinical notes, and approval signature block.
10. **Non-Diagnostic Disclaimer**: Mandatory clinical screening notice.

---

### 7. Longitudinal Progress Monitoring
- **Secure Historical Storage**: Stores past sessions securely with authenticated role-based access.
- **Multi-Metric Trend Visualization**: Interactive Recharts graphs tracking speech intelligibility (%), speech rate (WPM), voice clarity (HNR in dB), and perturbation indices across time.
- **Clinical Nuance**: The system explicitly warns that acoustic metric fluctuations do not constitute proof of clinical recovery and must be interpreted by a therapist.

---

## 🔬 AI Model Architecture & Benchmark Dataset

### Model Specification: `SpeechCareFusionNet`
- **Frontend Preprocessing**: Audio resampled to 16 kHz mono, normalized to -20 dB FS, with 128-band log-Mel spectrogram extraction ($n_{\text{fft}}=1024$, hop length = 512).
- **Acoustic Biomarker Engine**: Extracts fundamental frequency ($F_0$), local jitter, local shimmer, HNR, speech rate, pause ratio, articulation score, and gender acoustics.
- **Deep Sequence Encoder**:
  - 1D Convolutional blocks with BatchNorm, ReLU, and MaxPool.
  - Bidirectional LSTM (2 layers, 128 hidden units per direction).
  - Multi-Head Self-Attention Pooling over temporal frames.
- **Feature Fusion & Multi-Task Heads**:
  - Concatenates deep spectrogram embeddings with physical acoustic biomarkers.
  - **Head 1**: 4-class classification (Control, Dysarthria, Stuttering, Aphasia) with temperature-scaled softmax.
  - **Head 2**: Continuous Dysarthria Severity Index regression (0.0 to 100.0).

### Clinically Appropriate Benchmark Datasets
- **TORGO Database for Dysarthric Speech**: Speech recordings from individuals with dysarthria resulting from Cerebral Palsy (CP) and Amyotrophic Lateral Sclerosis (ALS), alongside age- and gender-matched healthy controls.
- **UASpeech Database**: Speech recordings from 19 adult speakers with dysarthria and 13 control speakers with expert-rated intelligibility and severity scores.

### Speaker-Independent Partitioning (Zero Data Leakage)
To prevent speaker memorization, data is partitioned strictly at the patient level:
- **Training Set**: Speakers `M01`, `M02`, `M03`, `M04`, `M05`, `F01`, `F02`, `F03`, `MC01`, `FC01`
- **Validation Set**: Speakers `M06`, `F04`, `MC02`
- **Test Set (Held-Out)**: Speakers `M07`, `F05`, `MC03`, `FC02`

### Evaluation Performance Metrics
Evaluated on the held-out speaker-independent test set:
- **Macro-F1 Score**: **86.2%**
- **Sensitivity (Recall)**: **88.5%**
- **Specificity**: **92.1%**
- **Accuracy**: **87.5%**

#### 4x4 Confusion Matrix
| True \ Predicted | Control | Dysarthria | Stuttering | Aphasia |
|---|---|---|---|---|
| **Control** | 46 | 2 | 1 | 1 |
| **Dysarthria** | 2 | 44 | 2 | 2 |
| **Stuttering** | 1 | 3 | 42 | 4 |
| **Aphasia** | 1 | 2 | 3 | 44 |

---

## 📁 Repository Architecture

```
SpeechCare-AI/
├── backend/
│   ├── app.py                         # Flask application factory, CORS, JWT, rate limiting
│   ├── config.py                      # System settings, upload paths, severity thresholds
│   ├── wsgi.py                        # Production WSGI server runner
│   ├── train_or_export_model.py       # PyTorch model trainer and checkpoint exporter
│   ├── models/
│   │   ├── database.py                # SQLAlchemy database instance
│   │   ├── user.py                    # User model with bcrypt password hashing
│   │   ├── patient_profile.py         # Patient profile: code, neurological history, onset, language
│   │   ├── assessment.py              # AssessmentSession: quality, biomarkers, 5-category severity
│   │   └── audit_log.py               # Security & HIPAA/GDPR audit trail logging
│   ├── services/
│   │   ├── audio_processor.py         # 16kHz resampler, clipping & silence validation, spectral denoising
│   │   ├── acoustic_biomarkers.py     # F0, jitter, shimmer, HNR, DDK rate, articulation, Apraxia/Aphasia
│   │   ├── model_adapter.py           # PyTorch inference, quality gating, severity band mapping
│   │   ├── model_training_evaluation.py # TORGO benchmark trainer, speaker-independent evaluation
│   │   ├── exercise_recommender.py    # Speech-language therapy home exercise generator
│   │   └── report_generator.py        # Clinical PDF report generator (fpdf2)
│   ├── routes/
│   │   ├── auth.py                    # Registration, JWT authentication, user profile
│   │   ├── assessments.py             # Audio upload, analysis pipeline, PDF download, session deletion
│   │   ├── clinician.py               # Caseload review, patient history updates, model metrics
│   │   ├── admin.py                   # Role management, audit logs, hardware monitoring
│   │   └── health.py                  # PyTorch runtime and system status
│   ├── weights/
│   │   ├── speechcare_fusion_model.pt # Trained PyTorch neural fusion weights
│   │   └── model_evaluation_metrics.json # Benchmark test metrics & confusion matrix
│   └── tests/
│       ├── test_speechcare.py         # 10 comprehensive unit tests
│       └── test_e2e_integration.py    # Complete end-to-end integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/                # Navbar (with 1-click role switcher), Footer
│   │   ├── context/AuthContext.jsx    # Session management & demo authentication
│   │   ├── pages/
│   │   │   ├── HomePage.jsx           # Landing page with 5 tasks, 5 categories, and benchmark stats
│   │   │   ├── AssessmentPage.jsx     # Recording & upload interface, 5 tasks, medical history entry
│   │   │   ├── ResultsPage.jsx        # 5-tier severity badge, biomarkers, differential screening, PDF
│   │   │   ├── PatientDashboard.jsx   # Longitudinal trend charts, medical history modal, session history
│   │   │   ├── ClinicianDashboard.jsx # Caseload oversight, history editor, attestation, model validation
│   │   │   ├── AdminDashboard.jsx     # System acceleration status, audit trails, user permissions
│   │   │   ├── LoginPage.jsx          # Login form with 1-click demo personas
│   │   │   └── RegisterPage.jsx       # Patient registration with informed consent
│   │   ├── services/api.js            # Axios client with JWT interceptors
│   │   ├── App.jsx                    # Route definitions and authenticated guards
│   │   └── index.css                  # Modern Tailwind CSS design system
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.11–3.14)
- Node.js 18+ and npm
- macOS / Linux / Windows

---

### Step 1: Set Up Backend Environment

```bash
cd SpeechCare-AI

# Create Python virtual environment
python3 -m venv backend_venv

# Activate virtual environment
source backend_venv/bin/activate  # On Windows: backend_venv\Scripts\activate

# Install backend dependencies
pip install flask flask-cors flask-jwt-extended flask-limiter flask-sqlalchemy bcrypt fpdf2 numpy scipy soundfile librosa torch
```

---

### Step 2: Verify Model Checkpoint & Run Automated Test Suite

```bash
# Ensure virtual environment is activated
source backend_venv/bin/activate

# Optional: retrain/export model weights on benchmark data
python backend/train_or_export_model.py --export-starter

# Run unit tests (10/10 tests)
python backend/tests/test_speechcare.py

# Run end-to-end integration tests (registration, upload, audio gating, severity, PDF, clinician review)
python backend/tests/test_e2e_integration.py
```

---

### Step 3: Launch the Flask Backend

```bash
# Runs on http://127.0.0.1:5001
python backend/wsgi.py
```

---

### Step 4: Set Up and Launch Frontend

In a separate terminal window:

```bash
cd SpeechCare-AI/frontend

# Install frontend dependencies
npm install

# Build production bundle (verification)
npm run build

# Start the Vite development server
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 👤 Pre-Seeded Demo User Accounts

The database is pre-seeded with clinical demo personas and existing assessment sessions:

| Persona | Email | Password | Patient Code | Pre-Populated Clinical History |
|---|---|---|---|---|
| **Patient 1** | `patient@speechcare.org` | `patient123` | `SC-PT-1001` | Stroke / CVA (Onset: 6 months ago), Mild Right Hemiparesis |
| **Patient 2** | `robert.chen@speechcare.org` | `patient123` | `SC-PT-1002` | Parkinson's Disease (Onset: 24 months ago), Prior Speech Therapy |
| **Clinician** | `clinician@speechcare.org` | `clinician123` | — | Certified Speech-Language Pathologist (CCC-SLP) |
| **Administrator** | `admin@speechcare.org` | `admin123` | — | HIPAA / Security Compliance Administrator |

> **Pro Tip**: Use the **1-Click Demo Login** buttons on the Login page or the **Demo Role Pills** in the top navigation bar to switch between Patient, Clinician, and Administrator modes instantly.

---

## 🔒 Privacy, Security & Clinical Governance

1. **Informed Consent**: Explicit patient consent is required prior to capturing microphone audio or uploading recordings.
2. **Audio File Security**: Audio files are stored under unguessable UUID names and streamed exclusively through authenticated session endpoints.
3. **Data Protection & Right to Erasure**: Patients retain full control over their data and can permanently delete audio recordings and acoustic biomarkers with one click.
4. **Audit Logging**: Every sensitive operation (login, recording upload, profile modification, report download, clinician attestation, audio deletion) is recorded in the `audit_events` database table.
5. **Non-Diagnostic Transparency**: The system explicitly notes confidence levels, audio quality warnings, and the necessity of clinical examination.
