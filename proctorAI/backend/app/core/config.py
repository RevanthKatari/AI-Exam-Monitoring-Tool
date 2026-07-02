from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    MONGO_URI: str = "mongodb://mongo:27017"
    MONGO_DB_NAME: str = "proctorAI"
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 90
    CORS_ORIGINS: str = "http://localhost:5173"


settings = Settings()
