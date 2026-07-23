from datetime import datetime, timezone

from app.services.formatting import (
    build_timeline,
    format_flag,
    format_timestamp,
    icon_for_flag_type,
    status_for_score,
)


def test_status_for_score_boundaries():
    assert status_for_score(100) == "clean"
    assert status_for_score(80) == "clean"
    assert status_for_score(79) == "flagged"
    assert status_for_score(60) == "flagged"
    assert status_for_score(59) == "high-risk"
    assert status_for_score(0) == "high-risk"


def test_icon_for_known_flag_types():
    assert icon_for_flag_type("object_detected") == "device-mobile"
    assert icon_for_flag_type("multiple_persons") == "users"
    assert icon_for_flag_type("identity_mismatch") == "users"


def test_icon_for_unknown_flag_type_falls_back():
    assert icon_for_flag_type("something_new") == "eye-off"
    assert icon_for_flag_type(None) == "eye-off"


def test_format_timestamp_none():
    assert format_timestamp(None) == "—"


def test_format_timestamp_from_epoch_ms():
    # 2026-01-01 12:34:00 UTC in epoch milliseconds
    dt = datetime(2026, 1, 1, 12, 34, 0, tzinfo=timezone.utc)
    ms = int(dt.timestamp() * 1000)
    assert format_timestamp(ms) == "12:34"


def test_format_flag_maps_all_fields():
    raw = {
        "type": "danger",
        "flag_type": "object_detected",
        "title": "Phone detected",
        "timestamp": None,
        "confidence": 90,
        "duration": "6s",
        "description": "desc",
    }
    formatted = format_flag(raw)
    assert formatted == {
        "type": "danger",
        "icon": "device-mobile",
        "title": "Phone detected",
        "time": "—",
        "confidence": 90,
        "duration": "6s",
        "description": "desc",
    }


def test_build_timeline_empty_flags():
    assert build_timeline([]) == [{"t": 0.0, "type": "ok"}]


def test_build_timeline_places_events_proportionally():
    start = 1_000_000
    duration_minutes = 10
    session_ms = duration_minutes * 60 * 1000
    flags = [
        {"timestamp": start, "type": "warning"},
        {"timestamp": start + session_ms // 2, "type": "danger"},
    ]
    timeline = build_timeline(flags, duration_minutes)
    assert timeline[0] == {"t": 0.0, "type": "ok"}
    assert timeline[1]["t"] == 0.0
    assert timeline[2]["t"] == 0.5
    assert timeline[2]["type"] == "danger"


def test_build_timeline_clamps_to_one():
    # start_ts is min(timestamps) across all flags, so a lone flag always sits at
    # t=0.0 relative to itself — need a second, much later flag to actually push
    # past the session window and exercise the 1.0 clamp.
    start = 1_000_000
    duration_minutes = 1
    session_ms = duration_minutes * 60 * 1000
    flags = [
        {"timestamp": start, "type": "warning"},
        {"timestamp": start + session_ms * 5, "type": "danger"},  # way past the end
    ]
    timeline = build_timeline(flags, duration_minutes)
    assert timeline[-1]["t"] == 1.0
    assert timeline[-1]["type"] == "danger"
