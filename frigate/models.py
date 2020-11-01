from peewee import *
from playhouse.sqlite_ext import *

class Event(Model):
    id = CharField(null=False, primary_key=True, max_length=30)
    label = CharField(index=True, max_length=20)
    camera = CharField(index=True, max_length=20)
    start_time = DateTimeField()
    end_time = DateTimeField()
    top_score = FloatField()
    false_positive = BooleanField()
    zones = JSONField()