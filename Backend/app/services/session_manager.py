"""
session_manager.py

Holds one RepCounter per active session in memory.

Two production concerns the original single-file prototype didn't
handle, fixed here:

1. THREAD SAFETY - FastAPI can serve multiple requests concurrently
   (sync route handlers run in a thread pool). A plain dict mutated
   from multiple threads without a lock is a real race condition
   risk under real traffic. Every read/write here goes through a
   lock.

2. MEMORY LEAK - a session that's started but never explicitly ended
   (e.g. the user just closes the browser tab) would live in memory
   forever with the old plain-dict approach. Every session now has a
   last-seen timestamp, and a background sweep evicts anything idle
   longer than SESSION_TTL_SECONDS.

This is intentionally still in-process memory, not Redis - correct
choice for a single backend instance. If you scale to multiple
instances behind a load balancer, this class's interface
(start/get/touch/end) is exactly what you'd re-implement against
Redis so nothing above this layer needs to change - see
TECHSTACK.md / WORKFLOW.md Phase 3.
"""

import threading
import time
from dataclasses import dataclass, field
from typing import Dict, Optional

from app.exercises_config import EXERCISES
from app.logging_config import get_logger
from app.services.rep_counter import RepCounter

logger = get_logger("fitvision.sessions")


@dataclass
class _SessionEntry:
    counter: RepCounter
    last_seen: float = field(default_factory=time.monotonic)


class SessionManager:
    def __init__(self, ttl_seconds: int):
        self._ttl_seconds = ttl_seconds
        self._sessions: Dict[str, _SessionEntry] = {}
        self._lock = threading.Lock()

    def start(self, session_id: str, exercise: str) -> RepCounter:
        config = EXERCISES[exercise]  # caller validates exercise exists first
        counter = RepCounter(exercise, config)
        with self._lock:
            self._sessions[session_id] = _SessionEntry(counter=counter)
        logger.info(f"Session started: {session_id} ({exercise})")
        return counter

    def get(self, session_id: str) -> Optional[RepCounter]:
        with self._lock:
            entry = self._sessions.get(session_id)
            if entry is None:
                return None
            entry.last_seen = time.monotonic()
            return entry.counter

    def end(self, session_id: str) -> Optional[RepCounter]:
        with self._lock:
            entry = self._sessions.pop(session_id, None)
        if entry:
            logger.info(f"Session ended: {session_id} (final rep_count={entry.counter.rep_count})")
        return entry.counter if entry else None

    def active_count(self) -> int:
        with self._lock:
            return len(self._sessions)

    def sweep_expired(self) -> int:
        """
        Evicts sessions idle longer than the TTL. Returns count
        evicted. Called periodically by a background task started in
        the app lifespan (see app/main.py).
        """
        now = time.monotonic()
        expired_ids = []

        with self._lock:
            for session_id, entry in self._sessions.items():
                if now - entry.last_seen > self._ttl_seconds:
                    expired_ids.append(session_id)
            for session_id in expired_ids:
                del self._sessions[session_id]

        if expired_ids:
            logger.info(f"Swept {len(expired_ids)} expired session(s): {expired_ids}")
        return len(expired_ids)


# Module-level singleton, explicitly initialized in app/main.py's
# lifespan (not at import time) so tests can construct their own
# isolated SessionManager instead of sharing this one - see
# tests/conftest.py.
_session_manager: Optional[SessionManager] = None


def init_session_manager(ttl_seconds: int) -> SessionManager:
    global _session_manager
    _session_manager = SessionManager(ttl_seconds=ttl_seconds)
    return _session_manager


def get_session_manager() -> SessionManager:
    if _session_manager is None:
        raise RuntimeError("SessionManager not initialized - app startup did not run")
    return _session_manager
