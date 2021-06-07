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
import peewee as pw

from frigate.models import Recordings

SQL = pw.SQL


def migrate(migrator, database, fake=False, **kwargs):
    migrator.create_model(Recordings)

    def add_index():
        # First add the index here, because there is a bug in peewee_migrate
        # when trying to create an multi-column index in the same migration
        # as the table: https://github.com/klen/peewee_migrate/issues/19
        Recordings.add_index("start_time", "end_time")
        Recordings.create_table()

    migrator.python(add_index)


def rollback(migrator, database, fake=False, **kwargs):
    migrator.remove_model(Recordings)
