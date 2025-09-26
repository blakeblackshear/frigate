/*
This file tells the Mocha tests what build of Cytoscape to use.
*/

// For manual build tests, use the ESM build
// NB : Must do `npm run build` before `npm test`
let cytoscape;

if (process.env.TEST_BUILD) {
  // Dynamically import the ESM build
  cytoscape = await import('../build/cytoscape.esm.mjs'); // Assuming the ESM build uses `.esm.js`
} else {
  // Dynamically import the unbundled, unbabelified raw source
  cytoscape = await import('./index.mjs');
}

// Export the module (adjust based on whether you need default or named exports)
export default cytoscape.default || cytoscape;