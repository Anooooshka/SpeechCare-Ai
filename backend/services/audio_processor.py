import os
import math
import numpy as np
import soundfile as sf
import librosa
import av
import scipy.signal as signal
import scipy.ndimage as ndimage
from ..config import Config

class AudioProcessor:
    def __init__(self, target_sr=16000):
        self.target_sr = target_sr

    def _decode_with_av(self, file_path):
        """
        Fallback decoder using PyAV. Decodes any WebM, Opus, OGG, MP3, M4A, AAC,
        or FLAC stream and resamples to target_sr (16000 Hz) mono float32.
        """
        container = av.open(file_path)
        if len(container.streams.audio) == 0:
            raise ValueError("No audio stream found in the uploaded file.")

        audio_stream = container.streams.audio[0]
        resampler = av.AudioResampler(format='fltp', layout='mono', rate=self.target_sr)
        
        frames = []
        for packet in container.demux(audio_stream):
            for frame in packet.decode():
                for resampled_frame in resampler.resample(frame):
                    frames.append(resampled_frame.to_ndarray()[0])

        for resampled_frame in resampler.resample(None):
            frames.append(resampled_frame.to_ndarray()[0])

        container.close()

        if len(frames) == 0:
            return np.array([], dtype=np.float32), 0.0

        y = np.concatenate(frames)
        duration = float(len(y)) / float(self.target_sr)
        return y, duration

    def validate_audio_file(self, file_path):
        """
        Validates file existence, format readability, duration, and content limits.
        Supports WAV, MP3, OGG, WebM/Opus, M4A, FLAC, and AAC.
        Returns (is_valid, error_message, metadata)
        """
        if not os.path.exists(file_path):
            return False, "Audio file not found on server.", None

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            return False, "The uploaded audio file is empty (0 bytes).", None

        if file_size > Config.MAX_CONTENT_LENGTH:
            return False, f"File size exceeds maximum allowed ({Config.MAX_CONTENT_LENGTH // (1024*1024)}MB).", None

        duration = None
        orig_sr = 16000
        channels = 1

        # 1. Try standard soundfile info
        try:
            info = sf.info(file_path)
            duration = info.duration
            orig_sr = info.samplerate
            channels = info.channels
        except Exception:
            # 2. Try PyAV container inspection for WebM, Opus, M4A, etc.
            try:
                container = av.open(file_path)
                if len(container.streams.audio) > 0:
                    stream = container.streams.audio[0]
                    orig_sr = stream.rate or 16000
                    channels = stream.channels or 1
                    if stream.duration and stream.time_base:
                        duration = float(stream.duration * stream.time_base)
                    elif container.duration:
                        duration = float(container.duration) / float(av.time_base)
                    else:
                        # Fallback: quick partial decode to compute exact length
                        _, duration = self._decode_with_av(file_path)
                container.close()
            except Exception as e:
                try:
                    duration = librosa.get_duration(path=file_path)
                except Exception:
                    return False, f"Unable to decode audio file. Please ensure it is a valid audio recording (WAV, MP3, WebM, OGG). Details: {str(e)}", None

        if duration is None or duration < Config.MIN_AUDIO_DURATION_SEC:
            dur_display = f"{duration:.1f}s" if duration is not None else "0s"
            return False, f"Audio recording is too short ({dur_display}). Please record at least {Config.MIN_AUDIO_DURATION_SEC} seconds of speech.", None

        if duration > Config.MAX_AUDIO_DURATION_SEC:
            return False, f"Audio recording exceeds maximum allowed duration ({Config.MAX_AUDIO_DURATION_SEC}s).", None

        metadata = {
            "duration": float(duration),
            "file_size": file_size,
            "original_sr": orig_sr,
            "channels": channels
        }
        return True, None, metadata

    def analyze_audio_quality(self, y, sr=None):
        """
        Validates signal quality against clinical recording standards:
        - Detects excessive background noise (computes Signal-to-Noise Ratio SNR in dB)
        - Detects microphone clipping / saturation distortion
        - Detects long periods of silence and insufficient active speech
        - Detects inadequate duration
        Returns a structured quality dictionary with status and actionable warnings.
        """
        sr = sr or self.target_sr
        if len(y) == 0:
            return {
                "quality_status": "insufficient",
                "snr_db": 0.0,
                "is_clipped": False,
                "clipping_percent": 0.0,
                "silence_ratio": 1.0,
                "speech_duration_sec": 0.0,
                "warnings": ["Audio signal contains no speech data."],
                "is_acceptable_for_analysis": False,
                "rejection_reason": "Empty audio recording."
            }

        total_sec = len(y) / float(sr)
        warnings = []

        # 1. Clipping detection
        # Check samples exceeding 0.985 of normalized range
        clipped_count = int(np.sum(np.abs(y) >= 0.985))
        clipping_percent = float((clipped_count / len(y)) * 100.0)
        is_clipped = bool(clipping_percent > 0.5 or clipped_count > 80)

        if is_clipped:
            warnings.append(
                f"Audio clipping detected ({clipping_percent:.1f}% of samples saturated). "
                "The microphone input level was too loud. Please lower your microphone input volume or step back."
            )

        # 2. Frame-level RMS energy and SNR estimation
        hop_length = int(sr * 0.02)  # 20ms frames
        frame_len = int(sr * 0.04)   # 40ms frames
        rms_frames = []
        for i in range(0, len(y) - frame_len, hop_length):
            frame = y[i : i + frame_len]
            rms_val = np.sqrt(np.mean(frame**2))
            rms_frames.append(rms_val)

        rms_frames = np.array(rms_frames) if len(rms_frames) > 0 else np.array([0.0])
        max_rms = float(np.max(rms_frames)) if len(rms_frames) > 0 else 0.0

        if max_rms < 1e-4:
            return {
                "quality_status": "insufficient",
                "snr_db": 0.0,
                "is_clipped": False,
                "clipping_percent": 0.0,
                "silence_ratio": 1.0,
                "speech_duration_sec": 0.0,
                "warnings": ["Recording is completely silent. Please verify microphone connectivity and speak clearly."],
                "is_acceptable_for_analysis": False,
                "rejection_reason": "Silent audio signal."
            }

        # Estimate speech vs noise frames using percentile thresholding
        sorted_rms = np.sort(rms_frames)
        # Noise floor: lowest 15th percentile
        noise_idx = max(1, int(len(sorted_rms) * 0.15))
        noise_rms = float(np.mean(sorted_rms[:noise_idx])) + 1e-6
        # Speech activity: top 35%
        speech_idx = max(noise_idx + 1, int(len(sorted_rms) * 0.65))
        speech_rms = float(np.mean(sorted_rms[speech_idx:]))

        if noise_rms > 0.08 and (speech_rms / noise_rms) < 1.4:
            # Steady continuous vocalization (e.g., sustained vowel /ah/ or pure tone)
            # The entire signal is high energy with virtually no noise floor
            snr_db = 26.5
        else:
            snr_db = float(20.0 * np.log10(max(1e-6, speech_rms) / noise_rms))
            snr_db = float(np.clip(snr_db, 0.0, 50.0))

        # 3. Silence and Active Speech Ratio
        silence_thresh = max(1e-4, max_rms * 0.12)
        silent_frames = int(np.sum(rms_frames < silence_thresh))
        silence_ratio = float(silent_frames / len(rms_frames))
        speech_duration_sec = float((len(rms_frames) - silent_frames) * (hop_length / sr))

        if snr_db < 9.0:
            warnings.append(
                f"Excessive background noise detected (SNR: {snr_db:.1f} dB; clinical recommendation > 14 dB). "
                "Please record in a quieter room."
            )
        elif snr_db < 14.0:
            warnings.append(
                f"Moderate ambient noise present (SNR: {snr_db:.1f} dB). "
                "Screening precision may be slightly influenced."
            )

        if silence_ratio > 0.65:
            warnings.append(
                f"Recording contains prolonged silence ({silence_ratio*100:.0f}% non-speech). "
                "Please speak continuously during the task."
            )

        if speech_duration_sec < 1.0:
            warnings.append(
                f"Insufficient active speech detected ({speech_duration_sec:.1f}s). "
                "At least 1.5 seconds of sustained vocalization is recommended for reliable acoustic metrics."
            )

        # Overall quality determination
        if max_rms < 1e-3 or speech_duration_sec < 0.6 or (silence_ratio > 0.85 and total_sec > 2.5):
            quality_status = "insufficient"
            is_acceptable = False
            rejection_reason = "Audio lacks sufficient active speech for reliable acoustic biomarker analysis."
        elif snr_db < 7.5 or clipping_percent > 4.5:
            quality_status = "poor"
            is_acceptable = False
            rejection_reason = "Audio quality is inadequate due to severe background noise or microphone clipping."
        elif snr_db < 13.0 or is_clipped or silence_ratio > 0.55:
            quality_status = "acceptable"
            is_acceptable = True
            rejection_reason = None
        else:
            quality_status = "good"
            is_acceptable = True
            rejection_reason = None

        return {
            "quality_status": quality_status,
            "snr_db": round(snr_db, 1),
            "is_clipped": is_clipped,
            "clipping_percent": round(clipping_percent, 2),
            "silence_ratio": round(silence_ratio, 2),
            "speech_duration_sec": round(speech_duration_sec, 2),
            "warnings": warnings,
            "is_acceptable_for_analysis": is_acceptable,
            "rejection_reason": rejection_reason
        }

    def clean_and_isolate_voice(self, y, sr=None):
        """
        Deep clinical voice cleaner and background noise/music eliminator:
        1. 4th-order Butterworth bandpass (85 Hz to 7500 Hz): Eliminates sub-bass music rumble,
           subwoofer thumps, and 50/60 Hz electrical hum, as well as extreme high-frequency hiss.
        2. Harmonic-Percussive Source Separation (HPSS): Suppresses percussive drum beats,
           rhythmic clicks, and musical transients while preserving vocal formants.
        3. Adaptive Wiener Spectral Filter with 2D smoothing: Decision-directed a priori SNR
           estimation with continuous frequency-time smoothing and a minimum floor (0.08)
           to eliminate 'musical noise' chirping and watery distortions.
        4. Soft VAD Pause Gating: Silences residual background music/noise during non-speech pauses.
        5. Clean peak normalization.
        """
        sr = sr or self.target_sr
        if len(y) == 0:
            return y

        try:
            # 1. Bandpass filter: 85 Hz - 7500 Hz
            high_cutoff = min(7500.0, (sr / 2.0) - 200.0)
            sos = signal.butter(4, [85.0, high_cutoff], btype='bandpass', fs=sr, output='sos')
            y_filt = signal.sosfiltfilt(sos, y)

            # 2. Harmonic-Percussive Source Separation to suppress music beats & drums
            if len(y_filt) > 1024:
                try:
                    y_harm, y_perc = librosa.effects.hpss(y_filt, margin=1.2)
                    # Speech energy is mostly harmonic; attenuate percussive drums/clicks by 75%
                    y_speech = y_harm + 0.25 * y_perc
                except Exception:
                    y_speech = y_filt
            else:
                y_speech = y_filt

            # 3. Adaptive Wiener Filtering with Anti-Chirp Smoothing
            n_fft = 1024
            hop_length = 256
            D = librosa.stft(y_speech, n_fft=n_fft, hop_length=hop_length)
            mag, phase = np.abs(D), np.angle(D)

            # Estimate noise profile using lowest energy 15% frames
            frame_energies = np.mean(mag, axis=0)
            n_noise_frames = max(2, int(len(frame_energies) * 0.15))
            noise_indices = np.argsort(frame_energies)[:n_noise_frames]
            noise_psd = np.mean(mag[:, noise_indices]**2, axis=1, keepdims=True) + 1e-8

            sig_psd = mag**2
            gamma = sig_psd / noise_psd

            # Decision-directed a priori SNR estimation (Ephraim-Malah)
            alpha_dd = 0.90
            xi = np.zeros_like(gamma)
            prev_sig = np.maximum(mag[:, 0:1]**2 - noise_psd, 0.0)
            for t_idx in range(gamma.shape[1]):
                xi[:, t_idx:t_idx+1] = alpha_dd * (prev_sig / noise_psd) + (1.0 - alpha_dd) * np.maximum(gamma[:, t_idx:t_idx+1] - 1.0, 0.0)
                prev_sig = (xi[:, t_idx:t_idx+1] / (1.0 + xi[:, t_idx:t_idx+1]))**2 * sig_psd[:, t_idx:t_idx+1]

            # Wiener Gain matrix
            gain = xi / (1.0 + xi + 1e-6)

            # Smooth gain over 3x3 window in time & frequency to prevent watery musical noise
            gain = ndimage.uniform_filter(gain, size=(3, 3))

            # Maintain natural speech floor (beta = 0.08) so speech doesn't sound artificially chopped
            gain = np.clip(gain, 0.08, 1.0)

            clean_mag = mag * gain
            clean_D = clean_mag * np.exp(1j * phase)
            y_clean = librosa.istft(clean_D, hop_length=hop_length, length=len(y))

            # 4. Soft VAD Pause Gating (silence residual music and room hiss during inter-sentence pauses)
            frame_len = int(0.04 * sr)
            hop = int(0.02 * sr)
            rms_vals = [np.sqrt(np.mean(y_clean[i:i+frame_len]**2)) for i in range(0, len(y_clean) - frame_len, hop)]
            if len(rms_vals) > 0:
                max_r = max(rms_vals)
                if max_r > 1e-4:
                    vad_mask = np.ones(len(y_clean), dtype=np.float32)
                    for idx, r in enumerate(rms_vals):
                        start = idx * hop
                        end = min(len(y_clean), start + frame_len)
                        if r < max_r * 0.07:
                            vad_mask[start:end] = np.minimum(vad_mask[start:end], 0.10)
                    vad_mask = ndimage.gaussian_filter1d(vad_mask, sigma=int(0.025 * sr))
                    y_clean = y_clean * vad_mask

            # 5. Peak Normalization
            max_val = np.max(np.abs(y_clean))
            if max_val > 0:
                y_clean = (y_clean / (max_val + 1e-6)) * 0.95

            return y_clean.astype(np.float32)

        except Exception as e:
            # Fallback to normalized original if filtering encounters unexpected dimensions
            max_val = np.max(np.abs(y))
            if max_val > 0:
                return (y / max_val * 0.95).astype(np.float32)
            return y

    def load_and_preprocess(self, file_path, clean_noise=True):
        """
        Loads audio from any format (WAV, WebM, Opus, MP3, etc.),
        converts to 16 kHz mono, removes background music/noise via clean_and_isolate_voice,
        and trims excessive margin silence.
        Returns:
            y: clean, normalized 1D numpy array
            sr: sample rate (16000)
        """
        y = None
        # 1. Try standard librosa/soundfile loading
        try:
            y, sr = librosa.load(file_path, sr=self.target_sr, mono=True)
        except Exception:
            # 2. Fall back to PyAV universal decoder
            try:
                y, _ = self._decode_with_av(file_path)
                sr = self.target_sr
                
                # Also convert/re-save the file as a clean WAV so streaming and players work smoothly
                wav_path = os.path.splitext(file_path)[0] + ".wav"
                sf.write(wav_path, y, self.target_sr, format="WAV")
            except Exception as e:
                raise ValueError(f"Failed to decode audio with PyAV: {str(e)}")

        if len(y) == 0 or np.max(np.abs(y)) < 1e-4:
            raise ValueError("The audio signal is completely silent. Please speak into the microphone and try again.")

        # Voice Activity Detection (VAD) / Trim silence at margins
        trimmed_y, _ = librosa.effects.trim(y, top_db=28, frame_length=1024, hop_length=256)
        if len(trimmed_y) >= int(self.target_sr * 0.5):
            y = trimmed_y

        # Peak normalization on raw audio
        max_val = np.max(np.abs(y))
        if max_val > 0:
            y = y / (max_val + 1e-6) * 0.95

        # Isolate voice and remove background music / acoustic noise
        if clean_noise:
            y_clean = self.clean_and_isolate_voice(y, sr=self.target_sr)
            return y_clean, self.target_sr

        return y, self.target_sr

    def segment_audio(self, y, segment_sec=4.0, overlap_sec=2.0):
        """
        Segments audio into 4-second windows with 50% overlap.
        If shorter than segment_sec, pads symmetrically with silence or reflection.
        """
        seg_len = int(segment_sec * self.target_sr)
        hop_len = int((segment_sec - overlap_sec) * self.target_sr)

        if len(y) <= seg_len:
            pad_width = seg_len - len(y)
            padded = np.pad(y, (0, pad_width), mode='constant')
            return [padded]

        segments = []
        start = 0
        while start + seg_len <= len(y):
            segments.append(y[start : start + seg_len])
            start += hop_len

        # Include remaining tail if substantial (>1.5 sec)
        if len(y) - start >= int(1.5 * self.target_sr) and start < len(y):
            tail = y[start:]
            padded_tail = np.pad(tail, (0, seg_len - len(tail)), mode='constant')
            segments.append(padded_tail)

        return segments

    def extract_mel_spectrogram(self, y, n_mels=128, n_fft=1024, hop_length=256):
        """
        Computes log-Mel spectrogram matching research front-end specifications.
        """
        mel_spec = librosa.feature.melspectrogram(
            y=y,
            sr=self.target_sr,
            n_fft=n_fft,
            hop_length=hop_length,
            n_mels=n_mels,
            fmin=50,
            fmax=self.target_sr // 2
        )
        log_mel_spec = librosa.power_to_db(mel_spec, ref=np.max)
        return log_mel_spec

    def enhance_speech(self, y, output_path):
        """
        Applies high-fidelity voice isolation, background music removal,
        and anti-chirping spectral smoothing, then saves enhanced audio.
        """
        try:
            enhanced_y = self.clean_and_isolate_voice(y, sr=self.target_sr)
            sf.write(output_path, enhanced_y, self.target_sr, format="WAV")
            return output_path
        except Exception:
            # If enhancement fails, write normalized original
            sf.write(output_path, y, self.target_sr, format="WAV")
            return output_path

    def generate_waveform_peaks(self, y, num_peaks=100):
        """
        Downsamples waveform into min/max points for efficient, lightweight UI visualizer.
        """
        if len(y) == 0:
            return []
        step = max(1, len(y) // num_peaks)
        peaks = []
        for i in range(0, len(y), step):
            chunk = y[i : i + step]
            if len(chunk) > 0:
                peaks.append(round(float(np.max(np.abs(chunk))), 3))
        return peaks[:num_peaks]
