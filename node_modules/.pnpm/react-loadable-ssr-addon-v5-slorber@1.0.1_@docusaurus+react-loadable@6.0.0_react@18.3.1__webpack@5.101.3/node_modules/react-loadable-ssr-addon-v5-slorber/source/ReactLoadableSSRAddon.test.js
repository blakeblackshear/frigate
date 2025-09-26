import test from 'ava';
import path from 'path';
import fs from 'fs';
import waitForExpect from 'wait-for-expect';
import webpack from 'webpack';
import config from '../webpack.config';
import ReactLoadableSSRAddon, { defaultOptions } from './ReactLoadableSSRAddon';

/* eslint-disable consistent-return, import/no-dynamic-require, global-require */
let outputPath;
let manifestOutputPath;

const runWebpack = (configuration, end, callback) => {
  webpack(configuration, (err, stats) => {
    if (err) {
      return end(err);
    }
    if (stats.hasErrors()) {
      return end(stats.toString());
    }

    callback();

    end();
  });
};

test.beforeEach(() => {
  const publicPathSanitized = config.output.publicPath.slice(1, -1);
  outputPath = path.resolve('./example', publicPathSanitized);
  manifestOutputPath = path.resolve(outputPath, defaultOptions.filename);
});

test.cb('outputs with default settings', (t) => {
  config.plugins = [
    new ReactLoadableSSRAddon(),
  ];

  runWebpack(config, t.end, () => {
    const feedback = fs.existsSync(manifestOutputPath) ? 'pass' : 'fail';

    t[feedback]();
  });
});

test.cb('outputs with custom filename', (t) => {
  const filename = 'new-assets-manifest.json';

  config.plugins = [
    new ReactLoadableSSRAddon({
      filename,
    }),
  ];

  runWebpack(config, t.end, () => {
    const feedback = fs.existsSync(manifestOutputPath.replace(defaultOptions.filename, filename)) ? 'pass' : 'fail';

    t[feedback]();
  });
});

test.cb('outputs with integrity', (t) => {
  config.plugins = [
    new ReactLoadableSSRAddon({
      integrity: true,
    }),
  ];

  runWebpack(config, t.end, async () => {
    const manifest = require(`${manifestOutputPath}`);

    await waitForExpect(() => {
      Object.keys(manifest.assets).forEach((asset) => {
        manifest.assets[asset].js.forEach(({ integrity }) => {
          t.truthy(integrity);
        });
      });
    });
  });
});
