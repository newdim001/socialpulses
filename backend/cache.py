import json
import hashlib
import logging
import os
from functools import wraps
from typing import Callable, Optional

import redis

logger = logging.getLogger('socialpulses.cache')

redis_client: Optional[redis.Redis] = None

_redis_password = os.environ.get('REDIS_PASSWORD')
_redis_kwargs = dict(host='localhost', port=6379, db=0, decode_responses=True)
if _redis_password:
    _redis_kwargs['password'] = _redis_password

try:
    redis_client = redis.Redis(**_redis_kwargs)
    redis_client.ping()
    logger.info('Redis connected for caching')
except redis.ConnectionError:
    logger.warning('Redis not available - caching disabled')
    redis_client = None


def cached(ttl: int = 60):
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            request = kwargs.get('request', None)
            if request is None:
                for arg in args:
                    if hasattr(arg, 'method') and hasattr(arg, 'url'):
                        request = arg
                        break
            if request is None or redis_client is None:
                return await func(*args, **kwargs)
            method = request.method
            path = str(request.url.path)
            qs = str(request.url.query)
            qs_hash = hashlib.md5(qs.encode()).hexdigest()[:8] if qs else ''
            cache_key = f'cache:{method}:{path}:{qs_hash}' if qs else f'cache:{method}:{path}'
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data is not None:
                    logger.debug(f'Cache HIT: {cache_key}')
                    return json.loads(cached_data)
            except redis.RedisError:
                pass
            logger.debug(f'Cache MISS: {cache_key}')
            result = await func(*args, **kwargs)
            try:
                if hasattr(result, 'model_dump'):
                    serializable = result.model_dump()
                elif hasattr(result, 'dict'):
                    serializable = result.dict()
                elif isinstance(result, list):
                    serializable = [
                        item.model_dump() if hasattr(item, 'model_dump') else
                        item.dict() if hasattr(item, 'dict') else item
                        for item in result
                    ]
                else:
                    serializable = result
                redis_client.setex(cache_key, ttl, json.dumps(serializable, default=str))
            except (redis.RedisError, TypeError, ValueError) as e:
                logger.warning(f'Failed to cache {cache_key}: {e}')
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            request = kwargs.get('request', None)
            if request is None:
                for arg in args:
                    if hasattr(arg, 'method') and hasattr(arg, 'url'):
                        request = arg
                        break
            if request is None or redis_client is None:
                return func(*args, **kwargs)
            method = request.method
            path = str(request.url.path)
            qs = str(request.url.query)
            qs_hash = hashlib.md5(qs.encode()).hexdigest()[:8] if qs else ''
            cache_key = f'cache:{method}:{path}:{qs_hash}' if qs else f'cache:{method}:{path}'
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data is not None:
                    logger.debug(f'Cache HIT: {cache_key}')
                    return json.loads(cached_data)
            except redis.RedisError:
                pass
            logger.debug(f'Cache MISS: {cache_key}')
            result = func(*args, **kwargs)
            try:
                if hasattr(result, 'model_dump'):
                    serializable = result.model_dump()
                elif hasattr(result, 'dict'):
                    serializable = result.dict()
                elif isinstance(result, list):
                    serializable = [
                        item.model_dump() if hasattr(item, 'model_dump') else
                        item.dict() if hasattr(item, 'dict') else item
                        for item in result
                    ]
                else:
                    serializable = result
                redis_client.setex(cache_key, ttl, json.dumps(serializable, default=str))
            except (redis.RedisError, TypeError, ValueError) as e:
                logger.warning(f'Failed to cache {cache_key}: {e}')
            return result

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
