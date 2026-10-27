from datetime import datetime
import json
from .database import db

class PatientProfile(db.Model):
    __tablename__ = "patient_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    clinician_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Clinical and Unique Patient Identifier
    patient_code = db.Column(db.String(30), unique=True, index=True, nullable=True)  # e.g., "SC-PT-1001"
    
    # Demographics
    age = db.Column(db.Integer, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    preferred_language = db.Column(db.String(50), default="English", nullable=True)
    dialect = db.Column(db.String(50), nullable=True)
    
    # Clinical & Neurological History
    neurological_conditions = db.Column(db.Text, nullable=True)  # JSON list e.g. ["Stroke", "Parkinson's Disease"]
    symptom_onset = db.Column(db.String(50), nullable=True)       # "Sudden (<24h)", "Subacute (1-4 weeks)", "Gradual / Insidious (>6 months)"
    symptom_duration_months = db.Column(db.Integer, nullable=True)
    previous_assessments = db.Column(db.Text, nullable=True)     # e.g. "Frenchay Dysarthria Assessment-2 (FDA-2) in 2024"
    treatment_history = db.Column(db.Text, nullable=True)        # e.g. "LSVT LOUD, Levodopa therapy"
    communication_needs = db.Column(db.Text, nullable=True)      # e.g. "Hearing aid in left ear, vocal fatigue after prolonged conversation"
    medical_notes = db.Column(db.Text, nullable=True)
    
    # Consent and Audit
    consent_given = db.Column(db.Boolean, default=False, nullable=False)
    consent_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to user
    user = db.relationship("User", foreign_keys=[user_id], backref=db.backref("patient_profile", uselist=False))
    clinician = db.relationship("User", foreign_keys=[clinician_id])

    def get_neurological_conditions_list(self):
        if not self.neurological_conditions:
            return []
        try:
            val = json.loads(self.neurological_conditions)
            if isinstance(val, list):
                return val
            return [str(val)]
        except Exception:
            return [c.strip() for c in self.neurological_conditions.split(",") if c.strip()]

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "clinician_id": self.clinician_id,
            "patient_code": self.patient_code or f"SC-PT-{self.user_id:04d}",
            "age": self.age,
            "gender": self.gender,
            "preferred_language": self.preferred_language or "English",
            "dialect": self.dialect or "Standard General American",
            "neurological_conditions": self.get_neurological_conditions_list(),
            "symptom_onset": self.symptom_onset or "Not specified",
            "symptom_duration_months": self.symptom_duration_months,
            "previous_assessments": self.previous_assessments or "None recorded",
            "treatment_history": self.treatment_history or "None recorded",
            "communication_needs": self.communication_needs or "None noted",
            "medical_notes": self.medical_notes or "",
            "consent_given": self.consent_given,
            "consent_date": self.consent_date.isoformat() if self.consent_date else None,
            "user_name": self.user.full_name if self.user else None,
            "user_email": self.user.email if self.user else None,
            "clinician_name": self.clinician.full_name if self.clinician else None
        }
