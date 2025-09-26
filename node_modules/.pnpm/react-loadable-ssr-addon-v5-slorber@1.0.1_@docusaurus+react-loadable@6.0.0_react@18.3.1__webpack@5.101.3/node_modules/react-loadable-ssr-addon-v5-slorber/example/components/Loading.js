import React from 'react';

export default function Loading(props) {
  if (props.isLoading) {
    if (props.timedOut) {
      return <div>Loader timed out!</div>;
    } else if (props.pastDelay) {
      return <div>Loading...</div>;
    }
    return null;
  } else if (props.error) {
    return <div>Error! Component failed to load</div>;
  }
  return null;
}
