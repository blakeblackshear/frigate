import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WS from "jest-websocket-mock";
import App from "./App";

let ws: WS;
beforeEach(() => {
  ws = new WS("ws://localhost:8080");
});
afterEach(() => {
  WS.clean();
});

describe("The App component", () => {
  it("renders a dot indicating the connection status", async () => {
    render(<App />);
    expect(screen.getByTitle("disconnected")).toBeInTheDocument();

    await ws.connected;
    expect(screen.getByTitle("connected")).toBeInTheDocument();

    ws.close();
    expect(screen.getByTitle("disconnected")).toBeInTheDocument();
  });

  it("sends and receives messages", async () => {
    render(<App />);
    await ws.connected;

    const input = screen.getByPlaceholderText("type your message here...");
    userEvent.type(input, "Hello there");
    fireEvent.submit(input);

    await expect(ws).toReceiveMessage("Hello there");
    expect(screen.getByText("(sent) Hello there")).toBeInTheDocument();

    ws.send("[echo] Hello there");
    expect(
      screen.getByText("(received) [echo] Hello there")
    ).toBeInTheDocument();
  });
});
