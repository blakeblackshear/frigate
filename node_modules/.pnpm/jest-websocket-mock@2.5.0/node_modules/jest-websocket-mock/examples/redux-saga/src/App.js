import React from "react";
import ConnectionIndicator from "./ConnectionIndicator";
import Messages from "./Messages";
import MessageInput from "./MessageInput";

const App = () => (
  <div className="App">
    <ConnectionIndicator />
    <Messages />
    <MessageInput />
  </div>
);

export default App;
