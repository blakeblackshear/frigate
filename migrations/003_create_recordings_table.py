"""Peewee migrations -- 003_create_recordings_table.py.

Some examples (model - class or model name)::

    > Model = migrator.orm['model_name']            # Return model in current state by name

    > migrator.sql(sql)                             # Run custom SQL
    > migrator.python(func, *args, **kwargs)        # Run python code
    > migrator.create_model(Model)                  # Create a model (could be used as decorator)
    > migrator.remove_model(model, cascade=True)    # Remove a model
    > migrator.add_fields(model, **fields)          # Add fields to a model
    > migrator.change_fields(model, **fields)       # Change fields
    > migrator.remove_fields(model, *field_names, cascade=True)
    > migrator.rename_field(model, old_field_name, new_field_name)
    > migrator.rename_table(model, new_table_name)
    > migrator.add_index(model, *col_names, unique=False)
    > migrator.drop_index(model, *col_names)
    > migrator.add_not_null(model, *field_names)
    > migrator.drop_not_null(model, *field_names)
    > migrator.add_default(model, field_name, default)

"""

from concurrent.futures import as_completed, ThreadPoolExecutor
import datetime as dt
import peewee as pw
from decimal import ROUND_HALF_EVEN
import random
import string
import os
import subprocess as sp
import glob
import re

try:
    import playhouse.postgres_ext as pw_pext
except ImportError:
    pass

from frigate.const import RECORD_DIR
from frigate.models import Recordings

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.create_model(Recordings)

    def backfill():
        # First add the index here, because there is a bug in peewee_migrate
        # when trying to create an multi-column index in the same migration
        # as the table: https://github.com/klen/peewee_migrate/issues/19
        Recordings.add_index("start_time", "end_time")
        Recordings.create_table()

        # Backfill existing recordings
        files = glob.glob(f"{RECORD_DIR}/*/*/*/*/*.mp4")

        def probe(path):
            ffprobe_cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ]
            p = sp.run(ffprobe_cmd, capture_output=True)
            if p.returncode == 0:
                return float(p.stdout.decode().strip())
            else:
                os.remove(path)
                return 0

        with ThreadPoolExecutor() as executor:
            future_to_path = {executor.submit(probe, path): path for path in files}
            for future in as_completed(future_to_path):
                path = future_to_path[future]
                duration = future.result()
                rand_id = "".join(
                    random.choices(string.ascii_lowercase + string.digits, k=6)
                )
                search = re.search(
                    r".+/(\d{4}[-]\d{2})/(\d{2})/(\d{2})/(.+)/(\d{2})\.(\d{2}).mp4",
                    path,
                )
                if not search:
                    return False
                date = f"{search.group(1)}-{search.group(2)} {search.group(3)}:{search.group(5)}:{search.group(6)}"
                start = dt.datetime.strptime(date, "%Y-%m-%d %H:%M:%S")
                end = start + dt.timedelta(seconds=duration)

                Recordings.create(
                    id=f"{start.timestamp()}-{rand_id}",
                    camera=search.group(4),
                    path=path,
                    start_time=start.timestamp(),
                    end_time=end.timestamp(),
                    duration=duration,
                )

    migrator.python(backfill)


def rollback(migrator, database, fake=False, **kwargs):
    migrator.remove_model(Recordings)
