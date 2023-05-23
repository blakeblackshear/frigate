import datetime as dt
import peewee as pw
from playhouse.sqlite_ext import *
from decimal import ROUND_HALF_EVEN
from frigate.models import Recordings


def migrate(migrator, database, fake=False, **kwargs):
    migrator.add_fields(
        Recordings,
        storage=pw.CharField(max_length=20,default="local"),
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.remove_fields(Recordings, ["storage"])
