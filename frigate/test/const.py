"""Constants for testing."""

import os
import tempfile

# Unique per process so test groups can run in parallel without sharing a database
TEST_DB = os.path.join(tempfile.gettempdir(), f"frigate_test_{os.getpid()}.db")
TEST_DB_CLEANUPS = [TEST_DB, f"{TEST_DB}-shm", f"{TEST_DB}-wal"]

# The database is thrown away after each test, so skip syncing every commit to
# disk, which is slow when several test processes are writing at once
TEST_DB_PRAGMAS = {"synchronous": "off"}
