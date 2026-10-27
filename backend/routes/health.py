import os
import torch
from flask import Blueprint, jsonify
from ..config import Config

health_bp = Blueprint("health", __name__, url_prefix="/api")

@health_bp.route("/health", methods=["GET"])
def health_check():
    weights_path = os.path.join(Config.WEIGHTS_FOLDER, "speechcare_fusion_model.pt")
    weights_installed = os.path.exists(weights_path)
    
    device_info = "cpu"
    if torch.backends.mps.is_available():
        device_info = "Apple Silicon MPS (GPU Accelerated)"
    elif torch.cuda.is_available():
        device_info = f"NVIDIA CUDA: {torch.cuda.get_device_name(0)}"

    return jsonify({
        "status": "online",
        "service": "SpeechCare AI Backend REST Engine",
        "version": "1.0.0",
        "pytorch_version": torch.__version__,
        "hardware_acceleration": device_info,
        "model_weights_ready": weights_installed,
        "demo_mode_fallback": not weights_installed,
        "supported_classes": Config.CLASSES,
        "confidence_threshold": Config.CONFIDENCE_THRESHOLD,
        "severity_bands": Config.SEVERITY_BANDS
    }), 200
