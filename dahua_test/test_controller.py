"""Run individual capability checks against a Dahua access controller.

Run from the repository root with ``python3 -m dahua_test.test_controller``.
Door actions require an explicit discovered door ID and are never run by the
read-only capability checks.
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

from frigate.dahua_adapter import (
    DahuaAccessController,
    DahuaNotSupported,
    DahuaOperationError,
)


def _controller(args: argparse.Namespace) -> DahuaAccessController:
    return DahuaAccessController(
        ip=args.ip,
        username=args.username,
        password=args.password,
        port=args.port,
        use_auth=not args.no_auth,
        provider=args.provider,
        scheme="https" if args.https else "http",
        sdk_port=args.sdk_port,
        timeout=args.timeout,
        provider_options={"event_api": args.event_api},
    )


def _report(name: str, operation, args: argparse.Namespace) -> int:
    provider = args.provider
    try:
        controller = _controller(args)
        provider = controller.provider_name
        result = operation(controller)
    except DahuaNotSupported as err:
        _print(name, "NOT SUPPORTED", provider=provider, diagnostics=err.as_dict())
        return 2
    except Exception as err:  # noqa: BLE001 - expose unexpected provider failures
        diagnostics = (
            err.as_dict()
            if isinstance(err, DahuaOperationError)
            else DahuaOperationError(
                provider,
                name,
                f"{type(err).__name__}: {err}",
                endpoint=name,
            ).as_dict()
        )
        _print(name, "FAIL", provider=provider, diagnostics=diagnostics)
        return 1
    _print(name, "PASS", provider=provider, result=result)
    return 0


def _print(name: str, status: str, **values) -> None:
    print(
        json.dumps(
            {"test": name, "status": status, **values},
            ensure_ascii=False,
            indent=2,
            default=str,
        )
    )


def _test_online(controller: DahuaAccessController):
    info = controller.get_system_info()
    if not info:
        raise DahuaNotSupported(
            controller.provider_name,
            "is_online",
            "Controller returned no system information",
            endpoint="get_system_info",
        )
    return {"provider": controller.provider_name, "online": True, "system_info": info}


def _test_system_info(controller: DahuaAccessController):
    info = controller.get_system_info()
    if not info:
        raise ValueError("The provider returned empty system information")
    return info


def _test_records(controller: DahuaAccessController):
    end = datetime.now().astimezone()
    start = end - timedelta(hours=24)
    rows = controller.get_access_records(start, end)
    return {"start": start, "end": end, "count": len(rows), "records": rows}


def _test_card_owners(controller: DahuaAccessController, card_number: str):
    names = controller.get_card_owners(card_number)
    return {"card_number": card_number, "owners": names}


def _test_doors(controller: DahuaAccessController):
    return {"doors": controller.get_doors()}


def _test_door_status(controller: DahuaAccessController, door_id: str):
    status = controller.get_door_status(door_id)
    if status.get("status") == "unknown":
        raise ValueError(f"Door {door_id} responded with an unrecognized status")
    return status


def _test_door_command(controller: DahuaAccessController, door_id: str, action: str):
    doors = controller.get_doors()
    if not any(str(door.get("id")) == door_id for door in doors):
        raise ValueError(f"Door {door_id} was not found by door discovery")
    if action == "open":
        return controller.open_door(door_id)
    return controller.close_door(door_id)


def _test_snapshot(controller: DahuaAccessController, output: str | None):
    image = controller.get_snapshot()
    path = None
    if output:
        target = Path(output)
        target.write_bytes(image)
        path = str(target)
    return {"content_type": "image/jpeg", "bytes": len(image), "saved_to": path}


def _test_preview(controller: DahuaAccessController):
    result = controller.get_preview()
    if not result.get("available"):
        diagnostics = result.get("diagnostic") or {
            "message": "The controller has no available native preview"
        }
        if diagnostics.get("exception_type") == "DahuaNotSupported":
            raise DahuaNotSupported(
                controller.provider_name,
                "get_preview",
                str(diagnostics.get("message") or "No native preview is supported"),
                endpoint=diagnostics.get("endpoint"),
                status=diagnostics.get("http_status"),
                dahua_code=diagnostics.get("dahua_error_code"),
                response_body=diagnostics.get("response_body"),
            )
        raise DahuaOperationError(
            controller.provider_name,
            "get_preview",
            "No native preview image is available",
            response_body=json.dumps(diagnostics),
        )
    return result


def _test_preview_clip(controller: DahuaAccessController, output: str | None):
    clip = controller.get_preview_clip()
    target = Path(output) if output else None
    if target:
        target.write_bytes(clip)
    return {"bytes": len(clip), "saved_to": str(target) if target else None}


async def _observe_live(controller: DahuaAccessController, seconds: int) -> dict:
    received: list[dict] = []
    waiter = asyncio.create_task(
        controller.listen_events_async(lambda event: received.append(event))
    )
    try:
        await asyncio.sleep(seconds)
    finally:
        waiter.cancel()
        await asyncio.gather(waiter, return_exceptions=True)
    if not received:
        raise DahuaOperationError(
            controller.provider_name,
            "listen_events",
            f"No access event received during the {seconds}-second observation window",
            endpoint="/cgi-bin/snapManager.cgi?action=attachFileProc",
        )
    return {
        "observed_seconds": seconds,
        "count": len(received),
        "events": [
            DahuaAccessController.normalize_event(event, "test") for event in received
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Test one Dahua controller capability")
    parser.add_argument("--ip", required=True)
    parser.add_argument("--provider", choices=("cgi", "netsdk"), default="cgi")
    parser.add_argument("--port", type=int, default=80, help="HTTP or HTTPS port")
    parser.add_argument("--sdk-port", type=int, default=37777)
    parser.add_argument(
        "--event-api", choices=("eventManager", "snapManager"), default="eventManager"
    )
    parser.add_argument("--https", action="store_true")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="")
    parser.add_argument("--no-auth", action="store_true")
    parser.add_argument("--timeout", type=float, default=5)
    subparsers = parser.add_subparsers(dest="command", required=True)
    commands = (
        "connection",
        "system-info",
        "historical-records",
        "live-events",
        "doors",
        "snapshot",
        "preview",
        "preview-clip",
    )
    for name in commands:
        subparsers.add_parser(name)
    owners = subparsers.add_parser("card-owners")
    owners.add_argument("--card-number", required=True)
    for name in ("door-status", "open-door", "close-door"):
        command = subparsers.add_parser(name)
        command.add_argument("--door-id", required=True)
    subparsers.choices["live-events"].add_argument("--seconds", type=int, default=15)
    subparsers.choices["snapshot"].add_argument("--output")
    subparsers.choices["preview-clip"].add_argument("--output")
    args = parser.parse_args()

    try:
        if args.command == "connection":
            return _report(args.command, _test_online, args)
        if args.command == "system-info":
            return _report(args.command, _test_system_info, args)
        if args.command == "historical-records":
            return _report(args.command, _test_records, args)
        if args.command == "card-owners":
            return _report(
                args.command,
                lambda controller: _test_card_owners(controller, args.card_number),
                args,
            )
        if args.command == "doors":
            return _report(args.command, _test_doors, args)
        if args.command == "door-status":
            return _report(
                args.command,
                lambda controller: _test_door_status(controller, args.door_id),
                args,
            )
        if args.command in {"open-door", "close-door"}:
            action = "open" if args.command == "open-door" else "close"
            return _report(
                args.command,
                lambda controller: _test_door_command(controller, args.door_id, action),
                args,
            )
        if args.command == "snapshot":
            return _report(
                args.command,
                lambda controller: _test_snapshot(controller, args.output),
                args,
            )
        if args.command == "preview":
            return _report(args.command, _test_preview, args)
        if args.command == "preview-clip":
            return _report(
                args.command,
                lambda controller: _test_preview_clip(controller, args.output),
                args,
            )
        if args.command == "live-events":
            return _report(
                args.command,
                lambda controller: asyncio.run(
                    _observe_live(controller, args.seconds)
                ),
                args,
            )
    except DahuaNotSupported as err:
        _print(args.command, "NOT SUPPORTED", diagnostics=err.as_dict())
        return 2
    except Exception as err:  # noqa: BLE001 - keep CLI diagnostics actionable
        diagnostics = (
            err.as_dict()
            if isinstance(err, DahuaOperationError)
            else {
                "exception_type": type(err).__name__,
                "message": str(err),
            }
        )
        _print(args.command, "FAIL", diagnostics=diagnostics)
        return 1
    return 1


if __name__ == "__main__":
    sys.exit(main())
