import React from 'react';
import Loadable from "react-loadable";
import Loading from "../../../Loading";

const SharedMultilevelExample = Loadable({
  loader: () => import(/* webpackChunkName: "shared-multilevel" */'../../SharedMultilevel'),
  loading: Loading,
});

export default function DeepLevel() {
  return (
    <div>
      <SharedMultilevelExample />
    </div>
  );
}
