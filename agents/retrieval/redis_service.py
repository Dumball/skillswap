"""
Redis Service
Handles agent session memory, conversation state, and response caching
"""
import os
import json
from typing import Optional, Any
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()


class RedisService:
    def __init__(self):
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.client = redis.from_url(url, decode_responses=True)
            print("OK Redis connected")
        except Exception as e:
            self.client = None
            print(f"WARNING: Redis not available (continuing without cache): {e}")

    async def cache(self, key: str, value: Any, ttl: int = 300):
        """Cache a response with TTL in seconds"""
        if not self.client:
            return
        try:
            serialized = json.dumps(value) if not isinstance(value, str) else value
            await self.client.setex(f"skillswap:{key}", ttl, serialized)
        except Exception as e:
            print(f"Redis cache error: {e}")

    async def get_cached(self, key: str) -> Optional[Any]:
        """Retrieve a cached value"""
        if not self.client:
            return None
        try:
            val = await self.client.get(f"skillswap:{key}")
            if val:
                try:
                    return json.loads(val)
                except json.JSONDecodeError:
                    return val
        except Exception:
            return None
        return None

    async def save_session(self, session_id: str, history: list, ttl: int = 3600):
        """Save conversation history for a session"""
        if not self.client:
            return
        try:
            await self.client.setex(
                f"skillswap:session:{session_id}",
                ttl,
                json.dumps(history)
            )
        except Exception as e:
            print(f"Redis session save error: {e}")

    async def get_session(self, session_id: str) -> list:
        """Retrieve conversation history for a session"""
        if not self.client:
            return []
        try:
            val = await self.client.get(f"skillswap:session:{session_id}")
            return json.loads(val) if val else []
        except Exception:
            return []

    async def delete_session(self, session_id: str):
        """Clear session memory"""
        if not self.client:
            return
        await self.client.delete(f"skillswap:session:{session_id}")
