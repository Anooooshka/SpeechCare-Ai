import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..models import db, User, PatientProfile, AuditEvent

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "patient").strip().lower()
    consent = data.get("consent", False)

    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required."}), 400

    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    if not full_name:
        return jsonify({"error": "Full name is required."}), 400

    if role not in ["patient", "clinician", "admin"]:
        role = "patient"

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "An account with this email already exists."}), 409

    user = User(email=email, full_name=full_name, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    # Create patient profile if patient
    if role == "patient":
        p_code = f"SC-PT-{user.id:04d}"
        neuro = data.get("neurological_conditions")
        neuro_str = json.dumps(neuro) if isinstance(neuro, list) else (str(neuro) if neuro else None)
        
        profile = PatientProfile(
            user_id=user.id,
            patient_code=p_code,
            consent_given=bool(consent),
            consent_date=datetime.utcnow() if consent else None,
            age=data.get("age"),
            gender=data.get("gender"),
            preferred_language=data.get("preferred_language", "English"),
            dialect=data.get("dialect", "Standard American"),
            neurological_conditions=neuro_str,
            symptom_onset=data.get("symptom_onset"),
            symptom_duration_months=data.get("symptom_duration_months"),
            previous_assessments=data.get("previous_assessments"),
            treatment_history=data.get("treatment_history"),
            communication_needs=data.get("communication_needs"),
            medical_notes=data.get("medical_notes")
        )
        db.session.add(profile)

    audit = AuditEvent(
        user_id=user.id,
        action="USER_REGISTRATION",
        resource_type="USER",
        resource_id=str(user.id),
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Registered new account as {role}"
    )
    db.session.add(audit)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "message": "Account created successfully.",
        "token": token,
        "user": user.to_dict()
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        audit = AuditEvent(
            action="LOGIN_FAILED",
            resource_type="USER",
            ip_address=request.remote_addr,
            status="FAILED",
            details=f"Failed login attempt for {email}"
        )
        db.session.add(audit)
        db.session.commit()
        return jsonify({"error": "Invalid email or password."}), 401

    if not user.is_active:
        return jsonify({"error": "This account has been deactivated."}), 403

    token = create_access_token(identity=str(user.id))

    audit = AuditEvent(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        resource_type="USER",
        resource_id=str(user.id),
        ip_address=request.remote_addr,
        status="SUCCESS"
    )
    db.session.add(audit)
    db.session.commit()

    user_dict = user.to_dict()
    if user.patient_profile:
        user_dict["profile"] = user.patient_profile.to_dict()

    return jsonify({
        "message": "Login successful.",
        "token": token,
        "user": user_dict
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    profile_data = user.patient_profile.to_dict() if user.patient_profile else None
    user_data = user.to_dict()
    user_data["profile"] = profile_data
    return jsonify({"user": user_data}), 200
