import unittest


class TestStartup(unittest.TestCase):
    def test_main_invalid_config(self):
        import faulthandler
        import io
        import sys
        from unittest.mock import patch

        from ruamel.yaml.scanner import ScannerError

        from frigate.__main__ import main
        from frigate.app import FrigateApp
        from frigate.config import FrigateConfig


        def fake_load(install):
            raise ScannerError("Simulated error for invalid config")


        with patch.object(FrigateConfig, "load", fake_load):

            with patch.object(FrigateApp, "__init__", autospec=True) as mock_app_init:
                mock_app_init.return_value = None  # Avoid running the real initializer.

                with patch.object(FrigateApp, "start_config_editor") as mock_start_editor:

                    original_argv = sys.argv
                    sys.argv = ["Frigate"]

                    captured_output = io.StringIO()
                    original_stdout = sys.stdout
                    sys.stdout = captured_output

                    with patch.object(faulthandler, "enable", lambda: None):
                        try:
                            main()
                        except SystemExit:
                            pass
                        finally:
                            sys.stdout = original_stdout
                            sys.argv = original_argv

                    output = captured_output.getvalue()

                    self.assertIn("Your config file is not valid!", output)

                    mock_start_editor.assert_called_once()
                    mock_app_init.assert_called_once()
                    passed_config = mock_app_init.call_args[0][1]

                    self.assertEqual(
                        passed_config.environment_vars.get("INVALID_CONFIG"), "true",
                        "Expected INVALID_CONFIG to be set to 'true' in the config passed to FrigateApp"
                    )

