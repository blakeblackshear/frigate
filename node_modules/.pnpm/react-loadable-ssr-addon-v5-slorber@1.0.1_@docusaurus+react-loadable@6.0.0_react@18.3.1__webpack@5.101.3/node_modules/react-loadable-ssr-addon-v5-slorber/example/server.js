import express from 'express';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Loadable from 'react-loadable';
import { getBundles } from 'react-loadable-ssr-addon';
import App from './components/App';

const manifest = require('./dist/react-loadable-ssr-addon.json');
const server = express();

server.use('/dist', express.static(path.join(__dirname, 'dist')));

server.get('*', (req, res) => {
  const modules = new Set();
  const html = renderToString(
    <Loadable.Capture report={moduleName => modules.add(moduleName)}>
      <App/>
    </Loadable.Capture>
  );

  const bundles = getBundles(manifest, [...manifest.entrypoints, ...Array.from(modules)]);

  const styles = bundles.css || [];
  const scripts = bundles.js || [];

  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>React Loadable SSR Add-on Example</title>
        ${styles.map(style => {
          return `<link href="/dist/${style.file}" rel="stylesheet" />`;
        }).join('\n')}
      </head>
      <body>
        <div id="app">${html}</div>
        ${scripts.map(script => {
          return `<script src="/dist/${script.file}"></script>`
        }).join('\n')}
      </body>
    </html>
  `);
});

Loadable.preloadAll().then(() => {
  server.listen(3003, () => {
    console.log('Running on http://localhost:3003/');
  });
}).catch(err => {
  console.log(err);
});
