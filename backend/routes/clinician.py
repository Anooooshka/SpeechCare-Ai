import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, User, PatientProfile, AssessmentSession, AuditEvent
from ..services.model_training_evaluation import ModelTrainingAndEvaluator

clinician_bp = Blueprint("clinician", __name__, url_prefix="/api")

@clinician_bp.route("/clinician/patients", methods=["GET"])
@jwt_required()
def list_patients():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user.role not in ["clinician", "admin"]:
        return jsonify({"error": "Unauthorized. Clinician or Admin privileges required."}), 403

    # Query patients
    patients = User.query.filter_by(role="patient").all()
    patient_list = []
    for p in patients:
        profile = p.patient_profile
        last_assessment = AssessmentSession.query.filter_by(user_id=p.id).order_by(AssessmentSession.created_at.desc()).first()
        assessment_count = AssessmentSession.query.filter_by(user_id=p.id).count()

        patient_list.append({
            "id": p.id,
            "patient_code": profile.patient_code if profile else f"SC-PT-{p.id:04d}",
            "full_name": p.full_name,
            "email": p.email,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "age": profile.age if profile else None,
            "gender": profile.gender if profile else None,
            "preferred_language": profile.preferred_language if profile else "English",
            "dialect": profile.dialect if profile else "Standard General American",
            "neurological_conditions": profile.get_neurological_conditions_list() if profile else [],
            "symptom_onset": profile.symptom_onset if profile else "Not specified",
            "symptom_duration_months": profile.symptom_duration_months if profile else None,
            "previous_assessments": profile.previous_assessments if profile else "None recorded",
            "treatment_history": profile.treatment_history if profile else "None recorded",
            "communication_needs": profile.communication_needs if profile else "None noted",
            "medical_notes": profile.medical_notes if profile else "",
            "consent_given": profile.consent_given if profile else False,
            "assigned_clinician_id": profile.clinician_id if profile else None,
            "assessment_count": assessment_count,
            "latest_assessment": last_assessment.to_dict() if last_assessment else None
        })

    return jsonify({"patients": patient_list}), 200

@clinician_bp.route("/patients/<int:patient_id>/profile", methods=["GET"])
@jwt_required()
def get_patient_profile(patient_id):
    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)

    # Permission check: patient themselves, or clinician/admin
    if current_user.role == "patient" and current_user.id != patient_id:
        return jsonify({"error": "Unauthorized access to patient profile."}), 403

    target_user = db.session.get(User, patient_id)
    if not target_user:
        return jsonify({"error": "Patient user record not found."}), 404

    profile = target_user.patient_profile
    if not profile:
        profile = PatientProfile(user_id=target_user.id, patient_code=f"SC-PT-{target_user.id:04d}")
        db.session.add(profile)
        db.session.commit()

    return jsonify({"profile": profile.to_dict()}), 200

@clinician_bp.route("/patients/<int:patient_id>/profile", methods=["PUT", "PATCH"])
@jwt_required()
def update_patient_profile(patient_id):
    user_id = int(get_jwt_identity())
    current_user = db.session.get(User, user_id)

    # Permission check: patient themselves or clinician/admin
    if current_user.role == "patient" and current_user.id != patient_id:
        return jsonify({"error": "Unauthorized to modify this patient profile."}), 403

    target_user = db.session.get(User, patient_id)
    if not target_user:
        return jsonify({"error": "Patient user record not found."}), 404

    profile = target_user.patient_profile
    if not profile:
        profile = PatientProfile(user_id=target_user.id, patient_code=f"SC-PT-{target_user.id:04d}")
        db.session.add(profile)

    data = request.get_json() or {}

    if "age" in data:
        profile.age = int(data["age"]) if data["age"] is not None and str(data["age"]).isdigit() else None
    if "gender" in data:
        profile.gender = data["gender"]
    if "preferred_language" in data:
        profile.preferred_language = data["preferred_language"]
    if "dialect" in data:
        profile.dialect = data["dialect"]
    if "neurological_conditions" in data:
        val = data["neurological_conditions"]
        profile.neurological_conditions = json.dumps(val) if isinstance(val, list) else str(val)
    if "symptom_onset" in data:
        profile.symptom_onset = data["symptom_onset"]
    if "symptom_duration_months" in data:
        profile.symptom_duration_months = int(data["symptom_duration_months"]) if str(data["symptom_duration_months"]).isdigit() else None
    if "previous_assessments" in data:
        profile.previous_assessments = data["previous_assessments"]
    if "treatment_history" in data:
        profile.treatment_history = data["treatment_history"]
    if "communication_needs" in data:
        profile.communication_needs = data["communication_needs"]
    if "medical_notes" in data:
        profile.medical_notes = data["medical_notes"]
    if "consent_given" in data:
        profile.consent_given = bool(data["consent_given"])

    audit = AuditEvent(
        user_id=current_user.id,
        action="PATIENT_PROFILE_UPDATED",
        resource_type="PATIENT_PROFILE",
        resource_id=str(profile.id),
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Updated profile for patient {target_user.id} by {current_user.role}"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Patient clinical profile updated successfully.",
        "profile": profile.to_dict()
    }), 200

@clinician_bp.route("/patients/<int:patient_id>/progress", methods=["GET"])
@jwt_required()
def get_patient_progress(patient_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    
    # Permission check: patient themselves or clinician/admin
    if user.role == "patient" and user.id != patient_id:
        return jsonify({"error": "Unauthorized access to patient progress data."}), 403

    patient = db.session.get(User, patient_id)
    if not patient:
        return jsonify({"error": "Patient not found."}), 404

    sessions = AssessmentSession.query.filter_by(user_id=patient.id).order_by(AssessmentSession.created_at.asc()).all()

    progress_timeline = []
    for s in sessions:
        progress_timeline.append({
            "session_id": s.id,
            "date": s.created_at.strftime("%b %d, %Y") if s.created_at else "",
            "timestamp": s.created_at.isoformat() if s.created_at else "",
            "task_type": s.task_type,
            "predicted_class": s.predicted_class,
            "dysarthria_severity_category": s.dysarthria_severity_category,
            "severity_score": round(s.severity_score, 1) if s.severity_score is not None else None,
            "severity_band": s.severity_band,
            "confidence": round(s.confidence * 100, 1),
            "intelligibility_index": round(s.intelligibility_index, 1) if s.intelligibility_index is not None else None,
            "articulation_score": round(s.articulation_score, 1) if s.articulation_score is not None else None,
            "speech_rate_wpm": round(s.speech_rate_wpm, 1) if s.speech_rate_wpm is not None else None,
            "f0_mean": round(s.f0_mean, 1) if s.f0_mean is not None else None,
            "jitter": round(s.jitter_percent, 2) if s.jitter_percent is not None else None,
            "shimmer": round(s.shimmer_percent, 2) if s.shimmer_percent is not None else None,
            "hnr": round(s.hnr_db, 1) if s.hnr_db is not None else None,
            "clinician_approved": s.clinician_approved
        })

    profile = patient.patient_profile
    return jsonify({
        "patient_id": patient.id,
        "patient_code": profile.patient_code if profile else f"SC-PT-{patient.id:04d}",
        "patient_name": patient.full_name,
        "profile": profile.to_dict() if profile else None,
        "total_sessions": len(sessions),
        "timeline": progress_timeline,
        "longitudinal_disclaimer": "Measurement changes across sessions reflect acoustic variability and do not constitute proof of clinical recovery or decline."
    }), 200

@clinician_bp.route("/model/evaluation", methods=["GET"])
def get_model_evaluation():
    """Returns benchmark dataset metadata, patient-independent splits, and evaluation metrics."""
    metrics = ModelTrainingAndEvaluator.get_metrics()
    return jsonify(metrics), 200
