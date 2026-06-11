import logging
import sys
from fastapi import Request

def setup_logging():
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - [RID: %(request_id)s] - %(message)s'
    )

class RequestIDFilter(logging.Filter):
    def filter(self, record):
        # This is a bit tricky with standard logging if not using a context var
        # For simplicity in this demo, we'll try to get it from a global context if available
        # or just default to 'NONE'
        record.request_id = getattr(record, 'request_id', 'GLOBAL')
        return True

def get_logger(name: str):
    logger = logging.getLogger(name)
    logger.addFilter(RequestIDFilter())
    return logger
