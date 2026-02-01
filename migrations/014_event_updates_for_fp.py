"""Peewee migrations

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

from frigate.models import Event

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.add_fields(
        Event,
        score=pw.FloatField(null=True),
        model_hash=pw.CharField(max_length=32, null=True),
        detector_type=pw.CharField(max_length=32, null=True),
        model_type=pw.CharField(max_length=32, null=True),
    )

    migrator.drop_not_null(Event, "area", "false_positive")
    migrator.add_default(Event, "false_positive", 0)


def rollback(migrator, database, fake=False, **kwargs):
    pass
