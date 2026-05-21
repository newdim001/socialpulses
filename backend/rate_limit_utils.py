"""
Jittered exponential backoff for all platform API calls.
"""
from __future__ import annotations
import random
import time
import logging
from typing import Optional, Callable, Any

logger = logging.getLogger("rate_limit")

BASE_DELAY = 2.0
MAX_DELAY = 120.0
MAX_RETRIES = 5
JITTER_FACTOR = 0.25

RETRYABLE_STATUSES = {429, 500, 502, 503, 504}

_platform_cooldowns: dict[str, float] = {}
COOLDOWN_PENALTY = 60.0


def api_call(
    method: str,
    url: str,
    platform: str = "unknown",
    headers: Optional[dict] = None,
    json: Optional[dict] = None,
    data: Optional[dict] = None,
    params: Optional[dict] = None,
    files: Optional[dict] = None,
    timeout: int = 30,
    max_retries: int = MAX_RETRIES,
):
    import requests
    _respect_cooldown(platform)
    last_exception = None

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.request(
                method=method.upper(), url=url,
                headers=headers, json=json, data=data,
                params=params, files=files, timeout=timeout,
            )
            if resp.status_code < 400:
                return resp
            if resp.status_code == 401:
                return resp
            if resp.status_code in RETRYABLE_STATUSES:
                if resp.status_code == 429:
                    _set_cooldown(platform)
                    retry_after = _parse_retry_after(resp)
                    logger.warning(f"[{platform}] Rate limited (429). Cooling down {retry_after}s. Attempt {attempt}/{max_retries}.")
                    time.sleep(retry_after)
                else:
                    delay = _backoff_delay(attempt)
                    logger.warning(f"[{platform}] HTTP {resp.status_code} on {method.upper()} {url}. Retrying in {delay:.1f}s. Attempt {attempt}/{max_retries}.")
                    time.sleep(delay)
                continue
            return resp
        except requests.exceptions.Timeout:
            delay = _backoff_delay(attempt)
            logger.warning(f"[{platform}] Timeout. Retrying in {delay:.1f}s. Attempt {attempt}/{max_retries}.")
            time.sleep(delay)
            last_exception = None
            continue
        except requests.exceptions.ConnectionError as e:
            delay = _backoff_delay(attempt)
            logger.warning(f"[{platform}] Connection error: {str(e)[:80]}. Retrying in {delay:.1f}s. Attempt {attempt}/{max_retries}.")
            time.sleep(delay)
            last_exception = e
            continue
        except requests.exceptions.RequestException as e:
            last_exception = e
            if attempt == max_retries:
                raise
            delay = _backoff_delay(attempt)
            time.sleep(delay)
    if last_exception:
        raise last_exception
    raise RuntimeError(f"[{platform}] All {max_retries} retries exhausted.")


def _backoff_delay(attempt: int) -> float:
    delay = min(BASE_DELAY * (2 ** (attempt - 1)), MAX_DELAY)
    jitter = delay * JITTER_FACTOR * (2 * random.random() - 1)
    return delay + jitter


def _parse_retry_after(resp) -> float:
    retry_after = resp.headers.get("Retry-After", "")
    if retry_after and retry_after.isdigit():
        return float(retry_after)
    return COOLDOWN_PENALTY


def _set_cooldown(platform: str):
    _platform_cooldowns[platform] = time.time()


def _respect_cooldown(platform: str):
    expiry = _platform_cooldowns.get(platform)
    if expiry:
        remaining = expiry + COOLDOWN_PENALTY - time.time()
        if remaining > 0:
            logger.info(f"[{platform}] In cooldown. Waiting {remaining:.1f}s.")
            time.sleep(remaining)
        del _platform_cooldowns[platform]


def refresh_token_if_needed(resp, client):
    if resp.status_code == 401 and client.refresh_token:
        logger.info(f"Token expired for {type(client).__name__}. Attempting refresh...")
        new_token = client.refresh_access_token()
        if new_token:
            logger.info(f"Token refreshed for {type(client).__name__}.")
            return new_token
        logger.warning(f"Token refresh failed for {type(client).__name__}.")
    return None

# Legacy alias for backward compatibility
def api_call_with_backoff(method_or_callable, url=None, platform="unknown",
                          headers=None, json=None, data=None, params=None,
                          files=None, timeout=30, max_retries=MAX_RETRIES):
    """Backward-compatible: accepts either (callable) or (method, url, ...)."""
    import requests as _requests
    if callable(method_or_callable):
        _respect_cooldown(platform)
        for attempt in range(1, max_retries + 1):
            try:
                resp = method_or_callable()
                if resp.status_code < 400:
                    return resp
                if resp.status_code == 401:
                    return resp
                if resp.status_code in RETRYABLE_STATUSES:
                    time.sleep(_backoff_delay(attempt))
                    continue
                return resp
            except _requests.exceptions.Timeout:
                time.sleep(_backoff_delay(attempt))
                continue
            except _requests.exceptions.ConnectionError as e:
                time.sleep(_backoff_delay(attempt))
                continue
            except _requests.exceptions.RequestException as e:
                if attempt == max_retries:
                    raise
                time.sleep(_backoff_delay(attempt))
        raise RuntimeError(f"All {max_retries} retries exhausted.")
    else:
        return api_call(method_or_callable, url, platform, headers,
                        json, data, params, files, timeout, max_retries)
