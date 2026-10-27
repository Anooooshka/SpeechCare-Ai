import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "speechcare-super-secret-production-key-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-speechcare-token-key-2026-secure")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24  # 24 hours

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'speechcare.db')}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    REPORT_FOLDER = os.path.join(BASE_DIR, "reports")
    WEIGHTS_FOLDER = os.path.join(BASE_DIR, "weights")

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB limit
    ALLOWED_EXTENSIONS = {"wav", "mp3", "ogg", "webm", "flac", "m4a", "aac"}

    MIN_AUDIO_DURATION_SEC = 0.8
    MAX_AUDIO_DURATION_SEC = 120.0
    SAMPLE_RATE = 16000

    # Calibrated confidence threshold: Abstain if lower than 0.60
    CONFIDENCE_THRESHOLD = 0.60

    # Severity bands definition
    SEVERITY_BANDS = {
        "Mild": (0.0, 25.0),
        "Moderate": (25.0, 50.0),
        "Marked": (50.0, 75.0),
        "Severe": (75.0, 100.0)
    }

    CLASSES = ["control", "dysarthria", "stuttering", "aphasia"]

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
