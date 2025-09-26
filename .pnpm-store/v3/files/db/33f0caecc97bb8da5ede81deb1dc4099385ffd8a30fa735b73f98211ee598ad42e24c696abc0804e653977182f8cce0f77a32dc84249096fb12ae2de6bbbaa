import React, { PureComponent } from "react";
import { connect } from "react-redux";
import { actions } from "./store/reducer";

class MessageInput extends PureComponent {
  state = { message: "" };

  onChange = event => this.setState({ message: event.target.value });

  onSubmit = event => {
    event.preventDefault();
    this.props.send(this.state.message);
    this.setState({ message: "" });
  };

  render() {
    const { message } = this.state;
    return (
      <form className="MessageForm" onSubmit={this.onSubmit}>
        <input
          autoFocus
          className="MessageInput"
          value={message}
          onChange={this.onChange}
          placeholder="type your message here..."
        />
      </form>
    );
  }
}

export default connect(
  null,
  { send: actions.send }
)(MessageInput);
