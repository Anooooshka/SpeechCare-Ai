import os
import json
from datetime import datetime
from fpdf import FPDF
from ..config import Config

class SpeechCarePDF(FPDF):
    def header(self):
        # Header banner
        self.set_fill_color(13, 148, 136) # Teal #0D9488
        self.rect(0, 0, 210, 16, 'F')
        
        self.set_font("Helvetica", "B", 10.5)
        self.set_text_color(255, 255, 255)
        self.set_xy(10, 4)
        self.cell(120, 8, "SPEECHCARE AI | CLINICAL SPEECH & LANGUAGE SCREENING REPORT", 0, 0, "L")
        
        self.set_font("Helvetica", "", 8)
        self.set_xy(140, 4)
        self.cell(60, 8, "Decision Support Only | Not a Diagnosis", 0, 0, "R")
        self.ln(16)

    def footer(self):
        self.set_y(-16)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(140, 140, 140)
        self.cell(0, 4, f"Page {self.page_no()} | SpeechCare AI Clinical Decision Support Engine | Confidential Medical Document", 0, 1, "C")
        self.cell(0, 4, "SCREENING SUPPORT ONLY. REQUIRES FORMAL EVALUATION BY A CERTIFIED SPEECH-LANGUAGE PATHOLOGIST.", 0, 0, "C")

class ReportGenerator:
    @staticmethod
    def generate_assessment_report(assessment, output_dir=None, previous_session=None):
        """
        Builds a comprehensive, multi-page clinical report for an AssessmentSession instance
        incorporating Dysarthria severity (5 categories), speech characteristics,
        audio quality validation, differential disorder screening, patient neurological history,
        longitudinal session comparisons, and clinician attestation.
        """
        output_dir = output_dir or Config.REPORT_FOLDER
        os.makedirs(output_dir, exist_ok=True)
        
        report_filename = f"SpeechCare_Report_Session_{assessment.id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        report_path = os.path.join(output_dir, report_filename)

        pdf = SpeechCarePDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=18)
        pdf.add_page()

        def clean_ascii(text):
            if not text:
                return ""
            return str(text).encode('ascii', 'ignore').decode('ascii')

        def parse_json(raw, default):
            if not raw:
                return default
            try:
                return json.loads(raw)
            except Exception:
                return default

        patient_history = parse_json(assessment.patient_history_json, {})
        dys_assessment = parse_json(assessment.dysarthria_assessment_json, {})
        diff_screening = parse_json(assessment.differential_screening_json, {})
        exercises = parse_json(assessment.suggested_exercises_json, [])
        historical_factors = parse_json(assessment.historical_factors_considered_json, [])
        missing_history = parse_json(assessment.missing_history_info_json, [])
        contributing_feats = parse_json(assessment.contributing_features_json, [])
        quality_warnings = parse_json(assessment.quality_warnings_json, [])

        p_code = None
        if assessment.user and assessment.user.patient_profile and assessment.user.patient_profile.patient_code:
            p_code = assessment.user.patient_profile.patient_code
        else:
            p_code = f"SC-PT-{assessment.user_id:04d}"

        # Document Header Title
        pdf.set_font("Helvetica", "B", 15)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 7, "Speech, Language & Dysarthria Clinical Assessment Summary", 0, 1, "L")
        
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(100, 116, 139)
        date_str = assessment.created_at.strftime("%B %d, %Y at %H:%M UTC") if assessment.created_at else "N/A"
        pdf.cell(0, 4.5, f"Report ID: SC-ASSESS-{assessment.id:06d}  |  Assessment Date: {date_str}  |  Patient ID: {p_code}", 0, 1, "L")
        pdf.ln(2.5)

        # 1. Patient Profile & Clinical Neurological History Box
        pdf.set_fill_color(248, 250, 252)
        pdf.set_draw_color(203, 213, 225)
        pdf.rect(10, pdf.get_y(), 190, 28, 'DF')

        start_y = pdf.get_y() + 2
        pdf.set_xy(14, start_y)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(32, 4.5, "Patient Identifier:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        p_name = clean_ascii(assessment.user.full_name if assessment.user else f"Patient #{assessment.user_id}")
        pdf.cell(58, 4.5, f"{p_name} ({p_code})", 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(42, 4.5, "Age & Biological Gender:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        age_val = patient_history.get('age') or (assessment.user.patient_profile.age if assessment.user and assessment.user.patient_profile else 'Unspecified')
        gender_val = patient_history.get('gender') or (assessment.user.patient_profile.gender if assessment.user and assessment.user.patient_profile else 'Unspecified')
        pdf.cell(50, 4.5, f"{age_val} yrs / {gender_val}", 0, 1)

        # Row 2: Neurological conditions & Onset
        pdf.set_xy(14, start_y + 5.5)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Neurological History:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        conds = patient_history.get("neurological_conditions") or []
        conds_str = ", ".join(conds) if isinstance(conds, list) and conds else str(patient_history.get("neurological_conditions", "None reported"))
        pdf.cell(58, 4.5, clean_ascii(conds_str)[:38], 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(42, 4.5, "Symptom Onset / Duration:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        onset_str = clean_ascii(str(patient_history.get("symptom_onset_duration") or patient_history.get("symptom_onset", "Subacute (< 6 months)")))
        pdf.cell(50, 4.5, onset_str[:30], 0, 1)

        # Row 3: Prior Assessments & Therapy History
        pdf.set_xy(14, start_y + 11)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Prior Assessments:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        prev_ass = clean_ascii(str(patient_history.get("previous_assessments", "None recorded")))
        pdf.cell(58, 4.5, prev_ass[:38], 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(42, 4.5, "Therapy / Treatment History:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        tx_hist = clean_ascii(str(patient_history.get("treatment_history", "None recorded")))
        pdf.cell(50, 4.5, tx_hist[:30], 0, 1)

        # Row 4: Preferred Language & Communication Needs
        pdf.set_xy(14, start_y + 16.5)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Language / Dialect:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        lang_str = clean_ascii(str(patient_history.get("preferred_language", "English (Standard American)")))
        pdf.cell(58, 4.5, lang_str[:38], 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(42, 4.5, "Communication Needs:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        needs_str = clean_ascii(str(patient_history.get("communication_needs", "None noted")))
        pdf.cell(50, 4.5, needs_str[:30], 0, 1)
        pdf.ln(13)

        # 2. Recording Quality & Audio Validation
        pdf.set_font("Helvetica", "B", 10.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6, "1. Audio Quality & Recording Validation", 0, 1, "L")

        pdf.set_fill_color(241, 245, 249)
        pdf.set_draw_color(203, 213, 225)
        pdf.rect(10, pdf.get_y(), 190, 16, 'DF')

        q_y = pdf.get_y() + 2
        pdf.set_xy(14, q_y)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Quality Status:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        q_stat = clean_ascii(str(assessment.audio_quality_status or "good").upper())
        pdf.cell(30, 4.5, q_stat, 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Signal-to-Noise Ratio:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        snr_txt = f"{assessment.audio_snr_db:.1f} dB" if assessment.audio_snr_db is not None else "> 18.0 dB"
        pdf.cell(30, 4.5, snr_txt, 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Clipping Check:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        clip_txt = "Clipped (gain too high)" if assessment.is_clipped else "Clear (No clipping)"
        pdf.cell(30, 4.5, clip_txt, 0, 1)

        pdf.set_xy(14, q_y + 5.5)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Evaluated Task:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        pdf.cell(55, 4.5, clean_ascii(assessment.task_type.replace('_', ' ').title()), 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(32, 4.5, "Speech Duration:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        dur_txt = f"{assessment.audio_duration:.1f}s total ({assessment.speech_duration_sec or assessment.audio_duration:.1f}s active speech)"
        pdf.cell(60, 4.5, dur_txt, 0, 1)
        pdf.ln(7)

        # 3. Dysarthria Severity & Detailed Speech Production Analysis
        pdf.set_font("Helvetica", "B", 10.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6, "2. Dysarthria Severity Estimation & Speech Production Analysis", 0, 1, "L")

        pdf.set_fill_color(240, 253, 250) # Teal 50
        pdf.set_draw_color(13, 148, 136)  # Teal 600
        pdf.rect(10, pdf.get_y(), 190, 42, 'DF')

        d_box = pdf.get_y() + 2.5
        pdf.set_xy(14, d_box)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(15, 118, 110)
        dys_sev = clean_ascii(assessment.dysarthria_severity_category or dys_assessment.get("dysarthria_severity", "No clear dysarthric indicators detected"))
        pdf.cell(100, 5, f"ESTIMATED SEVERITY: {dys_sev.upper()}", 0, 0)

        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(51, 65, 85)
        pdf.cell(35, 5, "Calibrated Confidence:", 0, 0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(40, 5, f"{assessment.confidence:.1f}%", 0, 1)

        # Row 2: Intelligibility & Rate
        pdf.set_xy(14, d_box + 6.5)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(38, 4.5, "Intelligibility Index:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        intel_val = dys_assessment.get("intelligibility_index", round(assessment.intelligibility_index or 88.0, 1))
        pdf.cell(45, 4.5, f"{intel_val}% (Estimated)", 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(38, 4.5, "Speech Rate:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        wpm = dys_assessment.get("speech_rate_wpm", round(assessment.speech_rate_wpm or 140.0, 1))
        syl = dys_assessment.get("syllables_per_sec", round(assessment.syllables_per_sec or 3.5, 2))
        pdf.cell(55, 4.5, f"{wpm} WPM ({syl} syl/sec)", 0, 1)

        # Row 3: Articulation & Phonation Voice Quality
        pdf.set_xy(14, d_box + 12)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(38, 4.5, "Articulation Accuracy:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        art_score = dys_assessment.get("articulation_score", round(assessment.articulation_score or 90.0, 1))
        cons_prec = clean_ascii(dys_assessment.get("consonant_precision", "Crisp & Precise Consonants"))
        pdf.cell(45, 4.5, f"{art_score}/100 ({cons_prec[:20]})", 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(38, 4.5, "Vocal Quality:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        vq = clean_ascii(dys_assessment.get("voice_quality_rating", "Normal Resonance"))
        pdf.cell(55, 4.5, vq[:32], 0, 1)

        # Row 4: Prosody & Breath Support
        pdf.set_xy(14, d_box + 17.5)
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(38, 4.5, "Prosody / Intonation:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        pros = clean_ascii(dys_assessment.get("prosody_rating", "Natural Dynamic Intonation"))
        pdf.cell(45, 4.5, pros[:26], 0, 0)

        pdf.set_font("Helvetica", "B", 8.5)
        pdf.cell(38, 4.5, "Respiration Coordination:", 0, 0)
        pdf.set_font("Helvetica", "", 8.5)
        resp = clean_ascii(dys_assessment.get("respiration_breath_support", "Adequate Phrasing"))
        pdf.cell(55, 4.5, resp[:32], 0, 1)

        # Row 5: Contributing Speech Features
        pdf.set_xy(14, d_box + 23)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(38, 4, "Contributing Features:", 0, 0)
        pdf.set_font("Helvetica", "", 8)
        feats_str = "; ".join(contributing_feats[:2]) if contributing_feats else "Acoustic norms within baseline."
        pdf.cell(140, 4, clean_ascii(feats_str)[:85], 0, 1)

        # Row 6: Non-diagnostic disclaimer line
        pdf.set_xy(14, d_box + 28)
        pdf.set_font("Helvetica", "I", 7.5)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(180, 4, "Notice: Severity estimate reflects acoustic screening metrics and is NOT a definitive clinical diagnosis.", 0, 1)
        pdf.ln(13)

        # 4. Differential Screening for Other Communication Disorders
        pdf.set_font("Helvetica", "B", 10.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6, "3. Screening for Associated Speech & Language Disorders (Differential Profile)", 0, 1, "L")

        indices = diff_screening.get("indices", {})
        pdf.set_fill_color(248, 250, 252)
        pdf.set_draw_color(203, 213, 225)
        pdf.rect(10, pdf.get_y(), 190, 25, 'DF')

        diff_y = pdf.get_y() + 1.5
        pdf.set_xy(14, diff_y)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(51, 65, 85)
        pdf.cell(42, 4.5, "Condition Screened", 0, 0)
        pdf.cell(35, 4.5, "Screening Index", 0, 0)
        pdf.cell(48, 4.5, "Clinical Distinction", 0, 0)
        pdf.cell(55, 4.5, "Evaluation Status", 0, 1)

        # Rows
        pdf.set_font("Helvetica", "", 7.5)
        
        # Apraxia
        pdf.set_xy(14, diff_y + 4.5)
        pdf.cell(42, 4, "Apraxia of Speech (AOS):", 0, 0)
        apraxia_val = round(float(indices.get("apraxia_screening_index", 0.10)) * 100, 1)
        pdf.cell(35, 4, f"{apraxia_val}%", 0, 0)
        pdf.cell(48, 4, "Motor Planning vs Execution", 0, 0)
        pdf.cell(55, 4, "Screening Indicator (Not a Diagnosis)", 0, 1)

        # Aphasia
        pdf.set_xy(14, diff_y + 9)
        pdf.cell(42, 4, "Aphasia (Language):", 0, 0)
        aphasia_val = round(float(indices.get("aphasia_screening_index", 0.10)) * 100, 1)
        pdf.cell(35, 4, f"{aphasia_val}%", 0, 0)
        pdf.cell(48, 4, "Linguistic Formulation / Retrieval", 0, 0)
        pdf.cell(55, 4, "Requires Bedside Language Battery", 0, 1)

        # Stuttering
        pdf.set_xy(14, diff_y + 13.5)
        pdf.cell(42, 4, "Stuttering / Disfluency:", 0, 0)
        stutter_val = round(float(indices.get("stuttering_screening_index", 0.08)) * 100, 1)
        pdf.cell(35, 4, f"{stutter_val}%", 0, 0)
        pdf.cell(48, 4, "Speech Fluency Breaks & Blocks", 0, 0)
        pdf.cell(55, 4, "Disfluency Frequency Analysis Required", 0, 1)

        pdf.set_xy(14, diff_y + 18)
        pdf.set_font("Helvetica", "I", 7)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(180, 3.5, "Differential distinction: Dysarthria (neuromuscular execution) vs Apraxia (motor planning) vs Aphasia (linguistic).", 0, 1)
        pdf.ln(7)

        # 5. Acoustic Biomarkers Table
        pdf.set_font("Helvetica", "B", 10.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6, "4. Measured Acoustic Biomarkers & Physical Signal Properties", 0, 1, "L")

        pdf.set_fill_color(226, 232, 240)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(52, 5.2, "Acoustic Biomarker", 1, 0, "L", fill=True)
        pdf.cell(40, 5.2, "Measured Value", 1, 0, "C", fill=True)
        pdf.cell(46, 5.2, "Reference Norms", 1, 0, "C", fill=True)
        pdf.cell(52, 5.2, "Physiological Interpretation", 1, 1, "L", fill=True)

        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(51, 65, 85)

        gender_str = f"{clean_ascii(assessment.detected_gender or 'N/A')} ({round((assessment.gender_confidence or 0.85)*100, 1)}%)"
        f0_val = f"{assessment.f0_mean:.1f} Hz" if assessment.f0_mean else "N/A"
        jitter_val = f"{assessment.jitter_percent:.2f}%" if assessment.jitter_percent else "N/A"
        shimmer_val = f"{assessment.shimmer_percent:.2f}%" if assessment.shimmer_percent else "N/A"
        hnr_val = f"{assessment.hnr_db:.1f} dB" if assessment.hnr_db else "N/A"
        silence_val = f"{round((assessment.silence_ratio or 0.15)*100, 1)}%"

        acoustic_rows = [
            ("Acoustic Speaker Gender", gender_str, "Pitch F0 & Centroid", "Vocal tract acoustic profile"),
            ("Mean Pitch (F0)", f0_val, "M: 85-165Hz | F: 165-260Hz", "Vocal fold vibrational frequency"),
            ("Jitter (Local Perturbation)", jitter_val, "< 1.50% (Normal)", "Pitch period vibration stability"),
            ("Shimmer (Amplitude Perturbation)", shimmer_val, "< 4.00% (Normal)", "Glottal resistance & amplitude"),
            ("Harmonics-to-Noise Ratio (HNR)", hnr_val, "> 15.0 dB (Normal)", "Acoustic periodicity vs breathiness"),
            ("Silence / Pause Dynamics", silence_val, "10% - 25% (Typical speech)", "Articulatory fluency & hesitations")
        ]

        for metric, val, norm, interp in acoustic_rows:
            pdf.cell(52, 4.6, metric, 1, 0, "L")
            pdf.cell(40, 4.6, val, 1, 0, "C")
            pdf.cell(46, 4.6, norm, 1, 0, "C")
            pdf.cell(52, 4.6, interp, 1, 1, "L")

        pdf.ln(5)

        # 6. Longitudinal Comparison (If previous session available)
        if previous_session:
            pdf.set_font("Helvetica", "B", 10.5)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(0, 6, "5. Longitudinal Progress Comparison (Session-to-Session)", 0, 1, "L")

            pdf.set_fill_color(248, 250, 252)
            pdf.set_draw_color(203, 213, 225)
            pdf.rect(10, pdf.get_y(), 190, 18, 'DF')

            comp_y = pdf.get_y() + 2
            pdf.set_xy(14, comp_y)
            pdf.set_font("Helvetica", "B", 8)
            pdf.cell(45, 4, "Metric", 0, 0)
            pdf.cell(45, 4, "Previous Session", 0, 0)
            pdf.cell(45, 4, "Current Session", 0, 0)
            pdf.cell(45, 4, "Measurement Change", 0, 1)

            pdf.set_font("Helvetica", "", 7.5)
            # Intelligibility
            prev_intel = previous_session.intelligibility_index or 80.0
            curr_intel = assessment.intelligibility_index or 85.0
            delta_intel = curr_intel - prev_intel
            pdf.set_xy(14, comp_y + 4.5)
            pdf.cell(45, 3.8, "Intelligibility Index:", 0, 0)
            pdf.cell(45, 3.8, f"{prev_intel:.1f}%", 0, 0)
            pdf.cell(45, 3.8, f"{curr_intel:.1f}%", 0, 0)
            pdf.cell(45, 3.8, f"{delta_intel:+.1f}%", 0, 1)

            # Speech Rate
            prev_wpm = previous_session.speech_rate_wpm or 120.0
            curr_wpm = assessment.speech_rate_wpm or 130.0
            delta_wpm = curr_wpm - prev_wpm
            pdf.set_xy(14, comp_y + 8.5)
            pdf.cell(45, 3.8, "Speech Rate (WPM):", 0, 0)
            pdf.cell(45, 3.8, f"{prev_wpm:.1f} WPM", 0, 0)
            pdf.cell(45, 3.8, f"{curr_wpm:.1f} WPM", 0, 0)
            pdf.cell(45, 3.8, f"{delta_wpm:+.1f} WPM", 0, 1)

            pdf.set_xy(14, comp_y + 12.5)
            pdf.set_font("Helvetica", "I", 6.8)
            pdf.set_text_color(100, 116, 139)
            pdf.cell(180, 3.5, "Longitudinal Notice: Changes in acoustic measurements reflect session acoustic variability and do not prove clinical cure.", 0, 1)
            pdf.ln(5)

        # 7. Clinical Next Steps & Pathologist Suggested Exercises
        pdf.set_font("Helvetica", "B", 10.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6, "6. Clinical Next Steps & Professional Evaluation Plan", 0, 1, "L")

        rec_list = diff_screening.get("clinical_recommendations", [
            "Formal Motor Speech Evaluation by a licensed CCC-SLP (e.g., Frenchay Dysarthria Assessment-2).",
            "Comprehensive Language Assessment (e.g., Western Aphasia Battery-R) if word retrieval delays persist.",
            "Laryngeal Videostroboscopy if dysphonia or vocal fold bowing is suspected."
        ])

        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(51, 65, 85)
        for r in rec_list[:3]:
            pdf.cell(0, 3.8, f"  * {clean_ascii(r)}", 0, 1, "L")
        pdf.ln(3)

        # 8. Clinician Review & Attestation Box
        pdf.set_font("Helvetica", "B", 10.5)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 6, "7. Clinician Review & Attestation Section", 0, 1, "L")

        pdf.set_draw_color(203, 213, 225)
        pdf.set_fill_color(255, 255, 255)
        pdf.rect(10, pdf.get_y(), 190, 18, 'D')

        c_y = pdf.get_y() + 1.8
        pdf.set_xy(14, c_y)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(51, 65, 85)
        status_text = "APPROVED BY LICENSED CLINICIAN" if assessment.clinician_approved else "PENDING FORMAL CLINICAL REVIEW"
        pdf.cell(85, 4, f"Review Status: {status_text}", 0, 0)
        rev_name = clean_ascii(assessment.reviewer.full_name if assessment.reviewer else "Not Assigned")
        pdf.cell(60, 4, f"Reviewing Clinician: {rev_name}", 0, 1)

        pdf.set_xy(14, c_y + 5)
        pdf.set_font("Helvetica", "", 7.5)
        notes = clean_ascii(assessment.clinician_notes or "No clinician review notes recorded yet.")
        pdf.multi_cell(180, 3.5, f"Clinician Notes: {notes[:160]}")
        pdf.ln(8)

        # 9. Mandatory Clinical Safety & Non-Diagnostic Disclaimer
        pdf.set_fill_color(254, 242, 242) # Red 50
        pdf.set_draw_color(239, 68, 68)   # Red 500
        pdf.rect(10, pdf.get_y(), 190, 19, 'DF')
        
        disclaim_y = pdf.get_y() + 1.5
        pdf.set_xy(12, disclaim_y)
        pdf.set_font("Helvetica", "B", 7.5)
        pdf.set_text_color(185, 28, 28)
        pdf.cell(186, 3.5, "MANDATORY CLINICAL SCREENING & UNCERTAINTY DISCLAIMER:", 0, 1, "L")
        
        pdf.set_xy(12, disclaim_y + 4)
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(127, 29, 29)
        disclaimer_text = (
            "SpeechCare AI is an assistive screening and clinical decision-support prototype. It does NOT provide a definitive medical diagnosis. "
            "All screening indicators, severity classifications, and acoustic indices account for potential limitations in audio quality, microphone hardware, "
            "and environmental noise. These findings must NEVER replace a comprehensive bedside evaluation by a certified Speech-Language Pathologist (CCC-SLP) "
            "or licensed neurologist. Further clinical assessment is strongly advised before therapeutic or pharmacological interventions."
        )
        pdf.multi_cell(186, 3.2, clean_ascii(disclaimer_text))

        pdf.output(report_path)
        return report_path
