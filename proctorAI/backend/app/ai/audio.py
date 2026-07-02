VOICE_THRESHOLD = 45
NOISE_THRESHOLD = 35


def check_audio(db_level: int) -> dict | None:
    if db_level >= VOICE_THRESHOLD:
        return {
            "type": "warning",
            "flag_type": "voice_detected",
            "title": "Voice detected",
            "confidence": min(99, int((db_level - VOICE_THRESHOLD) * 3 + 70)),
            "description": (
                f"Audio level {db_level} dB exceeded voice threshold ({VOICE_THRESHOLD} dB)."
            ),
        }
    if db_level >= NOISE_THRESHOLD:
        return {
            "type": "info",
            "flag_type": "audio_spike",
            "title": "Audio noise spike",
            "confidence": 68,
            "description": (
                f"Audio level {db_level} dB — elevated noise. "
                "Below speech-pattern threshold."
            ),
        }
    return None
