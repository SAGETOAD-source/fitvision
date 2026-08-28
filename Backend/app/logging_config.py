"""
logging_config.py

Structured, consistent logging setup. Every log line includes a
timestamp, level, logger name, and (via the request-id middleware)
a request ID - so a single user's request can be traced through
logs even under concurrent traffic, which plain print()-based
logging (what live_predict.py uses today) can't give you.
"""

import logging
import sys

from app.config import get_settings


def configure_logging() -> None:
    settings = get_settings()

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(request_id)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())
    root.handlers = [handler]

    # Quiet down noisy third-party loggers unless we're debugging.
    if not settings.debug:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


class RequestIdFilter(logging.Filter):
    """
    Injects a default request_id so every log record has the field
    the formatter expects, even for log lines emitted outside a
    request context (e.g. during startup).
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        return True


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.addFilter(RequestIdFilter())
    return logger
