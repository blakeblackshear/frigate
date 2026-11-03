"""Worker threads for blocking GenAI calls."""

import asyncio
import functools
import os
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any

# Same size as the default asyncio executor.
MAX_THREADS = min(32, (os.cpu_count() or 1) + 4)

_executor = ThreadPoolExecutor(max_workers=MAX_THREADS, thread_name_prefix="genai")
_lock = threading.Lock()
_in_use = 0


def _run(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    global _in_use
    with _lock:
        _in_use += 1
    try:
        return func(*args, **kwargs)
    finally:
        with _lock:
            _in_use -= 1


async def run_in_thread(func: Callable[..., Any], /, *args: Any, **kwargs: Any) -> Any:
    """Like asyncio.to_thread, on a pool whose usage is reported in stats."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor, functools.partial(_run, func, *args, **kwargs)
    )


def thread_stats() -> dict[str, int]:
    """Return how many GenAI worker threads are busy and the pool size."""
    return {"threads_in_use": _in_use, "threads_total": MAX_THREADS}
