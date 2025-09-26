import React from "react";
import { render, screen, userEvent, fireEvent } from "../test-utils";
import App from "../App";

describe("The App component", () => {
  it("renders the app skeleton", async () => {
    const { container } = await render(<App />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders a green dot when successfully connected", async () => {
    await render(<App />);
    expect(screen.getByTitle("connected")).toBeInTheDocument();
  });

  it("renders a red dot when not connected", async () => {
    const { ws } = await render(<App />);
    ws.close();
    expect(screen.getByTitle("disconnected")).toBeInTheDocument();
  });

  it("sends the message when submitting the form", async () => {
    const { ws } = await render(<App />);
    const input = screen.getByPlaceholderText("type your message here...");
    userEvent.type(input, "Hello there");
    fireEvent.submit(input);
    expect(screen.getByText("(sent) Hello there")).toBeInTheDocument();
    await expect(ws).toReceiveMessage("Hello there");

    ws.send("[echo] Hello there");
    expect(
      screen.getByText("(received) [echo] Hello there")
    ).toBeInTheDocument();
  });
});
