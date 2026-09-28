"""Add provider configuration for Dahua access controllers."""


def migrate(migrator, database, fake=False, **kwargs):
    migrator.sql(
        'ALTER TABLE "access_control" ADD COLUMN "provider" '
        "VARCHAR(20) NOT NULL DEFAULT 'cgi'"
    )
    migrator.sql(
        'ALTER TABLE "access_control" ADD COLUMN "sdk_port" '
        "INTEGER NOT NULL DEFAULT 37777"
    )
    migrator.sql(
        'ALTER TABLE "access_control" ADD COLUMN "use_https" INTEGER NOT NULL DEFAULT 0'
    )
    migrator.sql(
        'ALTER TABLE "access_control" ADD COLUMN "provider_options" '
        "TEXT NOT NULL DEFAULT '{}'"
    )


def rollback(migrator, database, fake=False, **kwargs):
    migrator.sql('ALTER TABLE "access_control" DROP COLUMN "provider_options"')
    migrator.sql('ALTER TABLE "access_control" DROP COLUMN "use_https"')
    migrator.sql('ALTER TABLE "access_control" DROP COLUMN "sdk_port"')
    migrator.sql('ALTER TABLE "access_control" DROP COLUMN "provider"')
