"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard")["default"];

exports.__esModule = true;
exports["default"] = void 0;

var _react = _interopRequireWildcard(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _Context = require("./Context");

var _Subscription = require("../utils/Subscription");

var _useIsomorphicLayoutEffect = require("../utils/useIsomorphicLayoutEffect");

function Provider(_ref) {
  var store = _ref.store,
      context = _ref.context,
      children = _ref.children;
  var contextValue = (0, _react.useMemo)(function () {
    var subscription = (0, _Subscription.createSubscription)(store);
    return {
      store: store,
      subscription: subscription
    };
  }, [store]);
  var previousState = (0, _react.useMemo)(function () {
    return store.getState();
  }, [store]);
  (0, _useIsomorphicLayoutEffect.useIsomorphicLayoutEffect)(function () {
    var subscription = contextValue.subscription;
    subscription.onStateChange = subscription.notifyNestedSubs;
    subscription.trySubscribe();

    if (previousState !== store.getState()) {
      subscription.notifyNestedSubs();
    }

    return function () {
      subscription.tryUnsubscribe();
      subscription.onStateChange = null;
    };
  }, [contextValue, previousState]);
  var Context = context || _Context.ReactReduxContext;
  return /*#__PURE__*/_react["default"].createElement(Context.Provider, {
    value: contextValue
  }, children);
}

if (process.env.NODE_ENV !== 'production') {
  Provider.propTypes = {
    store: _propTypes["default"].shape({
      subscribe: _propTypes["default"].func.isRequired,
      dispatch: _propTypes["default"].func.isRequired,
      getState: _propTypes["default"].func.isRequired
    }),
    context: _propTypes["default"].object,
    children: _propTypes["default"].any
  };
}

var _default = Provider;
exports["default"] = _default;