import React from 'react';
import Loadable from "react-loadable";
import Loading from "./Loading";

const ContentNestedExample = Loadable({
  loader: () => import(/* webpackChunkName: "content-nested" */'./ContentNested'),
  loading: Loading,
});

export default function Content() {
  return (
    <div>
      Bacon ipsum dolor amet pork belly minim pork loin reprehenderit incididunt aliquip hamburger chuck culpa mollit officia nisi pig duis.
      Buffalo laboris duis ullamco flank.
      Consectetur in excepteur elit ut aute adipisicing et tongue veniam labore dolore exercitation.
      Swine consectetur boudin landjaeger, t-bone pork belly laborum.
      Bacon ex ham ribeye sirloin et venison pariatur dolor non fugiat consequat.
      Velit kevin non, jerky alcatra flank ball tip.
      <ContentNestedExample />
    </div>
  );
}
