import os
import uuid
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from werkzeug.utils import secure_filename
from ..config import Config
from ..models import db, User, AssessmentSession, AuditEvent
from ..services import ModelAdapter, ReportGenerator

assessments_bp = Blueprint("assessments", __name__, url_prefix="/api/assessments")
model_adapter = ModelAdapter()

VALID_TASKS = [
    "sustained_vowel",
    "syllable_repetition",
    "sequence_repetition",
    "reading_passage",
    "spontaneous_speech"
]

def get_auth_user_from_request():
    identity = get_jwt_identity()
    if not identity:
        token = request.args.get("token")
        if token:
            try:
                decoded = decode_token(token)
                identity = decoded.get("sub")
            except Exception:
                pass
    if identity:
        try:
            return db.session.get(User, int(identity))
        except Exception:
            return None
    return None

@assessments_bp.route("", methods=["POST"])
@jwt_required()
def create_assessment():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User authentication record not found."}), 404

    # Check for audio file in request
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided in request. Please record or upload an audio file."}), 400

    audio_file = request.files["audio"]
    if audio_file.filename == "":
        return jsonify({"error": "Selected audio file has an empty filename."}), 400

    # Task type & consent
    task_type = request.form.get("task_type", "reading_passage")
    if task_type not in VALID_TASKS:
        task_type = "reading_passage"

    consent_str = request.form.get("consent", "false").lower()
    consent = consent_str in ["true", "1", "yes"]

    if not consent:
        return jsonify({"error": "Explicit patient consent is required to process and evaluate speech recordings."}), 400

    allow_demo = request.form.get("allow_demo", "true").lower() in ["true", "1", "yes"]

    # Secure file save
    ext = os.path.splitext(audio_file.filename)[1].lower().replace(".", "")
    if ext not in Config.ALLOWED_EXTENSIONS:
        ext = "wav" # Default fallback for webm blobs or browser raw audio

    safe_name = f"rec_{user_id}_{uuid.uuid4().hex[:10]}.{ext}"
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    audio_path = os.path.join(Config.UPLOAD_FOLDER, safe_name)
    audio_file.save(audio_path)

    # Collect patient clinical & neurological history
    patient_history = {}
    raw_history = request.form.get("patient_history")
    if raw_history:
        try:
            patient_history = json.loads(raw_history)
        except Exception:
            patient_history = {}
    else:
        profile = user.patient_profile
        patient_history = {
            "age": request.form.get("age") or (profile.age if profile else None),
            "gender": request.form.get("gender") or (profile.gender if profile else None),
            "neurological_conditions": request.form.getlist("neurological_conditions") or (
                profile.get_neurological_conditions_list() if profile else ["None reported"]
            ),
            "symptom_onset_duration": request.form.get("symptom_onset_duration") or (profile.symptom_onset if profile else "Subacute (< 6 months)"),
            "previous_assessments": request.form.get("previous_assessments") or (profile.previous_assessments if profile else "None recorded"),
            "treatment_history": request.form.get("treatment_history") or (profile.treatment_history if profile else "None recorded"),
            "preferred_language": request.form.get("preferred_language") or (profile.preferred_language if profile else "English"),
            "communication_needs": request.form.get("communication_needs") or (profile.communication_needs if profile else "None noted"),
            "primary_concern": request.form.get("primary_concern", "Speech screening evaluation")
        }

    # Run AI inference pipeline
    result = model_adapter.predict_speech(audio_path, task_type=task_type, allow_demo=allow_demo, patient_history=patient_history)

    if result.get("processing_status") == "error":
        # Clean up file on early validation failure
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass
        return jsonify({
            "error": result.get("error", "Audio validation failed."),
            "warnings": result.get("warnings", [])
        }), 422

    # Query prior assessment for this patient to compute longitudinal comparison
    prior_session = AssessmentSession.query.filter_by(user_id=user.id).order_by(AssessmentSession.created_at.desc()).first()
    previous_comparison = None
    dys_data = result.get("dysarthria_assessment", {})
    rate_data = result.get("speech_rate", {})
    biomarkers = result.get("acoustic_biomarkers", {})
    diff_data = result.get("differential_screening", {})
    audio_quality = result.get("audio_quality", {})

    if prior_session:
        prev_intel = prior_session.intelligibility_index or 0.0
        curr_intel = dys_data.get("intelligibility_index", 0.0)
        prev_wpm = prior_session.speech_rate_wpm or 0.0
        curr_wpm = rate_data.get("speech_rate_wpm", 0.0)
        previous_comparison = {
            "prior_session_id": prior_session.id,
            "prior_date": prior_session.created_at.strftime("%b %d, %Y") if prior_session.created_at else None,
            "prior_severity": prior_session.dysarthria_severity_category,
            "delta_intelligibility": round(curr_intel - prev_intel, 1),
            "delta_speech_rate_wpm": round(curr_wpm - prev_wpm, 1),
            "longitudinal_note": "Acoustic changes reflect session recording variability; not definitive clinical recovery."
        }

    # Save to database
    session = AssessmentSession(
        user_id=user.id,
        task_type=task_type,
        audio_filename=safe_name,
        enhanced_audio_filename=result.get("enhanced_audio_filename"),
        audio_duration=result.get("audio_duration", 0.0),
        speech_duration_sec=result.get("speech_duration_sec", 0.0),
        sample_rate=result.get("sample_rate", 16000),
        file_size_bytes=result.get("file_size_bytes", 0),
        
        # Audio Quality
        audio_quality_status=audio_quality.get("quality_status", "good"),
        audio_snr_db=audio_quality.get("snr_db"),
        is_clipped=audio_quality.get("is_clipped", False),
        silence_percentage=round(float(audio_quality.get("silence_ratio", 0.15)) * 100, 1),
        quality_warnings_json=json.dumps(result.get("warnings", [])),
        
        # Classification & Severity AI outputs
        predicted_class=result.get("predicted_class"),
        class_probabilities_json=json.dumps(result.get("class_probabilities", {})),
        confidence=result.get("confidence", 0.0),
        is_abstained=result.get("is_abstained", False),
        severity_score=result.get("severity_score"),
        severity_band=result.get("severity_band"),
        
        # 5-Category Dysarthria Severity
        dysarthria_severity_category=result.get("dysarthria_severity_category"),
        contributing_features_json=json.dumps(result.get("contributing_features", [])),
        
        # Acoustic biomarkers & voice analysis
        detected_gender=result.get("detected_gender"),
        gender_confidence=result.get("gender_confidence"),
        f0_mean=biomarkers.get("f0_mean"),
        f0_std=biomarkers.get("f0_std"),
        jitter_percent=biomarkers.get("jitter_percent"),
        shimmer_percent=biomarkers.get("shimmer_percent"),
        hnr_db=biomarkers.get("hnr_db"),
        silence_ratio=biomarkers.get("silence_ratio"),
        speech_rate_wpm=rate_data.get("speech_rate_wpm"),
        syllables_per_sec=rate_data.get("syllables_per_sec"),
        intelligibility_index=dys_data.get("intelligibility_index"),
        articulation_score=dys_data.get("articulation_score"),
        
        # Clinical & History Integration
        patient_history_json=json.dumps(patient_history),
        historical_factors_considered_json=json.dumps(result.get("historical_factors_considered", [])),
        missing_history_info_json=json.dumps(result.get("missing_history_info", [])),
        dysarthria_assessment_json=json.dumps(dys_data),
        differential_screening_json=json.dumps(diff_data),
        previous_comparison_json=json.dumps(previous_comparison),
        
        # Explainability & Recommendations
        explanation_json=json.dumps(result.get("explanation_data", {})),
        summary_text=result.get("summary_text"),
        suggested_exercises_json=json.dumps(result.get("suggested_exercises", [])),
        
        # Status and audit
        is_demo_simulated=result.get("is_demo_simulated", False),
        model_version=result.get("model_version", "SpeechCareFusionNet-v1.0"),
        consent_recorded=True
    )

    db.session.add(session)
    db.session.flush()

    audit = AuditEvent(
        user_id=user.id,
        action="ASSESSMENT_SUBMITTED",
        resource_type="ASSESSMENT",
        resource_id=str(session.id),
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Task: {task_type}, Severity: {session.dysarthria_severity_category}, Quality: {session.audio_quality_status}"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Speech screening analysis completed successfully.",
        "assessment": session.to_dict(),
        "warnings": result.get("warnings", [])
    }), 201

@assessments_bp.route("", methods=["GET"])
@jwt_required()
def list_assessments():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    target_patient_id = request.args.get("patient_id")

    if user.role == "patient":
        # Patients can only see their own assessments
        sessions = AssessmentSession.query.filter_by(user_id=user.id).order_by(AssessmentSession.created_at.desc()).all()
    elif user.role in ["clinician", "admin"]:
        if target_patient_id:
            sessions = AssessmentSession.query.filter_by(user_id=int(target_patient_id)).order_by(AssessmentSession.created_at.desc()).all()
        else:
            sessions = AssessmentSession.query.order_by(AssessmentSession.created_at.desc()).limit(100).all()
    else:
        sessions = []

    return jsonify({
        "assessments": [s.to_dict() for s in sessions],
        "count": len(sessions)
    }), 200

@assessments_bp.route("/<int:session_id>", methods=["GET"])
@jwt_required()
def get_assessment(session_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    session = AssessmentSession.query.get_or_404(session_id)

    # Permission check
    if user.role == "patient" and session.user_id != user.id:
        return jsonify({"error": "Unauthorized access to this assessment."}), 403

    return jsonify({"assessment": session.to_dict()}), 200

@assessments_bp.route("/<int:session_id>/audio", methods=["GET"])
@jwt_required(optional=True)
def get_audio(session_id):
    user = get_auth_user_from_request()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    session = AssessmentSession.query.get_or_404(session_id)
    if user.role == "patient" and session.user_id != user.id:
        return jsonify({"error": "Unauthorized access to audio recording."}), 403

    path = os.path.join(Config.UPLOAD_FOLDER, session.audio_filename)
    if not os.path.exists(path):
        return jsonify({"error": "Audio file not found on disk."}), 404

    return send_file(path, mimetype="audio/wav")

@assessments_bp.route("/<int:session_id>/enhanced-audio", methods=["GET"])
@jwt_required(optional=True)
def get_enhanced_audio(session_id):
    user = get_auth_user_from_request()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    session = AssessmentSession.query.get_or_404(session_id)
    if user.role == "patient" and session.user_id != user.id:
        return jsonify({"error": "Unauthorized access to enhanced audio."}), 403

    if not session.enhanced_audio_filename:
        return jsonify({"error": "No enhanced audio generated for this session."}), 404

    path = os.path.join(Config.UPLOAD_FOLDER, session.enhanced_audio_filename)
    if not os.path.exists(path):
        return jsonify({"error": "Enhanced audio file not found on disk."}), 404

    return send_file(path, mimetype="audio/wav")

@assessments_bp.route("/<int:session_id>/report", methods=["GET"])
@jwt_required(optional=True)
def download_report(session_id):
    user = get_auth_user_from_request()
    if not user:
        return jsonify({"error": "Authentication required to download clinical report. Please provide token."}), 401

    session = AssessmentSession.query.get_or_404(session_id)
    if user.role == "patient" and session.user_id != user.id:
        return jsonify({"error": "Unauthorized access to clinical report."}), 403

    # Query prior assessment for longitudinal report comparison
    prior_session = AssessmentSession.query.filter(
        AssessmentSession.user_id == session.user_id,
        AssessmentSession.id < session.id
    ).order_by(AssessmentSession.created_at.desc()).first()

    # Generate PDF report
    report_path = ReportGenerator.generate_assessment_report(session, previous_session=prior_session)

    audit = AuditEvent(
        user_id=user.id,
        action="REPORT_DOWNLOADED",
        resource_type="REPORT",
        resource_id=str(session.id),
        ip_address=request.remote_addr,
        status="SUCCESS"
    )
    db.session.add(audit)
    db.session.commit()

    return send_file(
        report_path,
        as_attachment=True,
        download_name=f"SpeechCare_Clinical_Report_Assessment_{session.id}.pdf",
        mimetype="application/pdf"
    )

@assessments_bp.route("/<int:session_id>/review", methods=["PATCH"])
@jwt_required()
def review_assessment(session_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if user.role not in ["clinician", "admin"]:
        return jsonify({"error": "Only licensed clinicians or administrators can sign and review assessments."}), 403

    session = AssessmentSession.query.get_or_404(session_id)
    data = request.get_json() or {}

    if "notes" in data:
        session.clinician_notes = data["notes"]
    if "approved" in data:
        session.clinician_approved = bool(data["approved"])
        session.clinician_id = user.id
        session.reviewed_at = datetime.utcnow()

    audit = AuditEvent(
        user_id=user.id,
        action="ASSESSMENT_REVIEWED",
        resource_type="ASSESSMENT",
        resource_id=str(session.id),
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Approved: {session.clinician_approved}, Notes: {bool(session.clinician_notes)}"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Clinician review updated successfully.",
        "assessment": session.to_dict()
    }), 200

@assessments_bp.route("/<int:session_id>", methods=["DELETE"])
@jwt_required()
def delete_assessment(session_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    session = AssessmentSession.query.get_or_404(session_id)

    # Permission check: patients can only delete their own recordings
    if user.role == "patient" and session.user_id != user.id:
        return jsonify({"error": "Unauthorized to delete this assessment recording."}), 403

    # Delete physical audio files from disk
    raw_path = os.path.join(Config.UPLOAD_FOLDER, session.audio_filename)
    if os.path.exists(raw_path):
        try:
            os.remove(raw_path)
        except Exception:
            pass

    if session.enhanced_audio_filename:
        enh_path = os.path.join(Config.UPLOAD_FOLDER, session.enhanced_audio_filename)
        if os.path.exists(enh_path):
            try:
                os.remove(enh_path)
            except Exception:
                pass

    audit = AuditEvent(
        user_id=user.id,
        action="RECORDING_ERASED",
        resource_type="ASSESSMENT",
        resource_id=str(session.id),
        ip_address=request.remote_addr,
        status="SUCCESS",
        details="Right to erasure: permanently deleted audio recording and assessment record"
    )
    db.session.add(audit)
    db.session.delete(session)
    db.session.commit()

    return jsonify({"message": "Assessment and associated recordings permanently deleted (Right to Erasure)."}), 200
