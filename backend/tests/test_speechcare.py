import os
import sys
import unittest
import numpy as np
import soundfile as sf
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.models import db, User, AssessmentSession
from backend.services.audio_processor import AudioProcessor
from backend.services.acoustic_biomarkers import AcousticBiomarkerExtractor
from backend.services.model_adapter import ModelAdapter
from backend.services.exercise_recommender import ExerciseRecommender
from backend.services.report_generator import ReportGenerator

class SpeechCareTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("development")
        cls.app.config["TESTING"] = True
        cls.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()

    def setUp(self):
        # Generate a synthetic 3-second 160Hz sine audio file for audio testing
        self.sr = 16000
        t = np.linspace(0, 3.0, int(self.sr * 3.0), endpoint=False)
        # 160 Hz tone (typical human pitch) with modulation
        sig = 0.5 * np.sin(2 * np.pi * 160.0 * t) + 0.1 * np.sin(2 * np.pi * 320.0 * t)

        self.temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        sf.write(self.temp_wav.name, sig, self.sr, format="WAV")

    def tearDown(self):
        if os.path.exists(self.temp_wav.name):
            try:
                os.remove(self.temp_wav.name)
            except Exception:
                pass

    def test_audio_processor_validation(self):
        processor = AudioProcessor(target_sr=16000)
        is_valid, err, meta = processor.validate_audio_file(self.temp_wav.name)
        self.assertTrue(is_valid)
        self.assertIsNone(err)
        self.assertAlmostEqual(meta["duration"], 3.0, delta=0.1)

    def test_acoustic_biomarkers(self):
        processor = AudioProcessor(target_sr=16000)
        y, sr = processor.load_and_preprocess(self.temp_wav.name)
        extractor = AcousticBiomarkerExtractor(sample_rate=sr)
        metrics = extractor.extract_all(y)

        self.assertIn("f0_mean", metrics)
        self.assertIn("detected_gender", metrics)
        self.assertIn(metrics["detected_gender"], ["Male", "Female", "Undetermined"])
        self.assertIn("jitter_percent", metrics)
        self.assertIn("shimmer_percent", metrics)
        self.assertIn("hnr_db", metrics)

    def test_model_adapter_predict(self):
        adapter = ModelAdapter()
        result = adapter.predict_speech(self.temp_wav.name, task_type="sustained_vowel")
        self.assertEqual(result["processing_status"], "success")
        self.assertIn(result["predicted_class"], ["control", "dysarthria", "stuttering", "aphasia", None])
        self.assertGreaterEqual(result["confidence"], 0.0)
        self.assertLessEqual(result["confidence"], 1.0)
        self.assertIn("suggested_exercises", result)
        self.assertGreater(len(result["suggested_exercises"]), 0)
        self.assertIn(result["dysarthria_severity_category"], [
            "No clear dysarthric indicators detected",
            "Mild dysarthria",
            "Moderate dysarthria",
            "Severe dysarthria",
            "Unable to determine due to insufficient or poor-quality audio"
        ])

    def test_audio_quality_validation(self):
        processor = AudioProcessor(target_sr=16000)
        # 1. Normal audio
        y, sr = processor.load_and_preprocess(self.temp_wav.name)
        quality = processor.analyze_audio_quality(y, sr)
        self.assertIn(quality["quality_status"], ["good", "acceptable"])
        self.assertTrue(quality["is_acceptable_for_analysis"])
        self.assertGreater(quality["snr_db"], 10.0)

        # 2. Silent audio
        silent_y = np.zeros(16000 * 2, dtype=np.float32)
        silent_quality = processor.analyze_audio_quality(silent_y, 16000)
        self.assertEqual(silent_quality["quality_status"], "insufficient")
        self.assertFalse(silent_quality["is_acceptable_for_analysis"])

    def test_all_standardized_speech_tasks(self):
        adapter = ModelAdapter()
        tasks = [
            "sustained_vowel",
            "syllable_repetition",
            "sequence_repetition",
            "reading_passage",
            "spontaneous_speech"
        ]
        for t in tasks:
            res = adapter.predict_speech(self.temp_wav.name, task_type=t)
            self.assertEqual(res["processing_status"], "success")
            self.assertIn("dysarthria_assessment", res)
            self.assertIn("differential_screening", res)
            self.assertIn("patient_history", res)

    def test_exercise_recommender(self):
        for cond in ["dysarthria", "stuttering", "aphasia", "control"]:
            exs = ExerciseRecommender.get_recommendations(cond)
            self.assertTrue(len(exs) >= 3)
            self.assertTrue("title" in exs[0])
            self.assertTrue("instructions" in exs[0])

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "online")
        self.assertIn("hardware_acceleration", data)

    def test_model_evaluation_endpoint(self):
        res = self.client.get("/api/model/evaluation")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("evaluation_metrics", data)
        self.assertIn("confusion_matrix", data["evaluation_metrics"])
        self.assertIn("macro_f1_percent", data["evaluation_metrics"])
        self.assertIn("macro_sensitivity_recall_percent", data["evaluation_metrics"])
        self.assertIn("macro_specificity_percent", data["evaluation_metrics"])

    def test_auth_login_seeded(self):
        with self.app.app_context():
            # Test seeded patient login
            res = self.client.post("/api/auth/login", json={
                "email": "patient@speechcare.org",
                "password": "patient123"
            })
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertIn("token", data)
            self.assertEqual(data["user"]["role"], "patient")

    def test_patient_profile_management(self):
        with self.app.app_context():
            # Login as clinician
            login_res = self.client.post("/api/auth/login", json={
                "email": "clinician@speechcare.org",
                "password": "clinician123"
            })
            token = login_res.get_json()["token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Get patient 2 profile
            res = self.client.get("/api/patients/2/profile", headers=headers)
            self.assertEqual(res.status_code, 200)
            profile = res.get_json()["profile"]
            self.assertEqual(profile["user_id"], 2)
            self.assertIn("SC-PT-", profile["patient_code"])

            # Update patient profile
            up_res = self.client.put("/api/patients/2/profile", headers=headers, json={
                "neurological_conditions": ["Stroke", "Hypertension"],
                "symptom_onset": "Sudden (<24h)",
                "symptom_duration_months": 6,
                "preferred_language": "English (US)"
            })
            self.assertEqual(up_res.status_code, 200)
            up_data = up_res.get_json()["profile"]
            self.assertIn("Stroke", up_data["neurological_conditions"])

if __name__ == "__main__":
    unittest.main()
