import { dfs } from './dfs.js';

export { postorder };

function postorder(g, vs) {
  return dfs(g, vs, 'post');
}
