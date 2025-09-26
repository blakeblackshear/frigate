import WS from "../websocket";

describe("The WS helper", () => {
  afterEach(() => {
    WS.clean();
  });

  it("keeps track of received messages, and yields them as they come in", async () => {
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");

    await server.connected;
    client.send("hello");
    const message = await server.nextMessage;
    expect(message).toBe("hello");
    expect(server.messages).toEqual(["hello"]);
  });

  it("cleans up connected clients and messages on 'clean'", async () => {
    const server = new WS("ws://localhost:1234");
    const client1 = new WebSocket("ws://localhost:1234");
    await server.connected;
    const client2 = new WebSocket("ws://localhost:1234");
    await server.connected;

    const connections = { client1: true, client2: true };
    const onclose = (name: "client1" | "client2") => () => {
      connections[name] = false;
    };
    client1.onclose = onclose("client1");
    client2.onclose = onclose("client2");

    client1.send("hello 1");
    await server.nextMessage;
    client2.send("hello 2");
    await server.nextMessage;
    expect(server.messages).toEqual(["hello 1", "hello 2"]);

    WS.clean();
    expect(WS.instances).toEqual([]);
    expect(server.messages).toEqual([]);
    expect(connections).toEqual({ client1: false, client2: false });
  });

  it("handles messages received in a quick succession", async () => {
    expect.hasAssertions();
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");
    await server.connected;

    "abcdef".split("").forEach(client.send.bind(client));

    let waitedEnough: (value: void) => void;
    const waitABit = new Promise((done) => (waitedEnough = done));

    setTimeout(async () => {
      await server.nextMessage;
      await server.nextMessage;
      await server.nextMessage;
      await server.nextMessage;
      await server.nextMessage;
      await server.nextMessage;

      "xyz".split("").forEach(client.send.bind(client));
      await server.nextMessage;
      await server.nextMessage;
      await server.nextMessage;
      waitedEnough();
    }, 500);

    await waitABit;
    expect(server.messages).toEqual("abcdefxyz".split(""));
  });

  it("sends messages to connected clients", async () => {
    const server = new WS("ws://localhost:1234");
    const client1 = new WebSocket("ws://localhost:1234");
    await server.connected;
    const client2 = new WebSocket("ws://localhost:1234");
    await server.connected;

    interface Messages {
      client1: Array<string>;
      client2: Array<string>;
    }
    const messages: Messages = { client1: [], client2: [] };
    client1.onmessage = (e) => {
      messages.client1.push(e.data);
    };
    client2.onmessage = (e) => {
      messages.client2.push(e.data);
    };

    server.send("hello everyone");
    expect(messages).toEqual({
      client1: ["hello everyone"],
      client2: ["hello everyone"],
    });
  });

  it("seamlessly handles JSON protocols", async () => {
    const server = new WS("ws://localhost:1234", { jsonProtocol: true });
    const client = new WebSocket("ws://localhost:1234");

    await server.connected;
    client.send(`{ "type": "GREETING", "payload": "hello" }`);
    const received = await server.nextMessage;
    expect(server.messages).toEqual([{ type: "GREETING", payload: "hello" }]);
    expect(received).toEqual({ type: "GREETING", payload: "hello" });

    let message = null;
    client.onmessage = (e) => {
      message = e.data;
    };

    server.send({ type: "CHITCHAT", payload: "Nice weather today" });
    expect(message).toEqual(
      `{"type":"CHITCHAT","payload":"Nice weather today"}`
    );
  });

  it("rejects connections that fail the verifyClient option", async () => {
    const verifyClient = jest.fn().mockReturnValue(false);
    new WS("ws://localhost:1234", { verifyClient: verifyClient });
    const errorCallback = jest.fn();

    await expect(
      new Promise((resolve, reject) => {
        errorCallback.mockImplementation(reject);
        const client = new WebSocket("ws://localhost:1234");
        client.onerror = errorCallback;
        client.onopen = resolve;
      })
      // WebSocket onerror event gets called with an event of type error and not an error
    ).rejects.toEqual(expect.objectContaining({ type: "error" }));

    expect(verifyClient).toHaveBeenCalledTimes(1);
    expect(errorCallback).toHaveBeenCalledTimes(1);

    // ensure that the WebSocket mock set up by mock-socket is still present
    expect(WebSocket).toBeDefined();
  });

  it("rejects connections that fail the selectProtocol option", async () => {
    const selectProtocol = () => null;
    new WS("ws://localhost:1234", { selectProtocol });
    const errorCallback = jest.fn();

    await expect(
      new Promise((resolve, reject) => {
        errorCallback.mockImplementationOnce(reject);
        const client = new WebSocket("ws://localhost:1234", "foo");
        client.onerror = errorCallback;
        client.onopen = resolve;
      })
    ).rejects.toEqual(
      // WebSocket onerror event gets called with an event of type error and not an error
      expect.objectContaining({
        type: "error",
        currentTarget: expect.objectContaining({ protocol: "foo" }),
      })
    );

    // ensure that the WebSocket mock set up by mock-socket is still present
    expect(WebSocket).toBeDefined();
  });

  it("closes the connection", async () => {
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");
    const closeCallback = jest.fn();
    await server.connected;

    client.onclose = closeCallback;

    server.send("hello everyone");
    server.close();

    expect(closeCallback).toHaveBeenCalledTimes(1);
    expect(closeCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 1000,
        eventPhase: 0,
        reason: "",
        type: "close",
        wasClean: true,
      })
    );

    // ensure that the WebSocket mock set up by mock-socket is still present
    expect(WebSocket).toBeDefined();
  });

  it("closes the connection with a custom close code", async () => {
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");
    const closeCallback = jest.fn();
    await server.connected;
    client.onclose = closeCallback;

    server.close({ code: 1234, reason: "boom", wasClean: false });

    expect(closeCallback).toHaveBeenCalledTimes(1);
    expect(closeCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 1234,
        eventPhase: 0,
        reason: "boom",
        type: "close",
        wasClean: false,
      })
    );
  });

  it("can refuse connections", async () => {
    expect.assertions(6);

    const server = new WS("ws://localhost:1234");
    server.on("connection", (socket) => {
      socket.close({ wasClean: false, code: 1003, reason: "NOPE" });
    });

    const client = new WebSocket("ws://localhost:1234");
    client.onclose = (event: CloseEvent) => {
      expect(event.code).toBe(1003);
      expect(event.wasClean).toBe(false);
      expect(event.reason).toBe("NOPE");
    };

    expect(client.readyState).toBe(WebSocket.CONNECTING);

    await server.connected;
    expect(client.readyState).toBe(WebSocket.CLOSING);

    await server.closed;
    expect(client.readyState).toBe(WebSocket.CLOSED);
  });

  it("can send messages in the connection callback", async () => {
    expect.assertions(1);

    const server = new WS("ws://localhost:1234");
    let receivedMessage = null;

    server.on("connection", (socket) => {
      socket.send("hello there");
    });

    const client = new WebSocket("ws://localhost:1234");
    client.onmessage = (event) => {
      receivedMessage = event.data;
    };

    await server.connected;
    expect(receivedMessage).toBe("hello there");
  });

  it("provides a callback when receiving messages", async () => {
    const server = new WS("ws://localhost:1234");
    expect.assertions(1);

    server.on("connection", (socket) => {
      socket.on("message", (msg) => {
        expect(msg).toEqual("client says hi");
      });
    });

    const client = new WebSocket("ws://localhost:1234");
    await server.connected;
    client.send("client says hi");
    await server.nextMessage;
  });

  it("sends errors to connected clients", async () => {
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");
    await server.connected;

    let disconnected = false;
    let error: any; // bad types in MockSockets
    client.onclose = () => {
      disconnected = true;
    };
    client.onerror = (e) => {
      error = e;
    };

    server.send("hello everyone");
    server.error();
    expect(disconnected).toBe(true);
    expect(error.origin).toBe("ws://localhost:1234/");
    expect(error.type).toBe("error");
  });

  it("resolves the client socket that connected", async () => {
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");

    const socket = await server.connected;

    expect(socket).toStrictEqual(client);
  });

  it("passes on close options on server error event", async () => {
    const server = new WS("ws://localhost:1234");
    const client = new WebSocket("ws://localhost:1234");
    const closeCallback = jest.fn();
    await server.connected;
    client.onclose = closeCallback;

    server.error({ code: 1234, reason: "boom", wasClean: false });

    expect(closeCallback).toHaveBeenCalledTimes(1);
    expect(closeCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 1234,
        eventPhase: 0,
        reason: "boom",
        type: "close",
        wasClean: false,
      })
    );
  });
});
