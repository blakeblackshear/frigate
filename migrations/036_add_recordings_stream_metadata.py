"""Peewee migrations -- 036_add_recordings_stream_metadata.py.

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

import peewee as pw

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.sql(
        'ALTER TABLE "recordings" ADD COLUMN "stream_type" VARCHAR(8) NOT NULL DEFAULT \'main\''
    )
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "recordings_camera_stream_type" ON "recordings" ("camera", "stream_type")'
    )

    # nullable so legacy rows stay NULL, meaning unknown
    migrator.sql('ALTER TABLE "recordings" ADD COLUMN "has_audio" INTEGER')
    migrator.sql('ALTER TABLE "recordings" ADD COLUMN "audio_rate" INTEGER')
    migrator.sql('ALTER TABLE "recordings" ADD COLUMN "audio_codec" TEXT')
    migrator.sql('ALTER TABLE "recordings" ADD COLUMN "video_codec" TEXT')

    # keyframe offsets in ms from segment start; nullable so legacy rows
    # stay NULL and playback serves whole files for them
    migrator.sql('ALTER TABLE "recordings" ADD COLUMN "keyframes" TEXT')


def rollback(migrator, database, fake=False, **kwargs):
    pass
