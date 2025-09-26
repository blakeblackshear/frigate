import React from 'react';
import Loadable from "react-loadable";
import Loading from "../Loading";

const SharedMultilevelExample = Loadable({
  loader: () => import(/* webpackChunkName: "shared-multilevel" */'./SharedMultilevel'),
  loading: Loading,
});

const DeeplevelExample = Loadable({
  loader: () => import(/* webpackChunkName: "deeplevel" */'./level-1/level-2/DeepLevel'),
  loading: Loading,
});

export default function Multilevel() {
  return (
    <div>
      <hr />
      Multilevel with Shared Component Example.
      <SharedMultilevelExample />
      Loading from a DeepLevel
      <DeeplevelExample />
      <hr />
    </div>
  );
}
