import * as util from '../../util/index.mjs';
import bfsDfs from './bfs-dfs.mjs';
import dijkstra from './dijkstra.mjs';
import kruskal from './kruskal.mjs';
import aStar from './a-star.mjs';
import floydWarshall from './floyd-warshall.mjs';
import bellmanFord from './bellman-ford.mjs';
import kargerStein from './karger-stein.mjs';
import pageRank from './page-rank.mjs';
import degreeCentrality from './degree-centrality.mjs';
import closenessCentrality from './closeness-centrality.mjs';
import betweennessCentrality from './betweenness-centrality.mjs';
import markovClustering from './markov-clustering.mjs';
import kClustering from './k-clustering.mjs';
import hierarchicalClustering from './hierarchical-clustering.mjs';
import affinityPropagation from './affinity-propagation.mjs';
import hierholzer from './hierholzer.mjs';
import hopcroftTarjanBiconnected from './hopcroft-tarjan-biconnected.mjs';
import tarjanStronglyConnected from './tarjan-strongly-connected.mjs';

var elesfn = {};

[
  bfsDfs,
  dijkstra,
  kruskal,
  aStar,
  floydWarshall,
  bellmanFord,
  kargerStein,
  pageRank,
  degreeCentrality,
  closenessCentrality,
  betweennessCentrality,
  markovClustering,
  kClustering,
  hierarchicalClustering,
  affinityPropagation,
  hierholzer,
  hopcroftTarjanBiconnected,
  tarjanStronglyConnected
].forEach(function(props) {
  util.extend(elesfn, props);
});

export default elesfn;
