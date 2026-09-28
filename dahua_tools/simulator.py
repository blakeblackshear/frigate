"""Persistent Dahua CGI-compatible access-controller simulator."""

import asyncio
import io
import json
import logging
import os
import sqlite3
import threading
import time
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
DB_PATH = Path(os.environ.get("DAHUA_SIM_DB", "dahua_simulator.db"))
PAGE = Path(__file__).with_name("simulator.html")


class Store:
    """Serialize short SQLite transactions and run them off the event loop."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.lock = threading.RLock()

    def _run(self, fn: Callable[[sqlite3.Connection], Any]) -> Any:
        with self.lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(self.path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys=ON")
            try:
                with conn:
                    return fn(conn)
            finally:
                conn.close()

    async def run(self, fn: Callable[[sqlite3.Connection], Any]) -> Any:
        """Execute a database operation in a worker thread."""
        return await asyncio.to_thread(self._run, fn)


store = Store(DB_PATH)
subscribers: set[asyncio.Queue[dict[str, Any]]] = set()


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    """Convert one SQLite row to a plain dictionary."""
    return dict(row) if row is not None else None


def rows(conn: sqlite3.Connection, sql: str, args: tuple = ()) -> list[dict[str, Any]]:
    """Return query rows as dictionaries."""
    return [dict(row) for row in conn.execute(sql, args)]


def one(conn: sqlite3.Connection, sql: str, args: tuple = ()) -> dict[str, Any] | None:
    """Return one query row, if present."""
    return row_dict(conn.execute(sql, args).fetchone())


def initialize(conn: sqlite3.Connection) -> None:
    """Create simulator-owned tables and the initial controller and doors."""
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS controller (
            id INTEGER PRIMARY KEY CHECK (id=1), name TEXT NOT NULL,
            model TEXT NOT NULL, serial TEXT NOT NULL, firmware TEXT NOT NULL,
            online INTEGER NOT NULL CHECK (online IN (0,1))
        );
        CREATE TABLE IF NOT EXISTS doors (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL,
            online INTEGER NOT NULL CHECK (online IN (0,1)),
            status TEXT NOT NULL CHECK (status IN ('open','closed'))
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
            active INTEGER NOT NULL CHECK (active IN (0,1))
        );
        CREATE TABLE IF NOT EXISTS cards (
            number TEXT PRIMARY KEY, name TEXT NOT NULL,
            active INTEGER NOT NULL CHECK (active IN (0,1))
        );
        CREATE TABLE IF NOT EXISTS card_users (
            card_number TEXT NOT NULL REFERENCES cards(number) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (card_number,user_id)
        );
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp REAL NOT NULL,
            code TEXT NOT NULL, door_id INTEGER, door_name TEXT,
            card_number TEXT, card_name TEXT, user_id INTEGER, user_name TEXT,
            result TEXT NOT NULL, method TEXT NOT NULL,
            details TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS events_time ON events(timestamp);
        """
    )
    if "card_name" not in {column[1] for column in conn.execute("PRAGMA table_info(events)")}:
        conn.execute("ALTER TABLE events ADD COLUMN card_name TEXT")
    conn.execute(
        "INSERT OR IGNORE INTO controller VALUES (1,?,?,?,?,?)",
        ("SIM-AC-001", "DHI-ASI2201-H-W", "SIM123456789", "SIM-1.0.0", 1),
    )
    conn.execute("INSERT OR IGNORE INTO doors VALUES (1,'Front door',1,'closed')")
    conn.execute("INSERT OR IGNORE INTO doors VALUES (2,'Side door',1,'closed')")


app = FastAPI(title="Dahua Access Controller Simulator")


@app.on_event("startup")
async def startup() -> None:
    """Prepare the separate simulator database."""
    await store.run(initialize)


class ControllerInput(BaseModel):
    """Editable controller identity and availability."""

    name: str = Field(min_length=1)
    model: str = Field(min_length=1)
    serial: str = Field(min_length=1)
    firmware: str = Field(min_length=1)
    online: bool = True


class DoorInput(BaseModel):
    """Editable door properties."""

    name: str = Field(min_length=1)
    online: bool = True
    status: str = Field(pattern="^(open|closed)$", default="closed")


class UserInput(BaseModel):
    """Editable simulated cardholder."""

    name: str = Field(min_length=1)
    active: bool = True


class CardInput(BaseModel):
    """Editable card and its owner IDs."""

    number: str = Field(min_length=1)
    name: str = ""
    active: bool = True
    user_ids: list[int] = Field(default_factory=list)


class EventInput(BaseModel):
    """Simulation request for a card scan or explicit access event."""

    door_id: int
    card_number: str | None = None
    user_id: int | None = None
    result: str = Field(pattern="^(auto|grant|deny)$", default="auto")
    live: bool = True
    timestamp: float | None = None


def require_controller(conn: sqlite3.Connection) -> dict[str, Any]:
    """Return the simulator controller row."""
    return one(conn, "SELECT * FROM controller WHERE id=1") or {}


def require_door(conn: sqlite3.Connection, door_id: int) -> dict[str, Any]:
    """Return a door or raise a client-visible error."""
    door = one(conn, "SELECT * FROM doors WHERE id=?", (door_id,))
    if door is None:
        raise HTTPException(404, f"Door {door_id} does not exist")
    return door


def event_row(conn: sqlite3.Connection, event_id: int) -> dict[str, Any]:
    """Return a stored event with its JSON details decoded."""
    event = one(conn, "SELECT * FROM events WHERE id=?", (event_id,)) or {}
    event["details"] = json.loads(event["details"])
    return event


def record_event(
    conn: sqlite3.Connection,
    *,
    code: str,
    door: dict[str, Any],
    result: str,
    method: str,
    card_number: str | None = None,
    card_name: str | None = None,
    user: dict[str, Any] | None = None,
    timestamp: float | None = None,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Save an identity snapshot so history survives user and card edits."""
    cursor = conn.execute(
        """INSERT INTO events
        (timestamp,code,door_id,door_name,card_number,card_name,user_id,user_name,result,method,details)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (
            timestamp if timestamp is not None else time.time(),
            code,
            door["id"],
            door["name"],
            card_number,
            card_name,
            user["id"] if user else None,
            user["name"] if user else None,
            result,
            method,
            json.dumps(details or {}),
        ),
    )
    return event_row(conn, cursor.lastrowid)


def publish(event: dict[str, Any]) -> None:
    """Send a committed event to current live subscribers."""
    for queue in tuple(subscribers):
        if queue.full():
            queue.get_nowait()
        queue.put_nowait(event)


@app.get("/", response_class=HTMLResponse)
async def home() -> str:
    """Serve the standalone simulator interface."""
    return await asyncio.to_thread(PAGE.read_text)


@app.get("/api/state")
async def state() -> dict[str, Any]:
    """Return all editable simulator state and recent events."""
    def load(conn: sqlite3.Connection) -> dict[str, Any]:
        cards = rows(conn, "SELECT * FROM cards ORDER BY number")
        links = rows(conn, "SELECT * FROM card_users ORDER BY user_id")
        for card in cards:
            card["user_ids"] = [link["user_id"] for link in links if link["card_number"] == card["number"]]
        events = rows(conn, "SELECT * FROM events ORDER BY id DESC LIMIT 100")
        for event in events:
            event["details"] = json.loads(event["details"])
        return {
            "controller": require_controller(conn),
            "doors": rows(conn, "SELECT * FROM doors ORDER BY id"),
            "users": rows(conn, "SELECT * FROM users ORDER BY id"),
            "cards": cards,
            "events": events,
        }
    return await store.run(load)


@app.put("/api/controller")
async def update_controller(value: ControllerInput) -> dict[str, Any]:
    """Change the simulated controller identity or availability."""
    def save(conn: sqlite3.Connection) -> dict[str, Any]:
        conn.execute(
            "UPDATE controller SET name=?,model=?,serial=?,firmware=?,online=? WHERE id=1",
            (value.name, value.model, value.serial, value.firmware, int(value.online)),
        )
        return require_controller(conn)
    return await store.run(save)


@app.post("/api/doors")
async def create_door(value: DoorInput) -> dict[str, Any]:
    """Create another addressable door."""
    def save(conn: sqlite3.Connection) -> dict[str, Any]:
        door_id = (conn.execute("SELECT MAX(id) FROM doors").fetchone()[0] or 0) + 1
        conn.execute("INSERT INTO doors VALUES (?,?,?,?)", (door_id, value.name, int(value.online), value.status))
        return require_door(conn, door_id)
    return await store.run(save)


@app.put("/api/doors/{door_id}")
async def update_door(door_id: int, value: DoorInput) -> dict[str, Any]:
    """Edit a door's name, availability, and open state."""
    def save(conn: sqlite3.Connection) -> dict[str, Any]:
        require_door(conn, door_id)
        conn.execute("UPDATE doors SET name=?,online=?,status=? WHERE id=?", (value.name, int(value.online), value.status, door_id))
        return require_door(conn, door_id)
    return await store.run(save)


@app.post("/api/users")
async def create_user(value: UserInput) -> dict[str, Any]:
    """Create a cardholder."""
    def save(conn: sqlite3.Connection) -> dict[str, Any]:
        user_id = conn.execute("INSERT INTO users (name,active) VALUES (?,?)", (value.name, int(value.active))).lastrowid
        return one(conn, "SELECT * FROM users WHERE id=?", (user_id,)) or {}
    return await store.run(save)


@app.put("/api/users/{user_id}")
async def update_user(user_id: int, value: UserInput) -> dict[str, Any]:
    """Change a cardholder's name or active state."""
    def save(conn: sqlite3.Connection) -> dict[str, Any]:
        if not one(conn, "SELECT id FROM users WHERE id=?", (user_id,)):
            raise HTTPException(404, "User does not exist")
        conn.execute("UPDATE users SET name=?,active=? WHERE id=?", (value.name, int(value.active), user_id))
        return one(conn, "SELECT * FROM users WHERE id=?", (user_id,)) or {}
    return await store.run(save)


@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int) -> dict[str, bool]:
    """Delete a cardholder and its card links, retaining event history."""
    def delete(conn: sqlite3.Connection) -> dict[str, bool]:
        if not conn.execute("DELETE FROM users WHERE id=?", (user_id,)).rowcount:
            raise HTTPException(404, "User does not exist")
        return {"deleted": True}
    return await store.run(delete)


def set_card(conn: sqlite3.Connection, value: CardInput, create: bool, old_number: str | None = None) -> dict[str, Any]:
    """Save one card and replace its many-to-many owner links."""
    if len(value.user_ids) != len(set(value.user_ids)):
        raise HTTPException(400, "Duplicate user IDs")
    for user_id in value.user_ids:
        if not one(conn, "SELECT id FROM users WHERE id=?", (user_id,)):
            raise HTTPException(400, f"User {user_id} does not exist")
    if create:
        if one(conn, "SELECT number FROM cards WHERE number=?", (value.number,)):
            raise HTTPException(409, "Card number already exists")
        conn.execute("INSERT INTO cards VALUES (?,?,?)", (value.number, value.name, int(value.active)))
    else:
        if not one(conn, "SELECT number FROM cards WHERE number=?", (old_number,)):
            raise HTTPException(404, "Card does not exist")
        if old_number != value.number and one(conn, "SELECT number FROM cards WHERE number=?", (value.number,)):
            raise HTTPException(409, "Card number already exists")
        conn.execute("DELETE FROM card_users WHERE card_number=?", (old_number,))
        conn.execute("UPDATE cards SET number=?,name=?,active=? WHERE number=?", (value.number, value.name, int(value.active), old_number))
    conn.executemany("INSERT INTO card_users VALUES (?,?)", [(value.number, user_id) for user_id in value.user_ids])
    return {**(one(conn, "SELECT * FROM cards WHERE number=?", (value.number,)) or {}), "user_ids": value.user_ids}


@app.post("/api/cards")
async def create_card(value: CardInput) -> dict[str, Any]:
    """Create a card and associate any number of users."""
    return await store.run(lambda conn: set_card(conn, value, True))


@app.put("/api/cards/{number}")
async def update_card(number: str, value: CardInput) -> dict[str, Any]:
    """Edit card details and replace its owner associations."""
    return await store.run(lambda conn: set_card(conn, value, False, number))


@app.delete("/api/cards/{number}")
async def delete_card(number: str) -> dict[str, bool]:
    """Delete a card and its owner links, retaining event history."""
    def delete(conn: sqlite3.Connection) -> dict[str, bool]:
        if not conn.execute("DELETE FROM cards WHERE number=?", (number,)).rowcount:
            raise HTTPException(404, "Card does not exist")
        return {"deleted": True}
    return await store.run(delete)


@app.post("/api/events")
async def simulate_access(value: EventInput) -> dict[str, Any]:
    """Evaluate a scan, apply an explicit result, and optionally publish it."""
    def save(conn: sqlite3.Connection) -> dict[str, Any]:
        controller = require_controller(conn)
        door = require_door(conn, value.door_id)
        card = one(conn, "SELECT * FROM cards WHERE number=?", (value.card_number,)) if value.card_number else None
        owners = rows(conn, "SELECT users.* FROM users JOIN card_users ON users.id=card_users.user_id WHERE card_users.card_number=? ORDER BY users.id", (value.card_number,)) if card else []
        user = next((owner for owner in owners if owner["id"] == value.user_id), None) if value.user_id else next((owner for owner in owners if owner["active"]), None)
        eligible = bool(controller["online"] and door["online"] and card and card["active"] and user and user["active"])
        result = ("grant" if eligible else "deny") if value.result == "auto" else value.result
        if value.live and not controller["online"]:
            raise HTTPException(409, "Controller is offline")
        if value.live and not door["online"]:
            raise HTTPException(409, "Door is offline")
        if value.live and result == "grant":
            conn.execute("UPDATE doors SET status='open' WHERE id=?", (door["id"],))
        return record_event(conn, code="AccessControl", door=door, result=result, method="card", card_number=value.card_number, card_name=card["name"] if card else None, user=user, timestamp=value.timestamp, details={"override": value.result != "auto", "eligible": eligible, "live": value.live})
    event = await store.run(save)
    if value.live:
        publish(event)
    return event


async def command_door(door_id: int, status: str) -> dict[str, Any]:
    """Change a door through the same path used by simulator and CGI clients."""
    def save(conn: sqlite3.Connection) -> dict[str, Any]:
        controller = require_controller(conn)
        door = require_door(conn, door_id)
        if not controller["online"] or not door["online"]:
            raise HTTPException(503, "Controller or door is offline")
        conn.execute("UPDATE doors SET status=? WHERE id=?", (status, door_id))
        return record_event(conn, code="DoorOpen" if status == "open" else "DoorClose", door=door, result=status, method="remote")
    event = await store.run(save)
    publish(event)
    return event


@app.post("/api/doors/{door_id}/open")
async def api_open(door_id: int) -> dict[str, Any]:
    """Unlock one online door and emit a live event."""
    return await command_door(door_id, "open")


@app.post("/api/doors/{door_id}/close")
async def api_close(door_id: int) -> dict[str, Any]:
    """Relock one online door and emit a live event."""
    return await command_door(door_id, "closed")


@app.get("/api/events")
async def history(start_time: float = 0, end_time: float | None = None, limit: int = Query(100, ge=1, le=1000)) -> list[dict[str, Any]]:
    """Read stored access and door events."""
    def load(conn: sqlite3.Connection) -> list[dict[str, Any]]:
        result = rows(conn, "SELECT * FROM events WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC,id DESC LIMIT ?", (start_time, end_time if end_time is not None else time.time(), limit))
        for item in result:
            item["details"] = json.loads(item["details"])
        return result
    return await store.run(load)


@app.get("/api/live")
async def live() -> StreamingResponse:
    """Stream committed simulator events to its management page."""
    async def stream():
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        subscribers.add(queue)
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            subscribers.discard(queue)
    return StreamingResponse(stream(), media_type="text/event-stream")


def cgi_fields(values: dict[str, Any]) -> str:
    """Encode Dahua-style key-value response lines."""
    return "\n".join(f"{key}={value}" for key, value in values.items()) + "\n"


async def online_controller() -> dict[str, Any]:
    """Reject CGI requests when the controller is offline."""
    controller = await store.run(require_controller)
    if not controller["online"]:
        raise HTTPException(503, "Controller offline")
    return controller


@app.get("/cgi-bin/magicBox.cgi")
async def magic_box(request: Request) -> PlainTextResponse:
    """Provide system information to the existing CGI adapter."""
    controller = await online_controller()
    if request.query_params.get("action") != "getSystemInfo":
        raise HTTPException(400, "Unsupported action")
    count = await store.run(lambda conn: conn.execute("SELECT COUNT(*) FROM doors").fetchone()[0])
    return PlainTextResponse(cgi_fields({"manufacturer": "Simulated Dahua", "deviceType": controller["model"], "serialNumber": controller["serial"], "deviceName": controller["name"], "firmwareVersion": controller["firmware"], "channelNumber": count, "ipAddress": request.url.hostname or "127.0.0.1"}))


@app.get("/cgi-bin/configManager.cgi")
async def config_manager(request: Request) -> PlainTextResponse:
    """Expose all configured doors for CGI discovery."""
    await online_controller()
    if request.query_params.get("action") != "getConfig" or request.query_params.get("name") != "AccessControl":
        raise HTTPException(400, "Unsupported action")
    doors = await store.run(lambda conn: rows(conn, "SELECT * FROM doors ORDER BY id"))
    return PlainTextResponse(cgi_fields({f"table.AccessControl[{door['id'] - 1}].DoorName": door["name"] for door in doors}))


@app.get("/cgi-bin/accessControl.cgi")
async def access_control(request: Request) -> PlainTextResponse:
    """Read or change a door through the adapter's CGI commands."""
    await online_controller()
    action = request.query_params.get("action")
    try:
        door_id = int(request.query_params.get("channel", ""))
    except ValueError as err:
        raise HTTPException(400, "Invalid channel") from err
    if action == "getDoorStatus":
        door = await store.run(lambda conn: require_door(conn, door_id))
        return PlainTextResponse(cgi_fields({"DoorStatus": door["status"], "Online": door["online"]}))
    if action in {"openDoor", "closeDoor"}:
        await command_door(door_id, "open" if action == "openDoor" else "closed")
        return PlainTextResponse("OK")
    raise HTTPException(400, "Unsupported action")


@app.get("/cgi-bin/recordFinder.cgi")
async def record_finder(request: Request) -> PlainTextResponse:
    """Expose paged history and many-to-many card ownership to CGI clients."""
    await online_controller()
    params = request.query_params
    if params.get("action") != "find":
        raise HTTPException(400, "Unsupported action")
    try:
        offset = max(0, int(params.get("StartIndex", "0")))
        count = min(1024, max(1, int(params.get("count", "100"))))
    except ValueError as err:
        raise HTTPException(400, "Invalid paging value") from err
    name = params.get("name")
    def load(conn: sqlite3.Connection) -> tuple[int, list[dict[str, Any]]]:
        if name == "AccessControlCard":
            number = params.get("condition.CardNo", "")
            all_rows = rows(conn, "SELECT cards.number AS CardNo,users.name AS UserName,users.id AS UserID FROM cards JOIN card_users ON cards.number=card_users.card_number JOIN users ON users.id=card_users.user_id WHERE cards.number=? ORDER BY users.id", (number,))
        elif name == "AccessControlCardRec":
            try:
                start = float(params.get("StartTime", "0"))
                end = float(params.get("EndTime", str(time.time())))
            except ValueError as err:
                raise HTTPException(400, "Invalid time range") from err
            all_rows = rows(conn, "SELECT timestamp AS CreateTime,code AS EventType,door_id AS DoorID,card_number AS CardNo,card_name AS CardName,user_id AS UserID,user_name AS UserName,result AS Status,method AS Method FROM events WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp,id", (start, end))
        else:
            raise HTTPException(400, "Unsupported record type")
        return len(all_rows), all_rows[offset:offset + count]
    total, page = await store.run(load)
    fields: dict[str, Any] = {"found": len(page), "totalCount": total}
    for index, item in enumerate(page):
        for key, value in item.items():
            if value is not None:
                fields[f"records[{index}].{key}"] = value
    return PlainTextResponse(cgi_fields(fields))


@app.get("/cgi-bin/eventManager.cgi")
async def event_manager(request: Request) -> StreamingResponse:
    """Publish Dahua-style events to the existing live event parser."""
    await online_controller()
    if request.query_params.get("action") != "attach":
        raise HTTPException(400, "Unsupported action")
    async def stream():
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        subscribers.add(queue)
        try:
            yield "\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                except TimeoutError:
                    yield "heartbeat\n"
                    continue
                data = {"timestamp": event["timestamp"], "DoorID": event["door_id"], "CardNo": event["card_number"], "CardName": event["card_name"], "UserID": event["user_id"], "UserName": event["user_name"], "Status": event["result"], "Method": event["method"]}
                yield f"Code={event['code']};action=Pulse;index={event['id']};data={json.dumps(data)}\n\n"
        finally:
            subscribers.discard(queue)
    return StreamingResponse(stream(), media_type="text/plain")


@app.get("/cgi-bin/snapshot.cgi")
async def snapshot() -> Response:
    """Return a labeled synthetic JPEG preview image."""
    controller = await online_controller()
    from PIL import Image, ImageDraw

    def render() -> bytes:
        image = Image.new("RGB", (640, 360), "#142335")
        draw = ImageDraw.Draw(image)
        draw.text((32, 32), "SIMULATED ACCESS CONTROLLER", fill="white")
        draw.text((32, 72), controller["name"], fill="white")
        draw.text((32, 110), controller["model"], fill="white")
        draw.text((32, 320), datetime.now(timezone.utc).isoformat(), fill="white")
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        return buffer.getvalue()
    return Response(await asyncio.to_thread(render), media_type="image/jpeg")


@app.get("/sim/status")
async def legacy_status() -> dict[str, Any]:
    """Retain the legacy simulator status endpoint."""
    return (await state())["controller"]


@app.get("/sim/{mode}")
async def legacy_mode(mode: str, request: Request) -> Response:
    """Retain basic controls used by the former Tkinter test utility."""
    if mode in {"online", "offline"}:
        value = mode == "online"
        await store.run(lambda conn: conn.execute("UPDATE controller SET online=? WHERE id=1", (int(value),)))
        return PlainTextResponse(mode.upper())
    if mode == "event":
        params = request.query_params
        kind = params.get("type", "grant")
        if kind in {"grant", "deny"}:
            event = await simulate_access(EventInput(door_id=int(params.get("door", "1")), card_number=params.get("card"), result=kind))
        elif kind in {"open", "close"}:
            event = await command_door(int(params.get("door", "1")), "open" if kind == "open" else "closed")
        else:
            raise HTTPException(400, "Unsupported event type")
        return Response(json.dumps(event), media_type="application/json")
    raise HTTPException(404, "Unknown simulator action")


def main() -> None:
    """Run the local simulator without starting the employee portal."""
    import uvicorn

    uvicorn.run(app, host=os.environ.get("DAHUA_SIM_HOST", "127.0.0.1"), port=int(os.environ.get("DAHUA_SIM_PORT", "8080")))


if __name__ == "__main__":
    main()
