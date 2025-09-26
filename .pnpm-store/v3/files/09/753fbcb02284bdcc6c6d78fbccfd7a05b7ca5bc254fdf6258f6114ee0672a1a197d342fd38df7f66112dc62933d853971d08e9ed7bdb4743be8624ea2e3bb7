import { heartbeat } from "./heartbeat";

describe("heartbeat", () => {
  let ws: WebSocket;
  let sendSpy: jest.Mock;
  let closeSpy: jest.Mock;
  let addEventListenerSpy: jest.Mock;
  jest.useFakeTimers();

  beforeEach(() => {
    sendSpy = jest.fn();
    closeSpy = jest.fn();
    addEventListenerSpy = jest.fn();
    ws = {
      send: sendSpy,
      close: closeSpy,
      addEventListener: addEventListenerSpy,
    } as unknown as WebSocket;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("sends a ping message at the specified interval", () => {
    const lastMessageTime = { current: Date.now() };
    heartbeat(ws, lastMessageTime, { interval: 100 });
    expect(sendSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(sendSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  test("closes the WebSocket if onMessageCb is not invoked within the specified timeout", () => {
    const lastMessageTime = { current: Date.now() };
    heartbeat(ws, lastMessageTime, { timeout: 100, interval: 100 });
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  test("does not close the WebSocket if messageCallback is invoked within the specified timeout", () => {
    const onMessageCb = heartbeat(ws, { current: Date.now() }, { timeout: 100 });
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(99);
    onMessageCb();
    expect(closeSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  test("sends the custom ping message", () => {
    const lastMessageTime = { current: Date.now() };
    heartbeat(ws, lastMessageTime, { message: "pong" });
    expect(sendSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(25000);
    expect(sendSpy).toHaveBeenCalledWith("pong");
  });

  test("sends a ping message using a function", () => {
    function nextPing(id: number) {
      return 'msg' + (id);
    }

    const lastMessageTime = { current: Date.now() };
    heartbeat(ws, lastMessageTime, { message: () => nextPing(33), interval: 100 });
    expect(sendSpy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(101);
    expect(sendSpy).toHaveBeenCalledWith('msg33');
    jest.advanceTimersByTime(100);
    expect(sendSpy).toHaveBeenCalledWith('msg33');
  });
});
