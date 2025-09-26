import { createActions, handleActions, combineActions } from "redux-actions";

const defaultState = {
  messages: [],
  connected: false,
};

export const actions = createActions({
  STORE_SENT_MESSAGE: text => ({ text, side: "sent" }),
  STORE_RECEIVED_MESSAGE: text => ({ text, side: "received" }),
  SEND: undefined,
  CONNECTION_SUCCESS: () => ({ connected: true }),
  CONNECTION_LOST: () => ({ connected: false }),
});

const reducer = handleActions(
  {
    [combineActions(actions.storeReceivedMessage, actions.storeSentMessage)]: (
      state,
      { payload }
    ) => ({ ...state, messages: [...state.messages, payload] }),
    [combineActions(actions.connectionSuccess, actions.connectionLost)]: (
      state,
      { payload: { connected } }
    ) => ({ ...state, connected }),
  },
  defaultState
);

export default reducer;
