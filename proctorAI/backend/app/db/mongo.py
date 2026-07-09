from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

# tz_aware=True makes every datetime read back from MongoDB a UTC-aware datetime
# instead of a naive one. Without this, values round-tripped through Mongo (e.g.
# exam.started_at, student.submitted_at) serialize to JSON without a "Z"/offset
# suffix, and browsers then misinterpret that ISO string as *local* time instead
# of UTC — causing multi-hour timer/timestamp skew on the frontend.
client = AsyncIOMotorClient(settings.MONGO_URI, tz_aware=True)
db = client[settings.MONGO_DB_NAME]
