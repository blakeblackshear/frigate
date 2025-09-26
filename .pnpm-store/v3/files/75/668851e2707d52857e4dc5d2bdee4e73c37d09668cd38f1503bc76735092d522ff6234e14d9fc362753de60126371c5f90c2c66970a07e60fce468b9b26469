import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import WS from "jest-websocket-mock";
import makeStore from "./store";

afterEach(() => {
  WS.clean();
});

const renderWithStore = async (ui, options = {}) => {
  const ws = new WS("ws://localhost:8080");
  const store = makeStore();
  const rendered = render(<Provider store={store}>{ui}</Provider>, options);
  await ws.connected;
  return {
    ws,
    ...rendered,
  };
};

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
export { renderWithStore as render };
