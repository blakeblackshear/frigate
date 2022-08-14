import os
import logging
from peewee import MySQLDatabase
from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase
from playhouse.shortcuts import ReconnectMixin
from frigate.const import CLIPS_DIR
from frigate.models import Event, Recordings

class ReconnectMySQLDatabase(ReconnectMixin, MySQLDatabase):
    pass

def resolve_db_from_config(config):
    db = None
    if config.database.type == "sqlite":
        # Migrate DB location
        old_db_path = os.path.join(CLIPS_DIR, "frigate.db")
        if not os.path.isfile(config.database.path) and os.path.isfile(
            old_db_path
        ):
            os.rename(old_db_path, config.database.path)

        # Migrate DB schema
        migrate_db = SqliteExtDatabase(config.database.path)

        # Run migrations
        del logging.getLogger("peewee_migrate").handlers[:]
        router = Router(migrate_db)
        router.run()

        migrate_db.close()

        db = SqliteQueueDatabase(config.database.path)
        models = [Event, Recordings]
        db.bind(models)
    elif config.database.type == "mysql":
        db = ReconnectMySQLDatabase(config.database.database, 
            host=config.database.host, 
            port=config.database.port, 
            user=config.database.user, 
            passwd=config.database.password
        )
        models = [Event, Recordings]
        db.bind(models)
        
        Event.create_table()
        Recordings.create_table()

    models = [Event, Recordings]
    db.bind(models)

    return db