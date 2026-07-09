from datetime import datetime, timezone

ICON_MAP = {
    "object_detected": "device-mobile",
    "multiple_persons": "users",
    "face_not_visible": "eye-off",
    "gaze_deviation": "eye-off",
    "tab_switch": "layout-2",
    "window_blur": "layout-2",
    "voice_detected": "volume",
    "audio_spike": "volume",
    "escalated": "eye-off",
    "identity_mismatch": "users",
}


def status_for_score(score: int) -> str:
    if score < 60:
        return "high-risk"
    if score < 80:
        return "flagged"
    return "clean"


def icon_for_flag_type(flag_type: str | None) -> str:
    return ICON_MAP.get(flag_type or "", "eye-off")


def format_timestamp(timestamp) -> str:
    if timestamp is None:
        return "—"
    if isinstance(timestamp, (int, float)):
        dt = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
    else:
        dt = timestamp
    return dt.strftime("%H:%M")


def format_flag(f: dict) -> dict:
    return {
        "type": f.get("type"),
        "icon": icon_for_flag_type(f.get("flag_type")),
        "title": f.get("title"),
        "time": format_timestamp(f.get("timestamp")),
        "confidence": f.get("confidence"),
        "duration": f.get("duration"),
        "description": f.get("description"),
    }


def build_timeline(flags: list[dict], duration_minutes: int = 90) -> list[dict]:
    if not flags:
        return [{"t": 0.0, "type": "ok"}]

    session_ms = duration_minutes * 60 * 1000
    timestamps = [f.get("timestamp", 0) for f in flags if f.get("timestamp")]
    if not timestamps:
        return [{"t": 0.5, "type": flags[0].get("type", "warning")}]

    start_ts = min(timestamps)
    events = [{"t": 0.0, "type": "ok"}]
    for f in flags:
        ts = f.get("timestamp", start_ts)
        t = min(1.0, max(0.0, (ts - start_ts) / session_ms))
        events.append({"t": round(t, 2), "type": f.get("type", "warning")})
    return events
