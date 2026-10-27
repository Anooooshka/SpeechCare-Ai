import os
import json
from datetime import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from .config import config_by_name, Config
from .models import db, User, PatientProfile, AssessmentSession, AuditEvent
from .routes.auth import auth_bp
from .routes.assessments import assessments_bp
from .routes.clinician import clinician_bp
from .routes.admin import admin_bp
from .routes.health import health_bp

def create_app(config_name="development"):
    app = Flask(__name__)
    app_config = config_by_name.get(config_name, Config)
    app.config.from_object(app_config)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    jwt = JWTManager(app)
    
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["300 per day", "60 per hour"],
        storage_uri="memory://"
    )

    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(assessments_bp)
    app.register_blueprint(clinician_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(health_bp)

    # Global error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "details": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(413)
    def request_too_large(e):
        return jsonify({"error": "File exceeds maximum upload size (16MB)"}), 413

    @app.errorhandler(429)
    def ratelimit_exceeded(e):
        return jsonify({"error": "Rate limit exceeded. Please wait a moment before trying again."}), 429

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500

    # Ensure directories exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["REPORT_FOLDER"], exist_ok=True)
    os.makedirs(app.config["WEIGHTS_FOLDER"], exist_ok=True)

    # Create tables and seed initial demo accounts
    with app.app_context():
        db.create_all()
        seed_demo_accounts()

    return app

def seed_demo_accounts():
    """Seeds baseline accounts for easy immediate testing across all 3 user roles."""
    if User.query.count() == 0:
        # 1. Clinician (Lead SLP)
        clinician = User(
            email="clinician@speechcare.org",
            full_name="Dr. Marcus Vance, CCC-SLP",
            role="clinician"
        )
        clinician.set_password("clinician123")
        db.session.add(clinician)
        db.session.flush()

        # 2. Patient 1: Sarah Jenkins (Post-stroke mild dysarthria)
        patient1 = User(
            email="patient@speechcare.org",
            full_name="Sarah Jenkins",
            role="patient"
        )
        patient1.set_password("patient123")
        db.session.add(patient1)
        db.session.flush()

        profile1 = PatientProfile(
            user_id=patient1.id,
            clinician_id=clinician.id,
            patient_code="SC-PT-1001",
            age=48,
            gender="Female",
            preferred_language="English",
            dialect="Standard American",
            neurological_conditions=json.dumps(["Ischemic Stroke (Left MCA)"]),
            symptom_onset="Subacute (8 months ago)",
            symptom_duration_months=8,
            previous_assessments="Frenchay Dysarthria Assessment-2 (FDA-2) - Mild spastic dysarthria noted",
            treatment_history="Outpatient Speech-Language Therapy (2x/week), Oral-motor exercises",
            communication_needs="Mild vocal fatigue in late afternoon; benefits from rate pacing cues",
            medical_notes="History of post-stroke mild expressive difficulty. Excellent therapy adherence.",
            consent_given=True,
            consent_date=datetime.utcnow()
        )
        db.session.add(profile1)

        # 3. Patient 2: Robert Chen (Parkinsonian hypophonic dysarthria)
        patient2 = User(
            email="robert.chen@speechcare.org",
            full_name="Robert Chen",
            role="patient"
        )
        patient2.set_password("robert123")
        db.session.add(patient2)
        db.session.flush()

        profile2 = PatientProfile(
            user_id=patient2.id,
            clinician_id=clinician.id,
            patient_code="SC-PT-1002",
            age=65,
            gender="Male",
            preferred_language="English",
            dialect="Standard American",
            neurological_conditions=json.dumps(["Parkinson's Disease (Hoehn & Yahr Stage II)"]),
            symptom_onset="Gradual / Insidious (24 months)",
            symptom_duration_months=24,
            previous_assessments="Voice Handicap Index-10 (VHI-10): Score 22",
            treatment_history="Levodopa/Carbidopa 100/25mg, LSVT LOUD protocol (completed 16 sessions)",
            communication_needs="Hypophonia (reduced vocal volume); needs visual loudness feedback",
            medical_notes="Exhibits characteristic hypokinetic dysarthria traits: reduced pitch variation and soft volume.",
            consent_given=True,
            consent_date=datetime.utcnow()
        )
        db.session.add(profile2)

        # 4. Administrator
        admin = User(
            email="admin@speechcare.org",
            full_name="SpeechCare Administrator",
            role="admin"
        )
        admin.set_password("admin123")
        db.session.add(admin)

        db.session.commit()
        print("[Database] Initialized tables and seeded demo accounts with complete clinical histories.")

if __name__ == "__main__":
    app = create_app("development")
    app.run(host="0.0.0.0", port=5001, debug=True)
