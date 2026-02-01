"""Peewee migrations -- 013_create_timeline_table.py.

Some examples (model - class or model name)::

    > Model = migrator.orm['model_name']            # Return model in current state by name

    > migrator.sql(sql)                             # Run custom SQL
    > migrator.run(func, *args, **kwargs)           # Run python code
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
        'CREATE TABLE IF NOT EXISTS "timeline" ("timestamp" DATETIME NOT NULL, "camera" VARCHAR(20) NOT NULL, "source" VARCHAR(20) NOT NULL, "source_id" VARCHAR(30), "class_type" VARCHAR(50) NOT NULL, "data" JSON)'
    )
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "timeline_camera" ON "timeline" ("camera")'
    )
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "timeline_source" ON "timeline" ("source")'
    )
    migrator.sql(
        'CREATE INDEX IF NOT EXISTS "timeline_source_id" ON "timeline" ("source_id")'
    )


def rollback(migrator, database, fake=False, **kwargs):
    pass
