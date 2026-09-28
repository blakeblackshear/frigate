# Dahua Access Controller Capability Checks

Run checks from the Frigate repository root. Use one subcommand per capability
so a failed operation does not hide results from another mechanism.

```bash
python3 -m dahua_test.test_controller --ip 192.0.2.20 --username admin \
  --password 'device-password' --provider cgi connection
python3 -m dahua_test.test_controller --ip 192.0.2.20 \
  --provider cgi --event-api snapManager live-events --seconds 30
python3 -m dahua_test.test_controller --ip 192.0.2.20 \
  --provider cgi doors
python3 -m dahua_test.test_controller --ip 192.0.2.20 \
  --provider cgi door-status --door-id 1
```

Available commands are `connection`, `system-info`, `card-owners`,
`historical-records`, `live-events`, `doors`, `door-status`, `open-door`,
`close-door`, `snapshot`, `preview`, and `preview-clip`. Card, door, image, and
event commands accept their own arguments. Use `--help` for details. Open and
close commands require an explicitly discovered door ID and are never part of
a read-only check.

Each result prints `PASS`, `FAIL`, or `NOT SUPPORTED` with structured output.
`PASS` for a door command means the controller acknowledged the relay command;
it does not claim a motor moved the door. Run snapshot or clip checks with
`--output` to save returned media.

The optional `netsdk` selection requires an installed provider registered under
the `frigate.dahua_netsdk` Python entry point. Its provider must use the
version-matched official Dahua Linux SDK and implement the async adapter
contract. Register exactly one entry point whose factory accepts a
`DahuaConnection` and returns an object with async methods:
`get_system_info()`, `get_access_records(start, end)`, `get_card_owners(card)`,
`listen_events(callback)`, `get_doors()`, `get_door_status(door_id)`,
`open_door(door_id)`, `close_door(door_id)`, and `get_snapshot()`. The optional
`get_preview_clip()` returns bytes, and `get_capabilities()` can report
provider-specific verification. No proprietary SDK binaries are bundled with
this repository.

Never put passwords in saved command history on shared systems. They are not
included in adapter logs or the test result diagnostics.
