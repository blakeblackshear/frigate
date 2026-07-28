"""Tests for the shared runtime config swap helper."""

import unittest
from unittest.mock import MagicMock

from frigate.api.config_util import swap_runtime_config
from frigate.config.holder import ConfigHolder


class TestSwapRuntimeConfig(unittest.TestCase):
    """swap_runtime_config rebinds every collaborator to the new config."""

    def _make_app(self) -> MagicMock:
        app = MagicMock()
        app.dispatcher.comms = [MagicMock(), MagicMock()]
        app.config_holder = ConfigHolder(MagicMock(name="boot_config"))
        return app

    def test_rebinds_all_references(self) -> None:
        app = self._make_app()
        config = MagicMock(name="new_config")

        swap_runtime_config(app, config)

        self.assertIs(app.frigate_config, config)
        app.genai_manager.update_config.assert_called_once_with(config)
        app.profile_manager.update_config.assert_called_once_with(config)
        self.assertIs(app.stats_emitter.config, config)
        self.assertIs(app.dispatcher.config, config)
        for comm in app.dispatcher.comms:
            self.assertIs(comm.config, config)

    def test_reapplies_runtime_state_after_swap(self) -> None:
        app = self._make_app()
        config = MagicMock(name="new_config")

        swap_runtime_config(app, config)

        # the swap rebuilds cameras from yaml, so overrides must be re-layered
        app.dispatcher.reapply_runtime_state_to_config.assert_called_once_with()

    def test_updates_the_config_holder(self) -> None:
        app = self._make_app()
        holder = app.config_holder
        config = MagicMock(name="new_config")

        swap_runtime_config(app, config)

        self.assertIs(holder.config, config)

    def test_deferred_factory_builds_from_the_swapped_config(self) -> None:
        """A watchdog-style factory must not rebuild from the boot config.

        The factories in FrigateApp are lambdas evaluated when a process is
        restarted, long after a user may have saved. Reading through the
        holder is what keeps a rebuilt process from reverting every change
        made since Frigate started.
        """
        app = self._make_app()
        holder = app.config_holder
        boot_config = holder.config
        factory = lambda: holder.config  # noqa: E731
        self.assertIs(factory(), boot_config)

        config = MagicMock(name="new_config")
        swap_runtime_config(app, config)

        self.assertIs(factory(), config)

    def test_tolerates_missing_optional_collaborators(self) -> None:
        app = MagicMock()
        app.profile_manager = None
        app.stats_emitter = None
        app.dispatcher = None
        app.config_holder = None
        config = MagicMock(name="new_config")

        # must not raise when the optional collaborators are absent
        swap_runtime_config(app, config)

        self.assertIs(app.frigate_config, config)
        app.genai_manager.update_config.assert_called_once_with(config)


if __name__ == "__main__":
    unittest.main()
