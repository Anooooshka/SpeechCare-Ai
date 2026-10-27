class ExerciseRecommender:
    """
    Provides evidence-based speech-language pathology (SLP) exercises tailored to
    the screening condition, severity level, and acoustic biomarker profile.
    All suggestions are clearly flagged as clinical guidance for professional review.
    """

    @staticmethod
    def get_recommendations(predicted_class, severity_band=None, biomarkers=None, task_type="reading_passage"):
        condition = (predicted_class or "review_required").lower()
        exercises = []

        if condition == "dysarthria":
            exercises = [
                {
                    "title": "Lee Silverman Voice Treatment (LSVT) Vocal Holds",
                    "category": "Respiration & Phonation",
                    "target": "Vocal loudness and sustained subglottic breath pressure",
                    "instructions": "Take a deep diaphragmatic breath through the abdomen. Produce an open /ah/ sound at a comfortably strong, conversational loudness. Sustain steadily for 10 to 15 seconds without straining.",
                    "frequency": "10 repetitions, 3 times daily",
                    "clinical_rationale": "Strengthens vocal fold adduction and supports subglottal respiratory drive commonly reduced in hypokinetic and flaccid dysarthria.",
                    "level": "Gentle to Moderate"
                },
                {
                    "title": "Structured Pacing & Rate Reduction",
                    "category": "Articulatory Intelligibility",
                    "target": "Syllable boundary separation and speech rate pacing",
                    "instructions": "Place your index finger on a tabletop. Tap once for each word or syllable while reading 4-word sentences aloud (e.g., 'The — sun — shines — bright'). Pause between each tap.",
                    "frequency": "5 minutes per session, twice daily",
                    "clinical_rationale": "Prevents accelerated articulatory blurring (festination) and enhances phoneme acoustic clarity.",
                    "level": "All Severities"
                },
                {
                    "title": "Over-Articulation Consonant Drills",
                    "category": "Articulatory Precision",
                    "target": "Lingual and labial articulatory range of motion",
                    "instructions": "Practice emphatic stop consonants in front of a mirror: /p/, /b/, /t/, /d/, /k/, /g/. Exaggerate lip closure on 'POP', 'TOP', 'CAKE'. Focus on crisp tactile sensation.",
                    "frequency": "8 repetitions per sound group",
                    "clinical_rationale": "Compensates for reduced articulatory excursion and acoustic formant transition slurring.",
                    "level": "Mild to Marked"
                },
                {
                    "title": "Abdominal-Diaphragmatic Inhalation Flow",
                    "category": "Respiratory Coordination",
                    "target": "Breath replenishment and phrase length planning",
                    "instructions": "Place one hand on your chest and one on your abdomen. Breathe in through your nose allowing only your abdomen to rise. Count aloud from 1 to 5 on a single exhalation.",
                    "frequency": "5 breath cycles prior to speaking tasks",
                    "clinical_rationale": "Reduces paradoxical clavicular breathing patterns often observed in motor speech deficits.",
                    "level": "Foundational"
                }
            ]

        elif condition == "stuttering":
            exercises = [
                {
                    "title": "Easy Vocal Onset (Gentle Phonation Initiation)",
                    "category": "Fluency Shaping",
                    "target": "Laryngeal tension reduction at phrase initiation",
                    "instructions": "Precede vowel-initial words with a soft, breathy /h/ sigh (e.g., 'h-apple', 'h-open', 'h-easy'). Gradually blend the whisper into phonation without abrupt vocal fold collision.",
                    "frequency": "15 words per practice block, 2 times daily",
                    "clinical_rationale": "Prevents hard glottal attacks and reduces laryngeal adductor spasm that precipitates sound blocks.",
                    "level": "Foundational"
                },
                {
                    "title": "Light Articulatory Contacts",
                    "category": "Fluency Shaping",
                    "target": "Minimizing oral-muscle pressure on consonants",
                    "instructions": "Produce plosive sounds (/p, b, t, d, k, g/) with feather-light contact of the lips or tongue against the palate. Avoid pressing hard. Feel the gentle airflow passing through.",
                    "frequency": "10 phrases daily",
                    "clinical_rationale": "Reduces localized somatic tension in the tongue tip and orbicularis oris muscle groups.",
                    "level": "Mild to Severe"
                },
                {
                    "title": "Continuous Phonation (Voicing Flow)",
                    "category": "Speech Rhythm",
                    "target": "Sustained voicing across word boundaries",
                    "instructions": "Read a sentence while maintaining continuous vocal vibration from the end of one word into the start of the next (e.g., 'One---and---two---and---three').",
                    "frequency": "3 short paragraphs per session",
                    "clinical_rationale": "Minimizes laryngeal de-voicing and re-voicing transitions where disfluency spikes typically cluster.",
                    "level": "All Severities"
                },
                {
                    "title": "Voluntary Pausing & Respiration Reset",
                    "category": "Cognitive-Motor Pacing",
                    "target": "Replacing struggle behavior with intentional pauses",
                    "instructions": "When anticipating a difficult sound, pause deliberately for 2 seconds. Release shoulder tension, exhale slightly, and release the word on relaxed airflow.",
                    "frequency": "Practice on 5 conversational prompts",
                    "clinical_rationale": "Extinguishes secondary struggle behaviors and involuntary autonomic tension loops.",
                    "level": "Moderate to Severe"
                }
            ]

        elif condition == "aphasia":
            exercises = [
                {
                    "title": "Melodic Intonation Therapy (MIT) Phrasing",
                    "category": "Neurolinguistic Stimulation",
                    "target": "Right-hemisphere melodic compensation for phrase production",
                    "instructions": "Intone functional phrases in a singing melodic contour (e.g., 'I want wa-ter', 'Good morn-ing'). Tap your left hand rhythmically on each syllable while humming and chanting the pitch contour.",
                    "frequency": "10 functional phrases, 2 sessions daily",
                    "clinical_rationale": "Recruits non-dominant right frontotemporal neural networks to assist expressive speech production in non-fluent aphasia.",
                    "level": "Moderate to Severe"
                },
                {
                    "title": "Semantic Feature Analysis (SFA)",
                    "category": "Lexical Retrieval",
                    "target": "Word finding through semantic associative spreading",
                    "instructions": "Look at an everyday item (e.g., an apple). Name its: 1) Category (fruit), 2) Function (eating), 3) Location (kitchen/tree), 4) Appearance (red/round), 5) Associations (pie, sweet).",
                    "frequency": "4 target objects daily",
                    "clinical_rationale": "Activates diffuse semantic neural networks to overcome lexical access bottlenecks (anomia).",
                    "level": "Mild to Moderate"
                },
                {
                    "title": "Phonemic Cueing Hierarchy Drills",
                    "category": "Word Retrieval",
                    "target": "Bridging phonological and expressive naming",
                    "instructions": "When stuck on a target word, prompt yourself systematically: First letter sound -> First syllable -> Rhyming word -> Full word (e.g., /k/ -> 'cof' -> rhymes with toffee -> 'coffee').",
                    "frequency": "5-10 word targets daily",
                    "clinical_rationale": "Builds self-cueing compensatory strategies for independent functional communication.",
                    "level": "All Severities"
                },
                {
                    "title": "Sentence Completion & Automatic Speech",
                    "category": "Expressive Fluency",
                    "target": "Accessing preserved formulaic language pathways",
                    "instructions": "Complete familiar idioms and cloze sentences: 'Salt and ______', 'Cup and ______', 'A penny for your ______'. Practice counting and days of the week.",
                    "frequency": "10 cloze prompts daily",
                    "clinical_rationale": "Reinforces subcortical and overlearned linguistic pathways to boost speech initiation confidence.",
                    "level": "Foundational"
                }
            ]

        else:  # Control or Review Required
            exercises = [
                {
                    "title": "Resonant Voice Therapy (Forward Facial Mask Focus)",
                    "category": "Vocal Wellness & Hygiene",
                    "target": "Optimized vocal fold vibration with minimal vocal effort",
                    "instructions": "Gently hum on an /m/ sound on an easy pitch. Place your fingers on your lips and nose to feel the buzz/vibration. Transition from 'Mmm' into 'Mmm-one', 'Mmm-two'.",
                    "frequency": "5 minutes daily before heavy voice use",
                    "clinical_rationale": "Positions vocal folds in a barely abducted/adducted configuration, maximizing acoustic output while minimizing impact stress.",
                    "level": "Wellness / Preventive"
                },
                {
                    "title": "Pitch Siren Glides",
                    "category": "Laryngeal Flexibility",
                    "target": "Cricothyroid and thyroarytenoid muscular range",
                    "instructions": "Gently glide on an /oo/ sound from your comfortable speaking pitch upwards like a siren, then glide smoothly back down without straining.",
                    "frequency": "5 gentle glides morning and evening",
                    "clinical_rationale": "Maintains longitudinal vocal fold elongation and mucosal wave elasticity.",
                    "level": "Wellness"
                },
                {
                    "title": "Vocal Tract Semi-Occluded Phonation (SOVTE)",
                    "category": "Vocal Conditioning",
                    "target": "Back pressure balance across the vocal folds",
                    "instructions": "Phonate a steady pitch through a drinking straw or lip trill (blowing air while vibrating lips like a motorboat).",
                    "frequency": "2-3 minutes, 3 times daily",
                    "clinical_rationale": "Creates inertive supraglottic acoustic impedance that unburdens the vocal folds from strain.",
                    "level": "Preventive"
                }
            ]

        return exercises
