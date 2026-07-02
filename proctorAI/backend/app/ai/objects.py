from ultralytics import YOLO

_model = None

FLAGGED_CLASSES = {
    67: ("cell phone", "danger", "Phone detected"),
    73: ("book", "warning", "Document detected"),
    0: ("person", "danger", "Second person visible"),
    63: ("laptop", "warning", "Second laptop detected"),
    77: ("cell phone", "danger", "Phone detected"),
}

CONFIDENCE_THRESHOLD = 0.60


def _get_model():
    global _model
    if _model is None:
        _model = YOLO("yolov8n.pt")
    return _model


def detect_objects(frame) -> list[dict]:
    """Returns list of flag dicts for any detected prohibited objects."""
    results = _get_model()(frame, verbose=False)[0]
    flags = []
    person_count = 0

    for box in results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])

        if conf < CONFIDENCE_THRESHOLD:
            continue

        if cls_id == 0:
            person_count += 1
            continue

        if cls_id in FLAGGED_CLASSES:
            _, severity, title = FLAGGED_CLASSES[cls_id]
            flags.append({
                "type": severity,
                "flag_type": "object_detected",
                "title": title,
                "confidence": int(conf * 100),
                "description": f"{title} detected with {conf * 100:.0f}% confidence.",
            })

    if person_count > 1:
        flags.append({
            "type": "danger",
            "flag_type": "multiple_persons",
            "title": "Second person visible",
            "confidence": 88,
            "description": (
                f"{person_count} people detected in the frame. "
                "Only the exam taker should be visible."
            ),
        })

    return flags
