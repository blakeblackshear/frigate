import breadthfirstLayout from './breadthfirst.mjs';
import circleLayout from './circle.mjs';
import concentricLayout from './concentric.mjs';
import coseLayout from './cose.mjs';
import gridLayout from './grid.mjs';
import nullLayout from './null.mjs';
import presetLayout from './preset.mjs';
import randomLayout from './random.mjs';

export default [
  { name: 'breadthfirst', impl: breadthfirstLayout },
  { name: 'circle', impl: circleLayout },
  { name: 'concentric',impl: concentricLayout },
  { name: 'cose', impl: coseLayout },
  { name: 'grid', impl: gridLayout },
  { name: 'null', impl: nullLayout },
  { name: 'preset', impl: presetLayout },
  { name: 'random', impl: randomLayout }
];
