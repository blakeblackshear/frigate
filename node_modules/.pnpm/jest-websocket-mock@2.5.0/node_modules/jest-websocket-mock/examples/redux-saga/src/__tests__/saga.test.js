import WS from "jest-websocket-mock";
import makeStore from "../store";
import { actions } from "../store/reducer";

let ws, store;
beforeEach(async () => {
  ws = new WS("ws://localhost:8080");
  store = makeStore();
  await ws.connected;
  ws.send("Hello there");
});
afterEach(() => {
  WS.clean();
});

describe("The saga", () => {
  it("connects to the websocket server", () => {
    expect(store.getState().messages).toEqual([
      { side: "received", text: "Hello there" },
    ]);
  });

  it("stores new messages", () => {
    ws.send("how you doin?");
    expect(store.getState().messages).toEqual([
      { side: "received", text: "Hello there" },
      { side: "received", text: "how you doin?" },
    ]);
  });

  it("stores new messages received shortly one after the other", () => {
    ws.send("hey");
    ws.send("hey?");
    ws.send("hey??");
    ws.send("hey???");
    expect(store.getState().messages).toEqual([
      { side: "received", text: "Hello there" },
      { side: "received", text: "hey" },
      { side: "received", text: "hey?" },
      { side: "received", text: "hey??" },
      { side: "received", text: "hey???" },
    ]);
  });

  it("sends messages", async () => {
    store.dispatch(actions.send("oh hi Mark"));
    await expect(ws).toReceiveMessage("oh hi Mark");

    expect(ws).toHaveReceivedMessages(["oh hi Mark"]);
    expect(store.getState().messages).toEqual([
      { side: "received", text: "Hello there" },
      { side: "sent", text: "oh hi Mark" },
    ]);
  });

  it("sends messages in a quick succession", async () => {
    store.dispatch(actions.send("hey"));
    store.dispatch(actions.send("hey?"));
    store.dispatch(actions.send("hey??"));
    store.dispatch(actions.send("hey???"));
    await expect(ws).toReceiveMessage("hey");
    await expect(ws).toReceiveMessage("hey?");
    await expect(ws).toReceiveMessage("hey??");
    await expect(ws).toReceiveMessage("hey???");

    expect(ws).toHaveReceivedMessages(["hey", "hey?", "hey??", "hey???"]);
    expect(store.getState().messages).toEqual([
      { side: "received", text: "Hello there" },
      { side: "sent", text: "hey" },
      { side: "sent", text: "hey?" },
      { side: "sent", text: "hey??" },
      { side: "sent", text: "hey???" },
    ]);
  });

  it("marks the connection as active when it successfully connects to the ws server", () => {
    expect(store.getState().connected).toBe(true);
  });

  it("marks the connection as inactive after a disconnect", async () => {
    ws.close();
    await ws.closed;
    expect(store.getState().connected).toBe(false);
  });

  it("marks the connection as inactive after a connection error", async () => {
    ws.error();
    await ws.closed;
    expect(store.getState().connected).toBe(false);
  });

  it("reconnects after losing the ws connection", async () => {
    // We cannot use jest.useFakeTimers because mock-socket has to work around timing issues
    jest.spyOn(window, "setTimeout");

    ws.error();
    await ws.closed;
    expect(store.getState().connected).toBe(false);

    // Trigger our delayed reconnection
    window.setTimeout.mock.calls.forEach(([cb, , ...args]) => cb(...args));

    await ws.connected; // reconnected!
    expect(store.getState().connected).toBe(true);

    window.setTimeout.mockRestore();
  });
});
