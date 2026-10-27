import os
import sys
import unittest
import numpy as np
import soundfile as sf
import tempfile
import json
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.models import db, User, AssessmentSession

class SpeechCareE2ETestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app("development")
        self.client = self.app.test_client()

        # Create a 2.5-second test audio waveform (160 Hz tone)
        self.sr = 16000
        t = np.linspace(0, 2.5, int(self.sr * 2.5), endpoint=False)
        sig = 0.6 * np.sin(2 * np.pi * 175.0 * t)

        self.audio_bytes = io.BytesIO()
        sf.write(self.audio_bytes, sig, self.sr, format="WAV")
        self.audio_bytes.seek(0)

    def test_full_patient_assessment_workflow(self):
        with self.app.app_context():
            # 1. Login as seeded patient
            login_res = self.client.post("/api/auth/login", json={
                "email": "patient@speechcare.org",
                "password": "patient123"
            })
            self.assertEqual(login_res.status_code, 200)
            patient_token = login_res.get_json()["token"]
            auth_header = {"Authorization": f"Bearer {patient_token}"}

            # 2. Upload audio assessment
            data = {
                "audio": (self.audio_bytes, "test_vowel.wav", "audio/wav"),
                "task_type": "sustained_vowel",
                "consent": "true",
                "allow_demo": "true"
            }
            upload_res = self.client.post(
                "/api/assessments",
                data=data,
                content_type="multipart/form-data",
                headers=auth_header
            )
            self.assertEqual(upload_res.status_code, 201)
            upload_data = upload_res.get_json()
            session = upload_data["assessment"]
            session_id = session["id"]

            # Verify response schema
            self.assertIn("predicted_class", session)
            self.assertIn("confidence", session)
            self.assertIn("detected_gender", session)
            self.assertIn("acoustic_biomarkers", session)
            self.assertIn("suggested_exercises", session)
            self.assertGreater(len(session["suggested_exercises"]), 0)

            # 3. Retrieve assessment by ID
            get_res = self.client.get(f"/api/assessments/{session_id}", headers=auth_header)
            self.assertEqual(get_res.status_code, 200)
            self.assertEqual(get_res.get_json()["assessment"]["id"], session_id)

            # 4. Stream original audio
            audio_res = self.client.get(f"/api/assessments/{session_id}/audio", headers=auth_header)
            self.assertEqual(audio_res.status_code, 200)
            self.assertIn("audio", audio_res.content_type)

            # 5. Download clinical PDF report
            pdf_res = self.client.get(f"/api/assessments/{session_id}/report", headers=auth_header)
            self.assertEqual(pdf_res.status_code, 200)
            self.assertEqual(pdf_res.content_type, "application/pdf")
            self.assertTrue(pdf_res.data.startswith(b"%PDF"))

            # 6. Clinician review
            clinician_login = self.client.post("/api/auth/login", json={
                "email": "clinician@speechcare.org",
                "password": "clinician123"
            })
            clinician_token = clinician_login.get_json()["token"]
            clinician_header = {"Authorization": f"Bearer {clinician_token}"}

            review_res = self.client.patch(
                f"/api/assessments/{session_id}/review",
                json={
                    "notes": "Acoustic jitter within normal limits. Patient advised to continue vocal hygiene.",
                    "approved": True
                },
                headers=clinician_header
            )
            self.assertEqual(review_res.status_code, 200)
            self.assertTrue(review_res.get_json()["assessment"]["clinician_approved"])

            # 7. Patient progress
            progress_res = self.client.get(f"/api/patients/{session['user_id']}/progress", headers=auth_header)
            self.assertEqual(progress_res.status_code, 200)
            self.assertGreaterEqual(progress_res.get_json()["total_sessions"], 1)

            # 8. Patient data deletion (Right to erasure)
            del_res = self.client.delete(f"/api/assessments/{session_id}", headers=auth_header)
            self.assertEqual(del_res.status_code, 200)

            # Verify deleted
            get_deleted = self.client.get(f"/api/assessments/{session_id}", headers=auth_header)
            self.assertEqual(get_deleted.status_code, 404)

if __name__ == "__main__":
    unittest.main()
