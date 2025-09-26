import React from "react";
import { connect } from "react-redux";

const ConnectionIndicator = ({ connected }) => (
  <div
    className={
      connected
        ? "ConnectionIndicator ConnectionIndicator--connected"
        : "ConnectionIndicator ConnectionIndicator--disconnected"
    }
    title={connected ? "connected" : "disconnected"}
  />
);

export default connect((state) => ({ connected: state.connected }))(
  ConnectionIndicator
);
