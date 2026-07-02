import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, exams, flags, students, websocket

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="AI Exam Monitor API", version="1.0.0")

if settings.JWT_SECRET_KEY == "your-secret-key-change-in-production":
    logger.warning(
        "JWT_SECRET_KEY is using the insecure default. Set a real secret in backend/.env before deploying."
    )

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(exams.router, prefix="/api", tags=["exams"])
app.include_router(students.router, prefix="/api", tags=["students"])
app.include_router(flags.router, prefix="/api", tags=["flags"])
app.include_router(websocket.router, tags=["websocket"])


@app.get("/health")
async def health():
    return {"status": "ok"}
