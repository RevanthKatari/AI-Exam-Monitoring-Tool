import threading
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode

MODEL_PATH = Path(__file__).parent / "face_landmarker.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)

YAW_THRESHOLD = 20
PITCH_THRESHOLD = 15

_landmarker: FaceLandmarker | None = None
# The FaceLandmarker instance is shared across every concurrent student WebSocket
# connection (each frame is processed via asyncio.to_thread on a worker thread), and
# MediaPipe's tasks API is not guaranteed safe for concurrent detect() calls on one
# instance. Serialize inference with a lock so multiple students never corrupt shared state.
_landmarker_lock = threading.Lock()


def _get_landmarker() -> FaceLandmarker:
    global _landmarker
    if _landmarker is None:
        if not MODEL_PATH.exists():
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
            running_mode=RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        _landmarker = FaceLandmarker.create_from_options(options)
    return _landmarker


def _landmarks_from_frame(frame):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    with _landmarker_lock:
        result = _get_landmarker().detect(mp_image)
    if not result.face_landmarks:
        return None
    return result.face_landmarks[0]


def analyse_gaze(frame) -> dict | None:
    """Returns a flag dict if gaze is outside bounds, else None."""
    landmarks = _landmarks_from_frame(frame)

    if landmarks is None:
        return {
            "type": "danger",
            "flag_type": "face_not_visible",
            "title": "Face not visible",
            "confidence": 99,
            "description": "No face landmarks detected. Student may have left the frame.",
        }

    nose_tip = landmarks[4]
    chin = landmarks[152]
    left_eye = landmarks[33]
    right_eye = landmarks[263]

    eye_centre_x = (left_eye.x + right_eye.x) / 2
    nose_x = nose_tip.x
    yaw = (nose_x - eye_centre_x) * 180

    nose_y = nose_tip.y
    pitch = (nose_y - 0.5) * 60

    if abs(yaw) > YAW_THRESHOLD or abs(pitch) > PITCH_THRESHOLD:
        return {
            "type": "warning",
            "flag_type": "gaze_deviation",
            "title": f"Gaze away — yaw {yaw:.0f}°",
            "confidence": min(99, int(abs(yaw) * 3)),
            "description": f"Head pose exceeded threshold. Yaw: {yaw:.1f}°, Pitch: {pitch:.1f}°",
        }

    return None


def gaze_stability_score(frame) -> int:
    """Returns 0-100 gaze stability score for telemetry charts."""
    landmarks = _landmarks_from_frame(frame)

    if landmarks is None:
        return 25

    nose_tip = landmarks[4]
    left_eye = landmarks[33]
    right_eye = landmarks[263]

    eye_centre_x = (left_eye.x + right_eye.x) / 2
    yaw = abs((nose_tip.x - eye_centre_x) * 180)
    pitch = abs((nose_tip.y - 0.5) * 60)

    deviation = max(yaw / YAW_THRESHOLD, pitch / PITCH_THRESHOLD)
    return max(0, min(100, int(100 - deviation * 40)))
