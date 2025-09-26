import React from 'react';
import Loadable from 'react-loadable';
import Loading from './Loading';

const HeaderExample = Loadable({
  loader: () => import(/* webpackChunkName: "header" */'./Header'),
  loading: Loading,
});

const ContentExample = Loadable({
  loader: () => import(/* webpackChunkName: "content" */'./Content'),
  loading: Loading,
});

const MultilevelExample = Loadable({
  loader: () => import(/* webpackChunkName: "multilevel" */'./multilevel/Multilevel'),
  loading: Loading,
});

export default function App() {
  return (
    <React.Fragment>
      <HeaderExample />
      <ContentExample />
      <MultilevelExample />
    </React.Fragment>
  )
}
