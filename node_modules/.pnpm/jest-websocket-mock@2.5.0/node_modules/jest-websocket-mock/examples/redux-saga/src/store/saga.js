import { eventChannel, END } from "redux-saga";
import { cancel, call, delay, fork, put, take } from "redux-saga/effects";
import { actions } from "./reducer";

const RECONNECT_TIMEOUT = 6000;

function websocketInitChannel(connection) {
  return eventChannel(emitter => {
    const closeCallback = () => {
      emitter(actions.connectionLost());
      return emitter(END);
    };

    connection.onmessage = e => {
      return emitter(actions.storeReceivedMessage(e.data));
    };

    connection.onclose = closeCallback;
    connection.onerror = closeCallback;

    return () => {
      // unsubscribe function
      connection.close();
    };
  });
}

function* sendMessage(connection) {
  while (true) {
    const { payload } = yield take(actions.send);
    yield put(actions.storeSentMessage(payload));
    yield call([connection, connection.send], payload);
  }
}

export default function* saga() {
  const connection = new WebSocket(`ws://${window.location.hostname}:8080`);
  const channel = yield call(websocketInitChannel, connection);
  yield put(actions.connectionSuccess());
  const sendMessageTask = yield fork(sendMessage, connection);
  try {
    while (true) {
      const action = yield take(channel);
      yield put(action);
    }
  } finally {
    // cancel background tasks...
    channel.close();
    yield cancel(sendMessageTask);
    // ...and start again
    yield delay(RECONNECT_TIMEOUT);
    return yield call(saga);
  }
}
