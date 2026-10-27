import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, User, AssessmentSession, AuditEvent
from ..config import Config

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    user_id = int(get_jwt_identity())
    admin_user = User.query.get(user_id)
    if admin_user.role != "admin":
        return jsonify({"error": "Admin privileges required."}), 403

    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200

@admin_bp.route("/users/<int:target_user_id>/role", methods=["PATCH"])
@jwt_required()
def update_user_role(target_user_id):
    user_id = int(get_jwt_identity())
    admin_user = User.query.get(user_id)
    if admin_user.role != "admin":
        return jsonify({"error": "Admin privileges required."}), 403

    user = User.query.get_or_404(target_user_id)
    data = request.get_json() or {}
    new_role = data.get("role")
    if new_role not in ["patient", "clinician", "admin"]:
        return jsonify({"error": "Invalid role specified."}), 400

    user.role = new_role
    audit = AuditEvent(
        user_id=admin_user.id,
        action="ROLE_MODIFIED",
        resource_type="USER",
        resource_id=str(user.id),
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Changed user {user.email} role to {new_role}"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({"message": f"User role updated to {new_role}.", "user": user.to_dict()}), 200

@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
def list_audit_logs():
    user_id = int(get_jwt_identity())
    admin_user = User.query.get(user_id)
    if admin_user.role != "admin":
        return jsonify({"error": "Admin privileges required."}), 403

    logs = AuditEvent.query.order_by(AuditEvent.timestamp.desc()).limit(150).all()
    return jsonify({"audit_logs": [log.to_dict() for log in logs]}), 200

@admin_bp.route("/system-health", methods=["GET"])
@jwt_required()
def system_health():
    user_id = int(get_jwt_identity())
    admin_user = User.query.get(user_id)
    if admin_user.role != "admin":
        return jsonify({"error": "Admin privileges required."}), 403

    total_users = User.query.count()
    total_assessments = AssessmentSession.query.count()
    weights_path = os.path.join(Config.WEIGHTS_FOLDER, "speechcare_fusion_model.pt")
    weights_present = os.path.exists(weights_path)

    upload_count = 0
    upload_size_mb = 0
    if os.path.exists(Config.UPLOAD_FOLDER):
        files = os.listdir(Config.UPLOAD_FOLDER)
        upload_count = len(files)
        upload_size_mb = round(sum(os.path.getsize(os.path.join(Config.UPLOAD_FOLDER, f)) for f in files if os.path.isfile(os.path.join(Config.UPLOAD_FOLDER, f))) / (1024 * 1024), 2)

    return jsonify({
        "status": "healthy",
        "total_users": total_users,
        "total_assessments": total_assessments,
        "model_weights_installed": weights_present,
        "weights_path": weights_path,
        "stored_audio_files": upload_count,
        "storage_used_mb": upload_size_mb
    }), 200
