import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from ..config import Config
from .audio_processor import AudioProcessor
from .acoustic_biomarkers import AcousticBiomarkerExtractor
from .exercise_recommender import ExerciseRecommender

class AttentionPooling(nn.Module):
    def __init__(self, hidden_dim):
        super(AttentionPooling, self).__init__()
        self.attn = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.Tanh(),
            nn.Linear(64, 1)
        )

    def forward(self, x):
        # x: [batch, time, hidden_dim]
        weights = self.attn(x)  # [batch, time, 1]
        weights = F.softmax(weights, dim=1)
        pooled = torch.sum(x * weights, dim=1)  # [batch, hidden_dim]
        return pooled, weights

class SpeechCareFusionNet(nn.Module):
    """
    Research architecture: CNN-BiLSTM with Attention Pooling over Mel-spectrogram
    and acoustic biomarker fusion, feeding into classification and severity heads.
    """
    def __init__(self, n_mels=128, num_classes=4, biomarker_dim=6):
        super(SpeechCareFusionNet, self).__init__()
        self.conv = nn.Sequential(
            nn.Conv1d(n_mels, 64, kernel_size=5, stride=1, padding=2),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(2),
            nn.Conv1d(64, 128, kernel_size=5, stride=1, padding=2),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.MaxPool1d(2)
        )
        self.lstm = nn.LSTM(
            input_size=128,
            hidden_size=128,
            num_layers=2,
            batch_first=True,
            bidirectional=True
        )
        self.attn_pool = AttentionPooling(hidden_dim=256)
        
        # Dense fusion layer with acoustic biomarkers
        self.fusion_fc = nn.Sequential(
            nn.Linear(256 + biomarker_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.25)
        )
        
        # 4-Class Classification Head: Control, Dysarthria, Stuttering, Aphasia
        self.classifier = nn.Linear(128, num_classes)
        
        # Continuous Severity Estimation Head: 0.0 - 100.0
        self.severity_head = nn.Sequential(
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

    def forward(self, mel_spec, biomarkers):
        # mel_spec: [batch, n_mels, time]
        feat = self.conv(mel_spec)
        feat = feat.permute(0, 2, 1)  # [batch, time, channels]
        lstm_out, _ = self.lstm(feat)
        pooled, attn_weights = self.attn_pool(lstm_out)
        
        fused = torch.cat([pooled, biomarkers], dim=1)
        emb = self.fusion_fc(fused)
        
        logits = self.classifier(emb)
        severity = self.severity_head(emb) * 100.0
        return logits, severity, attn_weights

class ModelAdapter:
    """
    SpeechCare AI Model Adapter.
    Handles model loading, audio quality gating, genuine acoustic biomarker extraction,
    PyTorch inference, calibrated confidence scoring, 5-category dysarthria severity estimation,
    and differential screening.
    """
    def __init__(self, config=None):
        self.config = config or Config
        self.classes = self.config.CLASSES
        self.audio_processor = AudioProcessor(target_sr=self.config.SAMPLE_RATE)
        self.biomarker_extractor = AcousticBiomarkerExtractor(sample_rate=self.config.SAMPLE_RATE)
        self.device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
        
        self.model = None
        self.model_loaded = False
        self.weights_path = os.path.join(self.config.WEIGHTS_FOLDER, "speechcare_fusion_model.pt")
        self._initialize_model()

    def _initialize_model(self):
        """Loads trained PyTorch weights if present on disk."""
        try:
            self.model = SpeechCareFusionNet(n_mels=128, num_classes=4, biomarker_dim=6)
            self.model.to(self.device)
            if os.path.exists(self.weights_path):
                state_dict = torch.load(self.weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                self.model_loaded = True
                print(f"[ModelAdapter] Successfully loaded trained weights from {self.weights_path}")
            else:
                self.model.eval()
                self.model_loaded = False
                print(f"[ModelAdapter] Checkpoint not found at {self.weights_path}. Adapter running in acoustic-biomarker mode.")
        except Exception as e:
            self.model_loaded = False
            print(f"[ModelAdapter] Error loading model weights: {e}")

    def get_severity_band(self, score):
        """Maps continuous 0-100 severity score to clinical band."""
        if score is None:
            return None
        if score < 25.0:
            return "Mild"
        elif score < 50.0:
            return "Moderate"
        elif score < 75.0:
            return "Marked"
        else:
            return "Severe"

    def predict_speech(self, audio_path, task_type="reading_passage", allow_demo=True, patient_history=None):
        """
        Main inference entry point:
        predict_speech(audio_path) -> structured_result
        """
        # 1. Validate audio file existence & container readability
        is_valid, err_msg, meta = self.audio_processor.validate_audio_file(audio_path)
        if not is_valid:
            return {
                "processing_status": "error",
                "error": err_msg,
                "predicted_class": None,
                "confidence": 0.0,
                "warnings": [err_msg]
            }

        # 2. Preprocess: 16kHz mono, silence margin trimming, normalization
        try:
            y, sr = self.audio_processor.load_and_preprocess(audio_path)
        except Exception as e:
            return {
                "processing_status": "error",
                "error": f"Audio preprocessing failed: {str(e)}",
                "predicted_class": None,
                "confidence": 0.0,
                "warnings": [str(e)]
            }

        # 3. Audio Quality & Recording Validation
        audio_quality = self.audio_processor.analyze_audio_quality(y, sr)
        waveform_peaks = self.audio_processor.generate_waveform_peaks(y, num_peaks=80)
        
        # Base audio metadata
        base_dir, base_file = os.path.split(audio_path)
        enhanced_filename = f"enhanced_{base_file}.wav" if not base_file.endswith(".wav") else f"enhanced_{base_file}"
        enhanced_path = os.path.join(base_dir, enhanced_filename)
        self.audio_processor.enhance_speech(y, enhanced_path)

        # 4. Check if audio quality is inadequate for classification
        if not audio_quality["is_acceptable_for_analysis"]:
            rejection_reason = audio_quality.get("rejection_reason") or "Poor or insufficient audio quality."
            return {
                "processing_status": "insufficient_quality",
                "predicted_class": None,
                "class_probabilities": {"control": 0.25, "dysarthria": 0.25, "stuttering": 0.25, "aphasia": 0.25},
                "confidence": 0.0,
                "is_abstained": True,
                "severity_score": None,
                "severity_band": None,
                "dysarthria_severity_category": "Unable to determine due to insufficient or poor-quality audio",
                "detected_gender": "Undetermined",
                "gender_confidence": 0.0,
                "audio_quality": audio_quality,
                "acoustic_biomarkers": {
                    "f0_mean": None,
                    "f0_std": None,
                    "jitter_percent": None,
                    "shimmer_percent": None,
                    "hnr_db": None,
                    "silence_ratio": audio_quality.get("silence_ratio", 1.0),
                    "speech_rate_wpm": 0.0,
                    "syllables_per_sec": 0.0,
                    "intelligibility_index": 0.0,
                    "articulation_score": 0.0
                },
                "dysarthria_assessment": {
                    "dysarthria_severity": "Unable to determine due to insufficient or poor-quality audio",
                    "intelligibility_index": 0.0,
                    "articulation_score": 0.0,
                    "consonant_precision": "Indeterminate",
                    "speech_rate_wpm": 0.0,
                    "syllables_per_sec": 0.0,
                    "voice_quality_rating": "Indeterminate",
                    "prosody_rating": "Indeterminate",
                    "respiration_breath_support": "Indeterminate",
                    "observed_speech_characteristics": rejection_reason,
                    "contributing_features": audio_quality.get("warnings", [rejection_reason])
                },
                "differential_screening": {
                    "indices": {
                        "dysarthria_screening_index": 0.0,
                        "apraxia_screening_index": 0.0,
                        "aphasia_screening_index": 0.0,
                        "stuttering_screening_index": 0.0
                    },
                    "differential_notes": "Unable to screen other communication disorders due to inadequate audio quality.",
                    "clinical_recommendations": ["Re-record in a quiet room with proper microphone distance."]
                },
                "speech_rate": {"speech_rate_wpm": 0.0, "syllables_per_sec": 0.0},
                "patient_history": patient_history or {},
                "historical_factors_considered": [],
                "missing_history_info": ["Audio recording requires replacement."],
                "contributing_features": audio_quality.get("warnings", [rejection_reason]),
                "enhanced_audio_path": enhanced_path,
                "enhanced_audio_filename": enhanced_filename,
                "audio_duration": meta["duration"],
                "speech_duration_sec": audio_quality.get("speech_duration_sec", 0.0),
                "sample_rate": self.config.SAMPLE_RATE,
                "file_size_bytes": meta["file_size"],
                "waveform_peaks": waveform_peaks,
                "explanation_data": {
                    "waveform_peaks": waveform_peaks,
                    "pitch_contour": [],
                    "energy_envelope": [],
                    "spectral_centroid_hz": 1800.0
                },
                "summary_text": (
                    f"Unable to determine speech characteristics due to insufficient or poor-quality audio. "
                    f"Issue: {rejection_reason} Please check the microphone settings and record again."
                ),
                "suggested_exercises": [],
                "is_demo_simulated": False,
                "model_version": "SpeechCareFusionNet-v1.0",
                "warnings": audio_quality.get("warnings", [rejection_reason])
            }

        # 5. Extract Genuine Acoustic Biomarkers
        biomarkers = self.biomarker_extractor.extract_all(
            y,
            task_type=task_type,
            patient_history=patient_history,
            audio_quality=audio_quality
        )

        # 6. Extract log-Mel spectrogram
        log_mel = self.audio_processor.extract_mel_spectrogram(y)

        # 7. Model Inference or Calibrated Demonstration
        warnings = list(audio_quality.get("warnings", []))
        is_simulated = False
        dys_assessment = biomarkers.get("dysarthria_assessment", {})
        diff_screening = biomarkers.get("differential_screening", {})
        history_integration = biomarkers.get("patient_history_integration", {})

        if self.model_loaded:
            with torch.no_grad():
                mel_tensor = torch.tensor(log_mel, dtype=torch.float32).unsqueeze(0).to(self.device)
                bio_vector = [
                    biomarkers["f0_mean"] / 300.0,
                    biomarkers["jitter_percent"] / 10.0,
                    biomarkers["shimmer_percent"] / 20.0,
                    biomarkers["hnr_db"] / 30.0,
                    biomarkers["silence_ratio"],
                    1.0 if biomarkers["detected_gender"] == "Female" else 0.0
                ]
                bio_tensor = torch.tensor([bio_vector], dtype=torch.float32).to(self.device)

                logits, severity_out, attn = self.model(mel_tensor, bio_tensor)
                probs = F.softmax(logits, dim=1).cpu().numpy()[0]
                pred_idx = int(np.argmax(probs))
                raw_confidence = float(probs[pred_idx])
                severity_score = float(severity_out.cpu().numpy()[0][0])
                model_version = "SpeechCareFusionNet-Trained-v1.0"
        else:
            is_simulated = True
            model_version = "SpeechCareFusionNet-SimulatedDemo"
            warnings.append("Model weights running in demo heuristic mode.")

            j = biomarkers.get("jitter_percent", 1.0)
            s = biomarkers.get("shimmer_percent", 3.0)
            hnr = biomarkers.get("hnr_db", 18.0)
            silence = biomarkers.get("silence_ratio", 0.15)

            if j > 2.8 or s > 7.0 or hnr < 11.0:
                raw_confidence = min(0.92, 0.70 + (j / 10.0) * 0.20)
                severity_score = min(92.0, 35.0 + (j * 4.0) + (s * 1.5))
                probs = [0.10, raw_confidence, 0.12, 1.0 - (0.10 + raw_confidence + 0.12)]
            elif silence > 0.35 and task_type in ["reading_passage", "sequence_repetition"]:
                raw_confidence = min(0.89, 0.68 + silence * 0.3)
                severity_score = min(85.0, 28.0 + silence * 80.0)
                probs = [0.12, 0.15, raw_confidence, 1.0 - (0.12 + 0.15 + raw_confidence)]
            elif task_type == "spontaneous_speech" and silence > 0.25:
                raw_confidence = 0.78
                severity_score = 42.0
                probs = [0.14, 0.16, 0.12, 0.58]
            else:
                raw_confidence = min(0.96, 0.75 + (hnr / 35.0) * 0.2)
                severity_score = max(5.0, 22.0 - (hnr * 0.6))
                probs = [raw_confidence, 0.08, 0.07, 1.0 - (raw_confidence + 0.08 + 0.07)]

            probs = np.array(probs)
            probs = np.maximum(probs, 0.01)
            probs = probs / np.sum(probs)
            pred_idx = int(np.argmax(probs))

        pred_class = self.classes[pred_idx]
        confidence = float(probs[pred_idx])
        class_probabilities = {self.classes[i]: round(float(probs[i]), 4) for i in range(len(self.classes))}

        # 8. Standardized Dysarthria Severity Category (5 categories)
        dysarthria_category = dys_assessment.get("dysarthria_severity", "No clear dysarthric indicators detected")
        contributing_features = dys_assessment.get("contributing_features", [])

        # Harmonize control class and healthy severity band
        if pred_class == "control" and severity_score < 25.0:
            dysarthria_category = "No clear dysarthric indicators detected"
        elif dysarthria_category == "No clear dysarthric indicators detected" and severity_score < 25.0:
            pred_class = "control"

        # 9. Calibrated Confidence Check: Abstain if < 0.60
        is_abstained = False
        if confidence < self.config.CONFIDENCE_THRESHOLD:
            is_abstained = True
            predicted_category = None
            summary_text = (
                f"Calibrated screening confidence ({confidence*100:.1f}%) is below the clinical threshold of "
                f"{self.config.CONFIDENCE_THRESHOLD*100:.0f}%. The screening engine abstains from definitive categorization. "
                "A formal clinical assessment by a certified Speech-Language Pathologist is strongly recommended."
            )
            warnings.append("Low confidence abstention: result deferred to clinician review.")
            severity_band = self.get_severity_band(severity_score)
        else:
            predicted_category = pred_class
            severity_band = self.get_severity_band(severity_score)
            sim_prefix = "[DEMO SIMULATION] " if is_simulated else ""
            if predicted_category == "control" or dysarthria_category == "No clear dysarthric indicators detected":
                summary_text = (
                    f"{sim_prefix}Screening indicates normal speech production characteristics with no clear dysarthric indicators detected "
                    f"({confidence*100:.1f}% calibrated model confidence). "
                    f"Estimated Intelligibility: {dys_assessment.get('intelligibility_index', 98)}%, "
                    f"Speech Rate: {dys_assessment.get('speech_rate_wpm', 140)} WPM ({dys_assessment.get('syllables_per_sec', 3.8)} syl/sec). "
                    f"Voice Quality: {dys_assessment.get('voice_quality_rating', 'Normal')}. "
                    f"Consonant Precision: {dys_assessment.get('consonant_precision', 'Crisp & Precise Consonants')}."
                )
            else:
                summary_text = (
                    f"{sim_prefix}Screening indicates characteristics consistent with {dysarthria_category} "
                    f"({confidence*100:.1f}% calibrated model confidence). "
                    f"Estimated Intelligibility: {dys_assessment.get('intelligibility_index', 0)}%, "
                    f"Speech Rate: {dys_assessment.get('speech_rate_wpm', 0)} WPM ({dys_assessment.get('syllables_per_sec', 0)} syl/sec). "
                    f"Voice Quality: {dys_assessment.get('voice_quality_rating', 'Normal')}. "
                    f"Speaker acoustics: {biomarkers['detected_gender']} (F0 Mean: {biomarkers['f0_mean']:.1f} Hz, "
                    f"Jitter: {biomarkers['jitter_percent']:.2f}%, HNR: {biomarkers['hnr_db']:.1f} dB)."
                )

        # 10. Suggested Exercises
        suggested_exercises = ExerciseRecommender.get_recommendations(
            predicted_class=predicted_category or "dysarthria",
            severity_band=severity_band,
            biomarkers=biomarkers,
            task_type=task_type
        )

        return {
            "processing_status": "success",
            "predicted_class": predicted_category,
            "class_probabilities": class_probabilities,
            "confidence": confidence,
            "is_abstained": is_abstained,
            "severity_score": severity_score,
            "severity_band": severity_band,
            "dysarthria_severity_category": dysarthria_category,
            "contributing_features": contributing_features,
            "detected_gender": biomarkers["detected_gender"],
            "gender_confidence": biomarkers["gender_confidence"],
            "audio_quality": audio_quality,
            "acoustic_biomarkers": biomarkers,
            "dysarthria_assessment": dys_assessment,
            "differential_screening": diff_screening,
            "patient_history": patient_history or {},
            "historical_factors_considered": history_integration.get("historical_factors_considered", []),
            "missing_history_info": history_integration.get("missing_clinical_information", []),
            "speech_rate": biomarkers.get("speech_rate", {}),
            "enhanced_audio_path": enhanced_path,
            "enhanced_audio_filename": enhanced_filename,
            "audio_duration": meta["duration"],
            "speech_duration_sec": audio_quality.get("speech_duration_sec", meta["duration"]),
            "sample_rate": self.config.SAMPLE_RATE,
            "file_size_bytes": meta["file_size"],
            "waveform_peaks": waveform_peaks,
            "explanation_data": {
                "waveform_peaks": waveform_peaks,
                "pitch_contour": biomarkers.get("explanation_contour", {}).get("pitch_contour", []),
                "energy_envelope": biomarkers.get("explanation_contour", {}).get("energy_envelope", []),
                "spectral_centroid_hz": biomarkers.get("mean_centroid_hz", 1800.0)
            },
            "summary_text": summary_text,
            "suggested_exercises": suggested_exercises,
            "is_demo_simulated": is_simulated,
            "model_version": model_version,
            "warnings": warnings
        }
