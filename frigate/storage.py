"""Handle storage retention and usage."""

import threading

class StorageMaintainer(threading.Thread):
    """Maintain frigates recording storage."""