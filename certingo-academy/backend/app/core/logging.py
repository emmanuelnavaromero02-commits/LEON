import logging
import sys

LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - [RID: %(request_id)s] - %(message)s'

def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    # `defaults` ensures records emitted by third-party libs (without a
    # request_id attribute) do not blow up the formatter.
    handler.setFormatter(logging.Formatter(LOG_FORMAT, defaults={"request_id": "GLOBAL"}))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers = [handler]

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
