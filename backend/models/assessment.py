from datetime import datetime
import json
from .database import db

class AssessmentSession(db.Model):
    __tablename__ = "assessment_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_type = db.Column(db.String(50), nullable=False, default="reading_passage")  
    # 'sustained_vowel', 'syllable_repetition', 'sequence_repetition', 'reading_passage', 'spontaneous_speech'
    
    # Audio metadata & Quality Validation
    audio_filename = db.Column(db.String(255), nullable=False)
    enhanced_audio_filename = db.Column(db.String(255), nullable=True)
    audio_duration = db.Column(db.Float, nullable=False, default=0.0)
    speech_duration_sec = db.Column(db.Float, nullable=True, default=0.0)
    sample_rate = db.Column(db.Integer, nullable=False, default=16000)
    file_size_bytes = db.Column(db.Integer, nullable=False, default=0)
    
    # Audio Quality Checks
    audio_quality_status = db.Column(db.String(30), nullable=True, default="good") # 'good', 'acceptable', 'poor', 'insufficient'
    audio_snr_db = db.Column(db.Float, nullable=True)
    is_clipped = db.Column(db.Boolean, default=False)
    silence_percentage = db.Column(db.Float, nullable=True)
    quality_warnings_json = db.Column(db.Text, nullable=True)
    
    # Dysarthria Severity & Classification AI outputs
    predicted_class = db.Column(db.String(50), nullable=True)  # 'control', 'dysarthria', 'stuttering', 'aphasia'
    class_probabilities_json = db.Column(db.Text, nullable=True)
    confidence = db.Column(db.Float, nullable=False, default=0.0)
    is_abstained = db.Column(db.Boolean, default=False)
    severity_score = db.Column(db.Float, nullable=True)
    severity_band = db.Column(db.String(20), nullable=True)  # 'Mild', 'Moderate', 'Marked', 'Severe'
    
    # Standardized 5-Category Dysarthria Severity
    # 'No clear dysarthric indicators detected', 'Mild dysarthria', 'Moderate dysarthria', 'Severe dysarthria', 'Unable to determine due to insufficient or poor-quality audio'
    dysarthria_severity_category = db.Column(db.String(80), nullable=True)
    contributing_features_json = db.Column(db.Text, nullable=True)
    
    # Acoustic biomarkers & voice analysis
    detected_gender = db.Column(db.String(20), nullable=True)  # 'Male', 'Female', 'Undetermined'
    gender_confidence = db.Column(db.Float, nullable=True)
    f0_mean = db.Column(db.Float, nullable=True)
    f0_std = db.Column(db.Float, nullable=True)
    jitter_percent = db.Column(db.Float, nullable=True)
    shimmer_percent = db.Column(db.Float, nullable=True)
    hnr_db = db.Column(db.Float, nullable=True)
    silence_ratio = db.Column(db.Float, nullable=True)
    speech_rate_wpm = db.Column(db.Float, nullable=True)
    syllables_per_sec = db.Column(db.Float, nullable=True)
    intelligibility_index = db.Column(db.Float, nullable=True)
    articulation_score = db.Column(db.Float, nullable=True)

    # Detailed Clinical Evaluations & Patient History Integration
    patient_history_json = db.Column(db.Text, nullable=True)
    historical_factors_considered_json = db.Column(db.Text, nullable=True)
    missing_history_info_json = db.Column(db.Text, nullable=True)
    dysarthria_assessment_json = db.Column(db.Text, nullable=True)
    differential_screening_json = db.Column(db.Text, nullable=True)
    previous_comparison_json = db.Column(db.Text, nullable=True)

    # Explainability & Recommendations
    explanation_json = db.Column(db.Text, nullable=True)
    summary_text = db.Column(db.Text, nullable=True)
    suggested_exercises_json = db.Column(db.Text, nullable=True)
    
    # Clinician review & feedback
    clinician_notes = db.Column(db.Text, nullable=True)
    clinician_approved = db.Column(db.Boolean, default=False)
    clinician_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    # Status and audit
    is_demo_simulated = db.Column(db.Boolean, default=False)
    model_version = db.Column(db.String(50), default="v1.0.0-fusion")
    consent_recorded = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationship to reviewing clinician
    reviewer = db.relationship("User", foreign_keys=[clinician_id])

    def to_dict(self):
        def parse_json_safely(raw, default):
            if not raw:
                return default
            try:
                return json.loads(raw)
            except Exception:
                return default

        probabilities = parse_json_safely(self.class_probabilities_json, {})
        explanations = parse_json_safely(self.explanation_json, {})
        exercises = parse_json_safely(self.suggested_exercises_json, [])
        patient_history = parse_json_safely(self.patient_history_json, {})
        historical_factors = parse_json_safely(self.historical_factors_considered_json, [])
        missing_history = parse_json_safely(self.missing_history_info_json, [])
        dysarthria_assessment = parse_json_safely(self.dysarthria_assessment_json, {})
        differential_screening = parse_json_safely(self.differential_screening_json, {})
        contributing_features = parse_json_safely(self.contributing_features_json, [])
        previous_comparison = parse_json_safely(self.previous_comparison_json, None)
        quality_warnings = parse_json_safely(self.quality_warnings_json, [])

        # Patient code fallback
        p_code = None
        if self.user and self.user.patient_profile and self.user.patient_profile.patient_code:
            p_code = self.user.patient_profile.patient_code
        else:
            p_code = f"SC-PT-{self.user_id:04d}"

        return {
            "id": self.id,
            "user_id": self.user_id,
            "patient_code": p_code,
            "user_name": self.user.full_name if self.user else None,
            "user_email": self.user.email if self.user else None,
            "task_type": self.task_type,
            "audio_filename": self.audio_filename,
            "enhanced_audio_filename": self.enhanced_audio_filename,
            "has_enhanced_audio": bool(self.enhanced_audio_filename),
            "audio_duration": round(self.audio_duration, 2),
            "speech_duration_sec": round(self.speech_duration_sec or self.audio_duration, 2),
            "sample_rate": self.sample_rate,
            "file_size_bytes": self.file_size_bytes,
            
            # Audio Quality
            "audio_quality": {
                "status": self.audio_quality_status or "good",
                "snr_db": round(self.audio_snr_db, 1) if self.audio_snr_db is not None else None,
                "is_clipped": self.is_clipped,
                "silence_percentage": round(self.silence_percentage, 1) if self.silence_percentage is not None else None,
                "warnings": quality_warnings
            },
            
            # Dysarthria Assessment
            "dysarthria_severity_category": self.dysarthria_severity_category or (
                "Unable to determine due to insufficient or poor-quality audio" if self.audio_quality_status == "poor" else "No clear dysarthric indicators detected"
            ),
            "contributing_features": contributing_features,
            
            # Legacy & Neural Head Classification
            "predicted_class": self.predicted_class,
            "class_probabilities": probabilities,
            "confidence": round(self.confidence * 100, 1),
            "is_abstained": self.is_abstained,
            "severity_score": round(self.severity_score, 1) if self.severity_score is not None else None,
            "severity_band": self.severity_band,
            
            # Speaker characteristics
            "detected_gender": self.detected_gender,
            "gender_confidence": round(self.gender_confidence * 100, 1) if self.gender_confidence is not None else None,
            "acoustic_biomarkers": {
                "f0_mean_hz": round(self.f0_mean, 1) if self.f0_mean is not None else None,
                "f0_std_hz": round(self.f0_std, 1) if self.f0_std is not None else None,
                "jitter_percent": round(self.jitter_percent, 2) if self.jitter_percent is not None else None,
                "shimmer_percent": round(self.shimmer_percent, 2) if self.shimmer_percent is not None else None,
                "hnr_db": round(self.hnr_db, 1) if self.hnr_db is not None else None,
                "silence_ratio": round(self.silence_ratio, 2) if self.silence_ratio is not None else None,
                "speech_rate_wpm": round(self.speech_rate_wpm, 1) if self.speech_rate_wpm is not None else None,
                "syllables_per_sec": round(self.syllables_per_sec, 2) if self.syllables_per_sec is not None else None,
                "intelligibility_index": round(self.intelligibility_index, 1) if self.intelligibility_index is not None else None,
                "articulation_score": round(self.articulation_score, 1) if self.articulation_score is not None else None,
            },
            
            # Clinical Modules
            "patient_history": patient_history,
            "historical_factors_considered": historical_factors,
            "missing_history_info": missing_history,
            "dysarthria_assessment": dysarthria_assessment,
            "differential_screening": differential_screening,
            "previous_comparison": previous_comparison,
            "explanation": explanations,
            "summary_text": self.summary_text,
            "suggested_exercises": exercises,
            
            # Clinician Review
            "clinician_notes": self.clinician_notes,
            "clinician_approved": self.clinician_approved,
            "clinician_id": self.clinician_id,
            "reviewer_name": self.reviewer.full_name if self.reviewer else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "is_demo_simulated": self.is_demo_simulated,
            "model_version": self.model_version,
            "consent_recorded": self.consent_recorded,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
