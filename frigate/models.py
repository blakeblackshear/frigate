from numpy import unique
from peewee import (
    Model,
    CharField,
    DateTimeField,
    FloatField,
    BooleanField,
    TextField,
    IntegerField,
)
from playhouse.sqlite_ext import JSONField


class Event(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    label = CharField(index=True, max_length=20)
    sub_label = CharField(max_length=20, null=True)
    camera = CharField(index=True, max_length=20)
    start_time = DateTimeField()
    end_time = DateTimeField()
    top_score = FloatField()
    false_positive = BooleanField()
    zones = JSONField()
    thumbnail = TextField()
    has_clip = BooleanField(default=True)
    has_snapshot = BooleanField(default=True)
    region = JSONField()
    box = JSONField()
    area = IntegerField()
    retain_indefinitely = BooleanField(default=False)
    ratio = FloatField(default=1.0)
    plus_id = CharField(max_length=30)


class Recordings(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    path = CharField(unique=True)
    start_time = DateTimeField()
    end_time = DateTimeField()
    duration = FloatField()
    motion = IntegerField(null=True)
    objects = IntegerField(null=True)
    segment_size = FloatField(default=0)  # this should be stored as MB
