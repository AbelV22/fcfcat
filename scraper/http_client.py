"""
Robust HTTP client with retries, rate limiting, caching, and error handling.
"""
import time
import hashlib
import os
import json
import logging
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("fcf_scraper")

# Cache directory
CACHE_DIR = Path(__file__).parent.parent / ".scraper_cache"


class FCFClient:
    """HTTP client specifically configured for fcf.cat scraping."""

    BASE_URL = "https://www.fcf.cat"

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ca,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }

    def __init__(
        self,
        rate_limit_seconds: float = 1.5,
        max_retries: int = 3,
        timeout: int = 30,
        use_cache: bool = True,
        cache_ttl_seconds: int = 3600,  # 1 hour default
    ):
        self.rate_limit = rate_limit_seconds
        self.max_retries = max_retries
        self.timeout = timeout
        self.use_cache = use_cache
        self.cache_ttl = cache_ttl_seconds
        self._last_request_time = 0.0
        self._session = requests.Session()
        self._session.headers.update(self.HEADERS)
        self._request_count = 0
        self._cache_hits = 0

        if use_cache:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def _cache_key(self, url: str) -> str:
        return hashlib.md5(url.encode()).hexdigest()

    def _get_cached(self, url: str) -> Optional[str]:
        if not self.use_cache:
            return None
        cache_file = CACHE_DIR / f"{self._cache_key(url)}.html"
        meta_file = CACHE_DIR / f"{self._cache_key(url)}.json"
        if cache_file.exists() and meta_file.exists():
            meta = json.loads(meta_file.read_text(encoding="utf-8"))
            age = time.time() - meta.get("timestamp", 0)
            if age < self.cache_ttl:
                self._cache_hits += 1
                logger.debug(f"Cache hit for {url} (age: {age:.0f}s)")
                return cache_file.read_text(encoding="utf-8")
        return None

    def _set_cached(self, url: str, content: str):
        if not self.use_cache:
            return
        cache_file = CACHE_DIR / f"{self._cache_key(url)}.html"
        meta_file = CACHE_DIR / f"{self._cache_key(url)}.json"
        cache_file.write_text(content, encoding="utf-8")
        meta_file.write_text(
            json.dumps({"url": url, "timestamp": time.time()}),
            encoding="utf-8",
        )

    def _rate_limit_wait(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit:
            wait = self.rate_limit - elapsed
            logger.debug(f"Rate limiting: waiting {wait:.1f}s")
            time.sleep(wait)

    def fetch(self, url: str) -> str:
        """Fetch a URL with retries, rate limiting, and caching. Returns HTML string."""
        if not url.startswith("http"):
            url = f"{self.BASE_URL}{url}"

        # Check cache first
        cached = self._get_cached(url)
        if cached is not None:
            return cached

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            self._rate_limit_wait()
            try:
                logger.info(f"GET {url} (attempt {attempt}/{self.max_retries})")
                resp = self._session.get(url, timeout=self.timeout)
                self._last_request_time = time.time()
                self._request_count += 1

                resp.raise_for_status()

                # Detect encoding
                resp.encoding = resp.apparent_encoding or "utf-8"
                content = resp.text

                # Validate we got actual HTML
                if "<html" not in content.lower()[:500]:
                    raise ValueError(f"Response does not appear to be HTML (first 200 chars: {content[:200]})")

                self._set_cached(url, content)
                return content

            except requests.exceptions.HTTPError as e:
                last_error = e
                if resp.status_code == 429:
                    wait = 5 * attempt
                    logger.warning(f"Rate limited (429). Waiting {wait}s...")
                    time.sleep(wait)
                elif resp.status_code >= 500:
                    wait = 2 * attempt
                    logger.warning(f"Server error ({resp.status_code}). Waiting {wait}s...")
                    time.sleep(wait)
                else:
                    raise
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                last_error = e
                wait = 3 * attempt
                logger.warning(f"Connection error: {e}. Retrying in {wait}s...")
                time.sleep(wait)

        raise RuntimeError(f"Failed to fetch {url} after {self.max_retries} attempts: {last_error}")

    def fetch_soup(self, url: str) -> BeautifulSoup:
        """Fetch and parse HTML into BeautifulSoup."""
        html = self.fetch(url)
        return BeautifulSoup(html, "lxml")

    def clear_cache(self):
        """Remove all cached files."""
        if CACHE_DIR.exists():
            for f in CACHE_DIR.iterdir():
                f.unlink()
            logger.info("Cache cleared")

    @property
    def stats(self) -> dict:
        return {
            "requests_made": self._request_count,
            "cache_hits": self._cache_hits,
        }
