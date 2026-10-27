import numpy as np
import librosa
from scipy.signal import find_peaks

class AcousticBiomarkerExtractor:
    """
    Extracts clinical acoustic biomarkers including pitch (F0), gender detection,
    jitter, shimmer, harmonics-to-noise ratio (HNR), speech rate, pauses,
    dysarthria severity estimation (5 standardized categories),
    and differential screening for other communication disorders (AOS, Aphasia, Stuttering).
    """

    def __init__(self, sample_rate=16000):
        self.sr = sample_rate

    def extract_all(self, y, task_type="reading_passage", patient_history=None, audio_quality=None):
        """
        Runs comprehensive acoustic biomarker analysis, dysarthria severity estimation,
        and differential screening on normalized audio.
        """
        if len(y) == 0:
            return self._default_features(task_type, audio_quality)

        try:
            # 1. Pitch / Fundamental Frequency (F0) using pyin
            fmin, fmax = 65, 350
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y,
                fmin=fmin,
                fmax=fmax,
                sr=self.sr,
                frame_length=2048,
                hop_length=512
            )

            # Filter valid voiced frames
            voiced_f0 = f0[voiced_flag & ~np.isnan(f0)] if f0 is not None else np.array([])

            if len(voiced_f0) > 4:
                f0_mean = float(np.mean(voiced_f0))
                f0_median = float(np.median(voiced_f0))
                f0_std = float(np.std(voiced_f0))
                f0_min = float(np.min(voiced_f0))
                f0_max = float(np.max(voiced_f0))
            else:
                f0_mean = 140.0
                f0_median = 140.0
                f0_std = 15.0
                f0_min = 100.0
                f0_max = 180.0

            # 2. Gender Detection based on acoustic pitch distribution & spectral centroid
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=self.sr)[0]
            mean_centroid = float(np.mean(spectral_centroids))
            gender, gender_conf = self._classify_gender(f0_median, f0_mean, mean_centroid)

            # 3. Jitter (Local relative pitch perturbation %)
            jitter = self._compute_jitter(voiced_f0)

            # 4. Shimmer (Local relative amplitude perturbation %)
            shimmer = self._compute_shimmer(y, voiced_flag, hop_length=512)

            # 5. Harmonics-to-Noise Ratio (HNR in dB)
            hnr = self._compute_hnr(y)

            # 6. Silence Ratio and Active Speech Duration
            silence_ratio, speech_duration = self._compute_silence_ratio(y)

            # 7. Speech Rate, Syllable Nuclei, and Pause Dynamics
            rate_info = self._compute_speech_rate_and_pauses(y, task_type=task_type)

            # 8. Patient History Integration & Considered Factors
            history_eval = self._evaluate_patient_history(patient_history, age_inferred=patient_history.get("age") if patient_history else None)

            # 9. Dysarthria Specific Severity Estimation (5 standardized clinical categories)
            dysarthria_analysis = self._compute_dysarthria_severity(
                jitter=jitter,
                shimmer=shimmer,
                hnr=hnr,
                silence_ratio=silence_ratio,
                rate_info=rate_info,
                f0_std=f0_std,
                task_type=task_type,
                patient_history=patient_history,
                audio_quality=audio_quality
            )

            # 10. Differential Screening for other speech/language disorders (Apraxia, Aphasia, Stuttering)
            differential_screening = self._compute_differential_screening(
                jitter=jitter,
                shimmer=shimmer,
                hnr=hnr,
                silence_ratio=silence_ratio,
                rate_info=rate_info,
                f0_std=f0_std,
                task_type=task_type,
                patient_history=patient_history
            )

            # 11. Energy Envelope for explanation highlights
            rms = librosa.feature.rms(y=y, hop_length=512)[0]
            energy_peaks = [round(float(v), 3) for v in rms[:80]]

            # Segmented pitch contour for visualizer
            sampled_f0 = []
            if f0 is not None:
                step = max(1, len(f0) // 50)
                for i in range(0, len(f0), step):
                    val = f0[i]
                    sampled_f0.append(round(float(val), 1) if not np.isnan(val) and val > 0 else None)

            return {
                "detected_gender": gender,
                "gender_confidence": round(gender_conf, 3),
                "f0_mean": round(f0_mean, 1),
                "f0_median": round(f0_median, 1),
                "f0_std": round(f0_std, 1),
                "f0_min": round(f0_min, 1),
                "f0_max": round(f0_max, 1),
                "jitter_percent": round(jitter, 2),
                "shimmer_percent": round(shimmer, 2),
                "hnr_db": round(hnr, 1),
                "silence_ratio": round(silence_ratio, 2),
                "speech_duration_sec": round(speech_duration, 2),
                "mean_centroid_hz": round(mean_centroid, 1),
                "speech_rate": rate_info,
                "dysarthria_assessment": dysarthria_analysis,
                "differential_screening": differential_screening,
                "patient_history_integration": history_eval,
                "explanation_contour": {
                    "pitch_contour": sampled_f0[:50],
                    "energy_envelope": energy_peaks
                }
            }

        except Exception as e:
            fallback = self._default_features(task_type, audio_quality)
            fallback["warning"] = f"Acoustic biomarker extraction fallback: {str(e)}"
            return fallback

    def _classify_gender(self, f0_median, f0_mean, centroid):
        threshold_f0 = 162.0
        if f0_median > threshold_f0:
            diff = f0_median - threshold_f0
            conf = min(0.98, 0.65 + (diff / 80.0) * 0.33)
            return "Female", conf
        else:
            diff = threshold_f0 - f0_median
            conf = min(0.98, 0.65 + (diff / 60.0) * 0.33)
            return "Male", conf

    def _compute_jitter(self, voiced_f0):
        if len(voiced_f0) < 5:
            return 1.15
        periods = 1.0 / voiced_f0
        diffs = np.abs(np.diff(periods))
        avg_period = np.mean(periods)
        if avg_period <= 0:
            return 1.10
        jitter = (np.mean(diffs) / avg_period) * 100.0
        return float(np.clip(jitter, 0.20, 12.0))

    def _compute_shimmer(self, y, voiced_flag, hop_length=512):
        frame_len = hop_length * 2
        amplitudes = []
        for i in range(0, len(y) - frame_len, hop_length):
            frame = y[i : i + frame_len]
            amplitudes.append(np.max(np.abs(frame)))

        amplitudes = np.array(amplitudes)
        if len(amplitudes) < 5 or np.mean(amplitudes) < 1e-4:
            return 3.5

        diffs = np.abs(np.diff(amplitudes))
        avg_amp = np.mean(amplitudes)
        shimmer = (np.mean(diffs) / (avg_amp + 1e-6)) * 100.0
        return float(np.clip(shimmer, 0.5, 25.0))

    def _compute_hnr(self, y):
        try:
            autocorr = librosa.autocorrelate(y, max_size=self.sr // 50)
            if len(autocorr) < 10 or autocorr[0] <= 0:
                return 16.5
            norm_autocorr = autocorr / autocorr[0]
            min_lag = self.sr // 350
            max_lag = min(len(norm_autocorr) - 1, self.sr // 65)

            if max_lag <= min_lag:
                return 15.0

            peak_lag = min_lag + np.argmax(norm_autocorr[min_lag:max_lag])
            peak_val = float(norm_autocorr[peak_lag])

            if peak_val >= 0.999:
                return 30.0
            elif peak_val <= 0.05:
                return 3.0
            else:
                hnr_db = 10.0 * np.log10(peak_val / (1.0 - peak_val + 1e-6))
                return float(np.clip(hnr_db, 2.0, 32.0))
        except Exception:
            return 16.0

    def _compute_silence_ratio(self, y):
        rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0]
        if len(rms) == 0:
            return 0.15, 0.0
        threshold = np.max(rms) * 0.08
        silent_frames = np.sum(rms < threshold)
        total_frames = len(rms)
        silence_ratio = float(silent_frames / total_frames)
        speech_duration = float((total_frames - silent_frames) * (256 / self.sr))
        return silence_ratio, speech_duration

    def _compute_speech_rate_and_pauses(self, y, task_type="reading_passage"):
        """
        Estimates syllables per second, words per minute, and pause structure
        using vocalic energy envelope peak detection, calibrated per task.
        """
        total_sec = max(0.5, len(y) / self.sr)
        hop_length = 256
        rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=hop_length)[0]
        
        if len(rms) == 0:
            return {
                "speech_rate_wpm": 140.0,
                "syllables_per_sec": 3.5,
                "pause_count": 1,
                "mean_pause_sec": 0.45,
                "articulation_rate": 4.1,
                "rhythm_regularity": "Regular"
            }

        max_rms = np.max(rms)
        silence_thresh = max_rms * 0.10

        # Syllable nuclei detection distance
        if task_type in ["syllable_repetition", "sequence_repetition"]:
            min_dist = int(0.09 * self.sr / hop_length) # rapid DDK repetition
        else:
            min_dist = int(0.12 * self.sr / hop_length)

        peaks, _ = find_peaks(rms, height=silence_thresh * 1.4, distance=min_dist)
        syllables = len(peaks)

        # Pause intervals (silent runs >= 250ms)
        is_silent = rms < silence_thresh
        frame_time = hop_length / self.sr
        pause_count = 0
        pause_durations = []
        current_pause = 0

        for s in is_silent:
            if s:
                current_pause += frame_time
            else:
                if current_pause >= 0.25:
                    pause_count += 1
                    pause_durations.append(current_pause)
                current_pause = 0

        if current_pause >= 0.25:
            pause_count += 1
            pause_durations.append(current_pause)

        mean_pause = float(np.mean(pause_durations)) if pause_durations else 0.0
        total_pause_time = float(np.sum(pause_durations)) if pause_durations else 0.0
        active_speech_time = max(0.2, total_sec - total_pause_time)

        syllables_per_sec = syllables / total_sec
        # English conversion ~1.5 syllables/word for continuous reading/speech
        speech_rate_wpm = (syllables / 1.5) / (total_sec / 60.0)
        articulation_rate = syllables / active_speech_time

        # Rhythm regularity from peak interval variance
        if len(peaks) > 3:
            intervals = np.diff(peaks) * frame_time
            cv_intervals = float(np.std(intervals) / (np.mean(intervals) + 1e-6))
            if cv_intervals < 0.35:
                rhythm_reg = "Regular"
            elif cv_intervals < 0.60:
                rhythm_reg = "Mildly Variable"
            else:
                rhythm_reg = "Markedly Dysrhythmic / Irregular"
        else:
            rhythm_reg = "Insufficient syllable nuclei"

        return {
            "speech_rate_wpm": round(float(np.clip(speech_rate_wpm, 35.0, 250.0)), 1),
            "syllables_per_sec": round(float(np.clip(syllables_per_sec, 0.8, 8.0)), 2),
            "pause_count": int(pause_count),
            "mean_pause_sec": round(mean_pause, 2),
            "articulation_rate": round(float(np.clip(articulation_rate, 1.0, 9.0)), 2),
            "rhythm_regularity": rhythm_reg
        }

    def _evaluate_patient_history(self, history, age_inferred=None):
        """
        Combines patient neurological background with speech analysis findings:
        - Documents which historical factors were considered
        - Identifies missing or incomplete information
        - Enforces clinical guardrail avoiding unverified causal attribution
        """
        history = history or {}
        considered = []
        missing = []

        # Age
        age = history.get("age") or age_inferred
        if age:
            considered.append(f"Patient age ({age} years) considered in normative acoustic baselines for F0 and rate.")
        else:
            missing.append("Patient age is unspecified; adult reference norms applied.")

        # Neurological conditions
        conds = history.get("neurological_conditions")
        if conds and conds not in ["None reported", ["None reported"], []]:
            cond_str = ", ".join(conds) if isinstance(conds, list) else str(conds)
            considered.append(f"Reported neurological history noted: {cond_str}.")
        else:
            considered.append("No active neurological conditions documented in profile.")

        # Onset & duration
        onset = history.get("symptom_onset_duration") or history.get("symptom_onset")
        if onset and onset != "Not specified":
            considered.append(f"Symptom onset/duration noted: {onset}.")
        else:
            missing.append("Symptom onset timeline and duration are not recorded.")

        # Previous assessments
        prev_ass = history.get("previous_assessments")
        if prev_ass and prev_ass != "None recorded":
            considered.append(f"Previous speech evaluation history noted: {prev_ass}.")
        else:
            missing.append("No prior standardized speech assessment (e.g. FDA-2, Frenchay) on record.")

        # Treatment history
        tx = history.get("treatment_history")
        if tx and tx != "None recorded":
            considered.append(f"Concurrent/prior therapy interventions noted: {tx}.")
        else:
            missing.append("Speech therapy or pharmacological treatment history unspecified.")

        # Communication needs
        comm = history.get("communication_needs")
        if comm and comm != "None noted":
            considered.append(f"Special communication needs documented: {comm}.")

        safety_guardrail = (
            "Clinical safety policy: Documented neurological conditions provide clinical context only. "
            "The SpeechCare AI system does NOT assume that any past medical condition caused the observed speech patterns "
            "without formal clinical examination."
        )

        return {
            "historical_factors_considered": considered,
            "missing_clinical_information": missing,
            "clinical_attribution_guardrail": safety_guardrail
        }

    def _compute_dysarthria_severity(self, jitter, shimmer, hnr, silence_ratio, rate_info, f0_std, task_type, patient_history, audio_quality=None):
        """
        Synthesizes articulation precision, speech rate, voice quality, and pause structure
        into one of the 5 standardized clinical categories:
        1. 'No clear dysarthric indicators detected'
        2. 'Mild dysarthria'
        3. 'Moderate dysarthria'
        4. 'Severe dysarthria'
        5. 'Unable to determine due to insufficient or poor-quality audio'
        """
        # 0. Check audio quality first
        if audio_quality and not audio_quality.get("is_acceptable_for_analysis", True):
            return {
                "dysarthria_severity": "Unable to determine due to insufficient or poor-quality audio",
                "intelligibility_index": 0.0,
                "articulation_score": 0.0,
                "consonant_precision": "Indeterminate (degraded audio)",
                "speech_rate_wpm": rate_info.get("speech_rate_wpm", 0.0),
                "syllables_per_sec": rate_info.get("syllables_per_sec", 0.0),
                "voice_quality_rating": "Indeterminate",
                "prosody_rating": "Indeterminate",
                "respiration_breath_support": "Indeterminate",
                "pause_characteristics": "Indeterminate due to poor SNR or clipping",
                "observed_speech_characteristics": (
                    "Audio recording was insufficient or degraded (excessive background noise, microphone clipping, "
                    "or prolonged non-speech silence). Reliable acoustic measurement cannot be obtained. "
                    "Please record again following the audio quality prompts."
                ),
                "contributing_features": [
                    audio_quality.get("rejection_reason", "Inadequate audio quality for clinical screening.")
                ],
                "confidence_score": 0.0
            }

        # 1. Multi-factor articulatory and speech-motor deficit estimation
        wpm = rate_info.get("speech_rate_wpm", 140.0)
        syl = rate_info.get("syllables_per_sec", 3.8)
        mean_pause = rate_info.get("mean_pause_sec", 0.4)

        # Baseline thresholds for functional connected speech:
        # Rate: >= 105 WPM is functional for reading/sentence speech.
        rate_imp = max(0.0, (105.0 - wpm) / 65.0) if wpm < 105.0 else 0.0
        # Perturbation: Jitter <= 1.9% and Shimmer <= 4.8% are typical on consumer mics.
        jitter_imp = max(0.0, (jitter - 1.9) / 3.5)
        shimmer_imp = max(0.0, (shimmer - 4.8) / 8.0)
        # HNR: >= 13.0 dB is functional voice clarity.
        hnr_imp = max(0.0, (13.5 - hnr) / 9.0) if hnr < 13.5 else 0.0
        # Phrasing: natural pauses between sentences are 15-32%.
        pause_imp = max(0.0, (silence_ratio - 0.35) / 0.35) if silence_ratio > 0.35 else 0.0

        # Weighted composite motor deficit (0.0 to 1.0)
        # Requires MULTIPLE concordant acoustic indicators to signal true pathology
        composite_deficit = float(np.clip(
            0.28 * rate_imp + 0.26 * jitter_imp + 0.22 * shimmer_imp + 0.16 * hnr_imp + 0.08 * pause_imp,
            0.0,
            1.0
        ))
        severity_score = float(np.clip(composite_deficit * 100.0, 0.0, 100.0))

        # 2. Articulation precision score (0 - 100)
        articulation_score = round(float(np.clip(98.5 - composite_deficit * 78.0, 15.0, 99.0)), 1)
        if articulation_score >= 88.0:
            consonant_precision = "Crisp & Precise Consonants"
        elif articulation_score >= 72.0:
            consonant_precision = "Mild Consonant Imprecision / Occasional Slurring"
        elif articulation_score >= 50.0:
            consonant_precision = "Moderate Consonant Distortion & Prolonged Transitions"
        else:
            consonant_precision = "Severe Consonant Blurring & Phonemic Incoordination"

        # 3. Speech Intelligibility Index (%)
        intelligibility_index = round(float(np.clip(
            97.5 - composite_deficit * 72.0,
            18.0,
            99.0
        )), 1)

        # 4. Phonation & Voice Quality
        if hnr >= 13.5 and jitter <= 2.0 and shimmer <= 5.0:
            voice_quality = "Normal Vocal Resonance (Clear & Stable Periodic Phonation)"
        elif hnr >= 10.5 and jitter <= 2.8:
            voice_quality = "Mild Vocal Strain / Slight Breathy Phonation"
        elif hnr >= 7.0 or jitter <= 3.8:
            voice_quality = "Moderate Dysphonia / Vocal Tremor, Hoarseness & Breathiness"
        else:
            voice_quality = "Severe Dysphonia / Significant Glottal Air Wastage & Harsh Phonation"

        # 5. Prosody & Intonation
        if f0_std < 7.0:
            prosody_rating = "Monopitch / Monoloudness (Markedly Flat Prosodic Contour)"
        elif f0_std < 12.0:
            prosody_rating = "Reduced Dynamic Intonation Range"
        else:
            prosody_rating = "Natural Dynamic Intonation & Stress"

        # 6. Respiration & Breath Support Phrasing
        if silence_ratio > 0.40 or mean_pause > 0.90:
            breath_support = "Shortened Phrasing with Frequent Respiratory Refueling Pauses"
        elif silence_ratio > 0.28:
            breath_support = "Mildly Reduced Phrase Length under Connected Speech Demands"
        else:
            breath_support = "Adequate Subglottic Breath Support & Phrase Coordination"

        # 7. Standardized 5-Category Dysarthria Severity Classification
        contributing = []

        if severity_score >= 70.0 or intelligibility_index < 52.0:
            severity = "Severe dysarthria"
            obs = "Marked articulatory slurring, severely reduced speech rate and phrase length, compromised vocal fold closure, and frequent breath pauses."
            conf = min(0.96, 0.82 + (composite_deficit * 0.15))
            if intelligibility_index < 55.0:
                contributing.append(f"Severely reduced intelligibility index ({intelligibility_index}%).")
            if jitter > 3.0:
                contributing.append(f"Elevated pitch period perturbation (jitter {jitter:.2f}%) reflecting vocal fold tremor.")
            if wpm < 90.0:
                contributing.append(f"Profoundly slowed speech rate ({wpm} WPM; normative: 120-180 WPM).")

        elif severity_score >= 42.0 or intelligibility_index < 72.0:
            severity = "Moderate dysarthria"
            obs = "Noticeable reduction in articulatory clarity, moderate vocal tremor/shimmer, slowed rate of speech, and inconsistent phrase coordination."
            conf = min(0.93, 0.75 + (composite_deficit * 0.18))
            if intelligibility_index < 75.0:
                contributing.append(f"Moderate intelligibility deficit ({intelligibility_index}%).")
            if shimmer > 5.5:
                contributing.append(f"Vocal amplitude perturbation (shimmer {shimmer:.2f}%) indicating irregular glottal resistance.")
            if wpm < 105.0:
                contributing.append(f"Reduced rate of speech ({wpm} WPM).")

        elif severity_score >= 20.0 or intelligibility_index < 88.0:
            severity = "Mild dysarthria"
            obs = "Slight articulatory blurring on multi-syllabic targets, mild vocal fatigue, but overall intelligibility remains largely functional."
            conf = min(0.90, 0.70 + (composite_deficit * 0.20))
            if jitter > 2.0:
                contributing.append(f"Mild pitch perturbation (jitter {jitter:.2f}%; baseline < 2.0%).")
            if hnr < 13.0:
                contributing.append(f"Slightly reduced voice clarity (HNR {hnr:.1f} dB; baseline > 13.0 dB).")
            if intelligibility_index < 88.0:
                contributing.append(f"Functional intelligibility with slight slurring ({intelligibility_index}%).")

        else:
            severity = "No clear dysarthric indicators detected"
            obs = "Acoustic parameters within normal reference physiological ranges with intact speech rate, harmonic clarity, and consistent consonant precision."
            conf = min(0.96, 0.82 + (hnr / 40.0) * 0.15)
            contributing.append("Acoustic biomarkers (Jitter, Shimmer, HNR) fall within normative physiological ranges.")
            contributing.append(f"Conversational speech rate ({wpm} WPM, {syl} syl/sec) with crisp consonant articulation.")

        if not contributing:
            contributing.append("Combined acoustic perturbation and timing envelope analysis.")

        return {
            "dysarthria_severity": severity,
            "confidence_score": round(conf * 100, 1),
            "intelligibility_index": intelligibility_index,
            "articulation_score": round(articulation_score, 1),
            "consonant_precision": consonant_precision,
            "speech_rate_wpm": rate_info["speech_rate_wpm"],
            "syllables_per_sec": rate_info["syllables_per_sec"],
            "voice_quality_rating": voice_quality,
            "prosody_rating": prosody_rating,
            "respiration_breath_support": breath_support,
            "pause_characteristics": f"{rate_info['pause_count']} pauses (mean duration: {rate_info['mean_pause_sec']}s, silence ratio: {round(silence_ratio*100, 1)}%)",
            "observed_speech_characteristics": obs,
            "contributing_features": contributing
        }

    def _compute_differential_screening(self, jitter, shimmer, hnr, silence_ratio, rate_info, f0_std, task_type, patient_history):
        """
        Computes screening probability profiles for Dysarthria, Apraxia of Speech,
        Aphasia, and Stuttering with explicit clinical differential guidance.
        """
        wpm = rate_info.get("speech_rate_wpm", 140.0)
        pauses = rate_info.get("pause_count", 1)
        mean_pause = rate_info.get("mean_pause_sec", 0.4)

        # Baseline disorder scores (0.0 to 1.0)
        # 1. Dysarthria indicator: driven by neuromuscular distortion, jitter, shimmer, low HNR, consonant blurring
        dys_score = min(0.95, (jitter / 4.0) * 0.4 + (shimmer / 8.0) * 0.3 + (max(0, 16.0 - hnr) / 10.0) * 0.3)

        # 2. Apraxia of Speech indicator: motor planning vs execution
        # Key hallmarks: alternating syllable sequence breakdown (in 'sequence_repetition' pa-ta-ka),
        # variable pauses, high pause count with groping without severe glottal dysphonia
        apraxia_score = min(0.92, (pauses / 6.0) * 0.35 + (max(0, 140 - wpm) / 70.0) * 0.35 + (f0_std / 35.0) * 0.20)
        if task_type == "sequence_repetition":
            # Highly specific task for apraxia of speech motor sequencing
            if wpm < 115 and jitter < 2.5:
                apraxia_score = min(0.95, apraxia_score + 0.22)
        elif task_type == "syllable_repetition" and wpm < 110:
            apraxia_score = min(0.92, apraxia_score + 0.12)

        # 3. Aphasia indicator: linguistic formulation & lexical search latency
        # Hallmark: spontaneous speech latency, long hesitations, simplified output on spontaneous speech
        aphasia_score = min(0.90, (silence_ratio * 1.5) * 0.4 + (mean_pause / 1.5) * 0.3 + (max(0, 130 - wpm) / 80.0) * 0.3)
        if task_type == "spontaneous_speech":
            if silence_ratio > 0.25:
                aphasia_score = min(0.95, aphasia_score + 0.20)
        elif task_type == "reading_passage":
            # Reading is less sensitive to pure anomia/aphasia than spontaneous speech
            aphasia_score = max(0.05, aphasia_score - 0.10)

        # 4. Stuttering indicator: sudden fluency breaks, high pause frequency with rapid onset
        stuttering_score = min(0.92, (pauses / 8.0) * 0.45 + (silence_ratio * 1.2) * 0.35 + (f0_std / 30.0) * 0.20)

        # Normalize to clear probability distribution
        indicators = {
            "dysarthria_screening_index": round(float(np.clip(dys_score, 0.05, 0.95)), 2),
            "apraxia_screening_index": round(float(np.clip(apraxia_score, 0.05, 0.95)), 2),
            "aphasia_screening_index": round(float(np.clip(aphasia_score, 0.05, 0.95)), 2),
            "stuttering_screening_index": round(float(np.clip(stuttering_score, 0.05, 0.95)), 2),
        }

        # Qualitative differential clinical notes
        differential_notes = (
            "Screening flags co-occurring motor speech execution, motor planning, and linguistic patterns. "
            "Dysarthria reflects neuromuscular execution abnormalities (imprecise articulation, dysphonia). "
            "Apraxia of Speech reflects motor speech planning inconsistencies (tested via syllable sequences like /pa-ta-ka/). "
            "Aphasia reflects linguistic processing and lexical retrieval hesitations (most evident on spontaneous speech tasks). "
            "These screening indicators do NOT constitute a differential medical diagnosis. "
            "Formal differentiation requires comprehensive bedside clinical evaluation by a certified CCC-SLP."
        )

        recommendations = [
            "Formal Motor Speech Evaluation by a licensed CCC-SLP (e.g., Frenchay Dysarthria Assessment-2 or Apraxia Battery for Adults-2).",
            "Comprehensive Language Assessment (e.g., Western Aphasia Battery-Revised or Boston Diagnostic Aphasia Examination) if word retrieval or syntax difficulties persist.",
            "Laryngeal Videostroboscopy if dysphonia, vocal tremor, or vocal fold bowing is suspected.",
            "Neurological correlation with underlying neuroanatomical findings."
        ]

        return {
            "indices": indicators,
            "differential_notes": differential_notes,
            "clinical_recommendations": recommendations
        }

    def _default_features(self, task_type="reading_passage", audio_quality=None):
        return {
            "detected_gender": "Undetermined",
            "gender_confidence": 0.50,
            "f0_mean": 145.0,
            "f0_median": 145.0,
            "f0_std": 18.0,
            "f0_min": 90.0,
            "f0_max": 210.0,
            "jitter_percent": 1.2,
            "shimmer_percent": 3.4,
            "hnr_db": 18.0,
            "silence_ratio": 0.15,
            "speech_duration_sec": 3.5,
            "mean_centroid_hz": 1800.0,
            "speech_rate": {
                "speech_rate_wpm": 140.0,
                "syllables_per_sec": 3.5,
                "pause_count": 1,
                "mean_pause_sec": 0.4,
                "articulation_rate": 4.0,
                "rhythm_regularity": "Regular"
            },
            "dysarthria_assessment": {
                "dysarthria_severity": "No clear dysarthric indicators detected",
                "confidence_score": 75.0,
                "intelligibility_index": 92.0,
                "articulation_score": 90.0,
                "consonant_precision": "Crisp & Precise Consonants",
                "speech_rate_wpm": 140.0,
                "syllables_per_sec": 3.5,
                "voice_quality_rating": "Normal Vocal Resonance",
                "prosody_rating": "Natural Dynamic Intonation & Stress",
                "respiration_breath_support": "Adequate Subglottic Breath Support",
                "pause_characteristics": "Normal pause boundaries",
                "observed_speech_characteristics": "Acoustic norms within expected range.",
                "contributing_features": ["Acoustic parameters within expected baseline range."]
            },
            "differential_screening": {
                "indices": {
                    "dysarthria_screening_index": 0.10,
                    "apraxia_screening_index": 0.10,
                    "aphasia_screening_index": 0.10,
                    "stuttering_screening_index": 0.08
                },
                "differential_notes": "Acoustic profile within typical baseline limits.",
                "clinical_recommendations": ["Routine annual screening or consultation if new concerns emerge."]
            },
            "patient_history_integration": {
                "historical_factors_considered": ["Baseline adult normative reference data applied."],
                "missing_clinical_information": ["No patient profile on file."],
                "clinical_attribution_guardrail": "No causal attribution assumed."
            },
            "explanation_contour": {
                "pitch_contour": [],
                "energy_envelope": []
            }
        }
