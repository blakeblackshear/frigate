import React, { Component } from 'react';
import PropTypes from 'prop-types';
import HelmetData from './HelmetData';

const defaultValue = {};

export const Context = React.createContext(defaultValue);

export const providerShape = PropTypes.shape({
  setHelmet: PropTypes.func,
  helmetInstances: PropTypes.shape({
    get: PropTypes.func,
    add: PropTypes.func,
    remove: PropTypes.func,
  }),
});

const canUseDOM = typeof document !== 'undefined';

export default class Provider extends Component {
  static canUseDOM = canUseDOM;

  static propTypes = {
    context: PropTypes.shape({
      helmet: PropTypes.shape(),
    }),
    children: PropTypes.node.isRequired,
  };

  static defaultProps = {
    context: {},
  };

  static displayName = 'HelmetProvider';

  constructor(props) {
    super(props);

    this.helmetData = new HelmetData(this.props.context, Provider.canUseDOM);
  }

  render() {
    return <Context.Provider value={this.helmetData.value}>{this.props.children}</Context.Provider>;
  }
}
