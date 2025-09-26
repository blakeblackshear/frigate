import React from "react";
import { connect } from "react-redux";

const Message = ({ text, side }) => <div>{`(${side}) ${text}`}</div>;

const Messages = ({ messages }) => (
  <div className="Messages">
    {messages.map((message, i) => (
      <Message key={i} {...message} />
    ))}
  </div>
);

export default connect((state) => ({ messages: state.messages }))(Messages);
