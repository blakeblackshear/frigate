from peewee import (
    BooleanField,
    CharField,
    DateTimeField,
    FloatField,
    IntegerField,
    Model,
    TextField,
)
from playhouse.sqlite_ext import JSONField


class Event(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    label = CharField(index=True, max_length=20)
    sub_label = CharField(max_length=100, null=True)
    camera = CharField(index=True, max_length=20)
    start_time = DateTimeField()
    end_time = DateTimeField()
    top_score = (
        FloatField()
    )  # TODO remove when columns can be dropped without rebuilding table
    score = (
        FloatField()
    )  # TODO remove when columns can be dropped without rebuilding table
    false_positive = BooleanField()
    zones = JSONField()
    thumbnail = TextField()
    has_clip = BooleanField(default=True)
    has_snapshot = BooleanField(default=True)
    region = (
        JSONField()
    )  # TODO remove when columns can be dropped without rebuilding table
    box = (
        JSONField()
    )  # TODO remove when columns can be dropped without rebuilding table
    area = (
        IntegerField()
    )  # TODO remove when columns can be dropped without rebuilding table
    retain_indefinitely = BooleanField(default=False)
    ratio = FloatField(
        default=1.0
    )  # TODO remove when columns can be dropped without rebuilding table
    plus_id = CharField(max_length=30)
    model_hash = CharField(max_length=32)
    detector_type = CharField(max_length=32)
    model_type = CharField(max_length=32)
    data = JSONField()  # ex: tracked object box, region, etc.


class Timeline(Model):  # type: ignore[misc]
    timestamp = DateTimeField()
    camera = CharField(index=True, max_length=20)
    source = CharField(index=True, max_length=20)  # ex: tracked object, audio, external
    source_id = CharField(index=True, max_length=30)
    class_type = CharField(max_length=50)  # ex: entered_zone, audio_heard
    data = JSONField()  # ex: tracked object id, region, box, etc.


class Regions(Model):  # type: ignore[misc]
    camera = CharField(null=False, primary_key=True, max_length=20)
    grid = JSONField()  # json blob of grid
    last_update = DateTimeField()


class Recordings(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    path = CharField(unique=True)
    start_time = DateTimeField()
    end_time = DateTimeField()
    duration = FloatField()
    motion = IntegerField(null=True)
    objects = IntegerField(null=True)
    dBFS = IntegerField(null=True)
    segment_size = FloatField(default=0)  # this should be stored as MB
    regions = IntegerField(null=True)


class Export(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    name = CharField(index=True, max_length=100)
    date = DateTimeField()
    video_path = CharField(unique=True)
    thumb_path = CharField(unique=True)
    in_progress = BooleanField()


class ReviewSegment(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    start_time = DateTimeField()
    end_time = DateTimeField()
    has_been_reviewed = BooleanField(default=False)
    severity = CharField(max_length=30)  # alert, detection, significant_motion
    thumb_path = CharField(unique=True)
    data = JSONField()  # additional data about detection like list of labels, zone, areas of significant motion


class Previews(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    path = CharField(unique=True)
    start_time = DateTimeField()
    end_time = DateTimeField()
    duration = FloatField()


# Used for temporary table in record/cleanup.py
class RecordingsToDelete(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=False, max_length=30)

    class Meta:
        temporary = True


class User(Model):  # type: ignore[misc]
    username = CharField(null=False, primary_key=True, max_length=30)
    password_hash = CharField(null=False, max_length=120)
    notification_tokens = JSONField()
