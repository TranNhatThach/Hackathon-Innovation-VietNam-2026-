import os
import logging
import redis
from hashlib import sha256
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Fallback to the local redis container defined in docker-compose if env var is empty
REDIS_URL = os.getenv("REDIS_URL") or "redis://redis:6379/0"

class RedisCache:
    def __init__(self, redis_url: str = REDIS_URL):
        self.redis_url = redis_url
        self.client = None
        self.enabled = False
        self._init_client()

    def _init_client(self):
        try:
            # Connect with short timeouts to avoid blocking the main thread if Redis is offline
            self.client = redis.from_url(
                self.redis_url, 
                socket_timeout=1.5, 
                socket_connect_timeout=1.5,
                decode_responses=False
            )
            self.client.ping()
            self.enabled = True
            logger.info(f"Successfully connected to Redis at: {self.redis_url.split('@')[-1] if '@' in self.redis_url else self.redis_url}")
        except Exception as e:
            logger.warning(f"Redis is not available, caching will be bypassed: {e}")
            self.client = None
            self.enabled = False

    def get(self, key: str) -> str | None:
        if not self.enabled or not self.client:
            return None
        try:
            val = self.client.get(key)
            if val:
                return val.decode("utf-8")
        except Exception as e:
            logger.warning(f"Failed to GET from Redis cache: {e}")
            self.enabled = False  # Mark disabled to avoid hitting connection timeouts repeatedly
        return None

    def set(self, key: str, value: str, ex: int = 900) -> bool:
        """Sets a key in Redis with an optional TTL (default 15 minutes / 900s)"""
        if not self.enabled or not self.client:
            return False
        try:
            return bool(self.client.set(key, value, ex=ex))
        except Exception as e:
            logger.warning(f"Failed to SET to Redis cache: {e}")
            self.enabled = False
        return False

    @staticmethod
    def get_cache_key(query: str) -> str:
        """Returns a stable cache key using sha256 hash of the normalized query"""
        normalized = " ".join(query.strip().lower().split())
        hashed = sha256(normalized.encode("utf-8")).hexdigest()
        return f"agent_cache:{hashed}"

# Global redis cache instance
redis_cache = RedisCache()
