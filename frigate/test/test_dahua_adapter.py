"""Tests for Dahua provider parsing and normalized access events."""

import unittest
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from frigate.dahua_adapter import (
    CgiProvider,
    DahuaAccessController,
    DahuaConnection,
    DahuaNotSupported,
    DahuaOperationError,
    _safe_body,
)


class TestDahuaAdapter(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.provider = CgiProvider(DahuaConnection(ip="192.0.2.10"))

    async def test_system_info_normalizes_reported_fields_only(self):
        with patch.object(
            self.provider,
            "_text",
            new=AsyncMock(
                return_value=(
                    "deviceType=DHI-ASI2201-H-W\n"
                    "serialNumber=SN-1\n"
                    "version=1.2.3\n"
                    "deviceName=Lobby\n"
                    "IPAddress=192.0.2.10"
                )
            ),
        ):
            info = await self.provider.get_system_info()

        self.assertEqual(info["model"], "DHI-ASI2201-H-W")
        self.assertEqual(info["serial_number"], "SN-1")
        self.assertEqual(info["firmware_version"], "1.2.3")
        self.assertEqual(info["device_name"], "Lobby")
        self.assertEqual(info["ip_address"], "192.0.2.10")
        self.assertNotIn("manufacturer", info)

    async def test_history_fetches_each_page_and_keeps_record_fields(self):
        calls: list[int] = []

        async def page(_operation, _path, params):
            start_index = params["StartIndex"]
            calls.append(start_index)
            text = ["totalCount=250", "found=100"]
            count = min(100, 250 - start_index)
            for index in range(count):
                row_index = start_index + index
                text.append(f"records[{index}].RecNo={row_index}")
                text.append(f"records[{index}].CardNo=00{row_index}")
            return "\n".join(text)

        with patch.object(self.provider, "_text", side_effect=page):
            records = await self.provider.get_access_records(
                datetime(2026, 1, 1, tzinfo=UTC), datetime(2026, 1, 2, tzinfo=UTC)
            )

        self.assertEqual(calls, [0, 100, 200])
        self.assertEqual(len(records), 250)
        self.assertEqual(records[0]["CardNo"], "000")
        self.assertEqual(records[-1]["RecNo"], "249")

    async def test_history_repeated_page_fails_instead_of_returning_partial_data(self):
        repeated_fields = ["totalCount=150", "found=100"]
        for index in range(100):
            repeated_fields.append(f"records[{index}].RecNo={index}")
        repeated = "\n".join(repeated_fields)
        with (
            patch.object(self.provider, "_text", new=AsyncMock(return_value=repeated)),
            self.assertRaises(DahuaOperationError),
        ):
            await self.provider.get_access_records(
                datetime(2026, 1, 1, tzinfo=UTC),
                datetime(2026, 1, 2, tzinfo=UTC),
            )

    async def test_card_owner_lookup_preserves_card_number_and_names(self):
        response = (
            "records[0].CardNo=000123\n"
            "records[0].CardName=Alice\n"
            "records[0].UserNames[0]=Alex"
        )
        with patch.object(self.provider, "_text", new=AsyncMock(return_value=response)):
            owners = await self.provider.get_card_owners("000123")

        self.assertEqual(owners, ["Alex", "Alice"])

    async def test_door_discovery_does_not_invent_a_single_door(self):
        with (
            patch.object(
                self.provider, "_get_door_config", new=AsyncMock(return_value={})
            ),
            self.assertRaises(DahuaNotSupported),
        ):
            await self.provider.get_doors()

    async def test_door_discovery_keeps_each_reported_door(self):
        config = {
            "AccessControl[0].DoorName": "Main",
            "AccessControl[1].DoorName": "Garage",
        }
        with patch.object(
            self.provider, "_get_door_config", new=AsyncMock(return_value=config)
        ):
            doors = await self.provider.get_doors()

        self.assertEqual([door["id"] for door in doors], ["1", "2"])
        self.assertEqual([door["name"] for door in doors], ["Main", "Garage"])
        self.assertTrue(all("raw" in door for door in doors))

    async def test_door_commands_require_a_discovered_id(self):
        with (
            patch.object(
                self.provider,
                "_get_door_config",
                new=AsyncMock(return_value={"AccessControl[0].DoorName": "Main"}),
            ),
            patch.object(
                self.provider, "_text", new=AsyncMock(return_value="OK")
            ) as request,
        ):
            result = await self.provider.open_door("1")

        self.assertTrue(result["accepted"])
        self.assertEqual(result["door_id"], "1")
        self.assertEqual(request.await_args.args[0], "open_door")

    async def test_event_parser_keeps_access_control_data(self):
        event = CgiProvider._event_from_fields(
            {
                "Code": "AccessControl",
                "action": "Pulse",
                "Data.CardNo": "000123",
                "Data.Status": "0",
                "Data.Method": "1",
            }
        )
        self.assertIsNotNone(event)
        normalized = DahuaAccessController.normalize_event(event, "front-door")
        self.assertEqual(normalized["device_id"], "front-door")
        self.assertEqual(normalized["card_number"], "000123")
        self.assertEqual(normalized["access_status"], "0")
        self.assertEqual(normalized["authentication_method"], "1")

    async def test_raw_provider_event_redacts_secrets(self):
        event = DahuaAccessController.sanitize_raw_event(
            {"CardNo": "000123", "Password": "secret", "nested": {"PIN": "1234"}}
        )
        self.assertEqual(event["CardNo"], "000123")
        self.assertEqual(event["Password"], "<redacted>")
        self.assertEqual(event["nested"]["PIN"], "<redacted>")
        self.assertNotIn("secret", _safe_body('{"Password":"secret"}'))

    async def test_preview_clip_is_explicitly_unsupported_for_cgi(self):
        with self.assertRaises(DahuaNotSupported):
            await self.provider.get_preview_clip()


if __name__ == "__main__":
    unittest.main()
