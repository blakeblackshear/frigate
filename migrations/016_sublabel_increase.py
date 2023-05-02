import peewee as pw
from playhouse.migrate import *
from playhouse.sqlite_ext import *
from frigate.models import Event


def migrate(migrator, database, fake=False, **kwargs):
    migrator.change_columns(Event, sub_label=pw.CharField(max_length=100, null=True))


def rollback(migrator, database, fake=False, **kwargs):
    migrator.change_columns(Event, sub_label=pw.CharField(max_length=20, null=True))
