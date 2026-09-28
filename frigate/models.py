from peewee import (
    BlobField,
    BooleanField,
    CharField,
    CompositeKey,
    DateTimeField,
    FloatField,
    ForeignKeyField,
    IntegerField,
    Model,
    TextField,
)
from playhouse.sqlite_ext import JSONField


class Event(Model):
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


class Timeline(Model):
    timestamp = DateTimeField()
    camera = CharField(index=True, max_length=20)
    source = CharField(index=True, max_length=20)  # ex: tracked object, audio, external
    source_id = CharField(index=True, max_length=30)
    class_type = CharField(max_length=50)  # ex: entered_zone, audio_heard
    data = JSONField()  # ex: tracked object id, region, box, etc.


class Regions(Model):
    camera = CharField(null=False, primary_key=True, max_length=20)
    grid = JSONField()  # json blob of grid
    last_update = DateTimeField()


class Recordings(Model):
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
    motion_heatmap = JSONField(null=True)  # 16x16 grid, 256 values (0-255)


class ExportCase(Model):
    id = CharField(null=False, primary_key=True, max_length=30)
    name = CharField(index=True, max_length=100)
    description = TextField(null=True)
    created_at = DateTimeField()
    updated_at = DateTimeField()


class Export(Model):
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    name = CharField(index=True, max_length=100)
    date = DateTimeField()
    video_path = CharField(unique=True)
    thumb_path = CharField(unique=True)
    in_progress = BooleanField()
    export_case = ForeignKeyField(
        ExportCase,
        null=True,
        backref="exports",
        column_name="export_case_id",
    )


class ReviewSegment(Model):
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    start_time = DateTimeField()
    end_time = DateTimeField()
    severity = CharField(max_length=30)  # alert, detection
    thumb_path = CharField(unique=True)
    data = JSONField()  # additional data about detection like list of labels, zone, areas of significant motion


class UserReviewStatus(Model):
    user_id = CharField(max_length=30)
    review_segment = ForeignKeyField(ReviewSegment, backref="user_reviews")
    has_been_reviewed = BooleanField(default=False)

    class Meta:
        indexes = ((("user_id", "review_segment"), True),)


class Previews(Model):
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    path = CharField(unique=True)
    start_time = DateTimeField()
    end_time = DateTimeField()
    duration = FloatField()


# Used for temporary table in record/cleanup.py
class RecordingsToDelete(Model):
    id = CharField(null=False, primary_key=False, max_length=30)

    class Meta:
        temporary = True


class User(Model):
    username = CharField(null=False, primary_key=True, max_length=30)
    role = CharField(
        max_length=20,
        default="admin",
    )
    password_hash = CharField(null=False, max_length=120)
    password_changed_at = DateTimeField(null=True)
    notification_tokens = JSONField()

    @classmethod
    def get_allowed_cameras(
        cls, role: str, roles_dict: dict[str, list[str]], all_camera_names: set[str]
    ) -> list[str]:
        if role not in roles_dict:
            return []  # Invalid role grants no access
        allowed = roles_dict[role]
        if not allowed:  # Empty list means all cameras
            return list(all_camera_names)

        return [cam for cam in allowed if cam in all_camera_names]


# class Group(Model):
#     id = CharField(null=False, primary_key=True, max_length=30)
#     group_name = CharField(index=True, max_length=100)
#
#
# class Employee(Model):
#     id = CharField(null=False, primary_key=True, max_length=30)
#     first_name = CharField(max_length=100)
#     last_name = CharField(max_length=100)
#     group = ForeignKeyField(
#         Group,
#         backref="employees",
#         column_name="group_id",
#         on_delete="RESTRICT",
#         on_update="CASCADE",
#     )


class AccessControl(Model):
    id = CharField(
        null=False,
        primary_key=True,
        max_length=30,
    )

    name = CharField(
        null=False,
        max_length=100,
    )

    ip_address = CharField(
        null=False,
        max_length=45,
    )

    type = CharField(
        null=False,
        max_length=50,
    )

    model = CharField(
        null=False,
        max_length=100,
    )

    port = IntegerField(
        null=False,
        default=37777,
    )

    provider = CharField(null=False, default="cgi", max_length=20)
    sdk_port = IntegerField(null=False, default=37777)
    use_https = BooleanField(default=False)
    provider_options = JSONField(default=dict)

    channel_count = IntegerField(
        null=False,
        default=1,
    )

    serial_number = CharField(
        null=False,
        max_length=100,
    )

    username = CharField(
        null=False,
        max_length=100,
    )

    password = CharField(
        null=False,
        max_length=255,
    )

    status = CharField(
        null=False,
        default="offline",
        max_length=20,
    )

    associated_camera = CharField(
        null=True,
        max_length=100,
    )

    seconds_before = IntegerField(default=10)
    seconds_after = IntegerField(default=10)
    last_checked_at = FloatField(null=True)
    event_tracking_started_at = FloatField(null=True)
    last_event_poll = FloatField(null=True)


class AccessEvent(Model):
    id = CharField(primary_key=True, max_length=64)
    device_id = CharField(max_length=30, index=True)
    occurred_at = FloatField(index=True)
    card_number = CharField(max_length=100, null=True)
    raw_record = JSONField()
    verification_status = CharField(max_length=20, default="unverified")
    people = JSONField(default=list)
    camera = CharField(max_length=100, null=True)
    seconds_before = IntegerField(default=10)
    seconds_after = IntegerField(default=10)

    class Meta:
        table_name = "access_event"


class Trigger(Model):
    camera = CharField(max_length=20)
    name = CharField()
    type = CharField(max_length=10)
    data = TextField()
    threshold = FloatField()
    model = CharField(max_length=30)
    embedding = BlobField()
    triggering_event_id = CharField(max_length=30)
    last_triggered = DateTimeField()

    class Meta:
        primary_key = CompositeKey("camera", "name")
