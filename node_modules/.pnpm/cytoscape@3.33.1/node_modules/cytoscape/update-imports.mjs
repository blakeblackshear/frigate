#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

// Adjust the base directory to match your project layout:
const SRC_DIR = path.join(process.cwd(), 'test');

/**
 * Recursively gather all .mjs files in the given directory
 */
function getAllMjsFiles(dir) {
  let results = [];

  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      // Recurse into subdirectories
      results = results.concat(getAllMjsFiles(fullPath));
    } else if (dirent.isFile() && fullPath.endsWith('.mjs')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Given an import path like '../../util', figure out if we should rewrite
 * to '../../util.mjs' or '../../util/index.mjs', based on what is present in the file system.
 */
function resolveImport(rawImportPath, currentFileDir) {
  // We only care about relative imports
  if (!rawImportPath.startsWith('.')) {
    // If it's not relative, leave it alone (e.g. 'react' or 'lodash')
    return rawImportPath;
  }

  // The path on disk relative to the current file
  const absoluteImportPath = path.resolve(currentFileDir, rawImportPath);

  // 1. Check if `absoluteImportPath.mjs` exists
  const candidateMjsFile = `${absoluteImportPath}.mjs`;
  if (fs.existsSync(candidateMjsFile)) {
    // Convert back to a relative path from the current file
    return pathRelativeWinSafe(currentFileDir, candidateMjsFile);
  }

  // 2. Check if `absoluteImportPath/index.mjs` exists
  const candidateIndexFile = path.join(absoluteImportPath, 'index.mjs');
  if (fs.existsSync(candidateIndexFile)) {
    return pathRelativeWinSafe(currentFileDir, candidateIndexFile);
  }

  // If neither .mjs nor index.mjs exist, leave it unchanged (or optionally throw an error)
  return rawImportPath;
}

/**
 * Convert absolute path back to a relative path (with forward slashes on all platforms).
 * Because Node on Windows returns backslashes, which ESM imports won't like.
 */
function pathRelativeWinSafe(from, to) {
  let relPath = path.relative(from, to);
  // Replace backslashes with forward slashes
  relPath = relPath.replace(/\\/g, '/');
  // Ensure it starts with '.' or '..' if it isn’t already
  if (!relPath.startsWith('.')) {
    relPath = `./${relPath}`;
  }
  return relPath;
}

/**
 * Perform the in-place rewrites for import statements in a single file.
 */
function rewriteImportsInFile(filePath) {
  const fileDir = path.dirname(filePath);
  let src = fs.readFileSync(filePath, 'utf8');

  // Simple pattern capturing import statements of the form:
  // import ... from '...';
  // This will NOT catch every possible ESM shape (e.g., multiline). Adapt as needed.
  const importRegex = /(\bimport\s+(?:[\s\S]+?)\s+from\s+['"])([^'"]+)(['"];)/g;

  let changed = false;
  src = src.replace(importRegex, (match, before, importPath, after) => {
    const newImportPath = resolveImport(importPath, fileDir);
    if (newImportPath !== importPath) {
      changed = true;
      return `${before}${newImportPath}${after}`;
    }
    return match;
  });

  // Optionally, handle require() if needed:
  // const requireRegex = /(\brequire\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;
  // src = src.replace(requireRegex, (match, before, importPath, after) => {
  //   const newImportPath = resolveImport(importPath, fileDir);
  //   if (newImportPath !== importPath) {
  //     changed = true;
  //     return `${before}${newImportPath}${after}`;
  //   }
  //   return match;
  // });

  if (changed) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`Updated imports in: ${filePath}`);
  }
}

/**
 * Main routine:
 *  1. Collect all .mjs files in src/
 *  2. Rewrite their import statements
 */
function main() {
  const allMjsFiles = getAllMjsFiles(SRC_DIR);

  console.log(`Found ${allMjsFiles.length} .mjs files in ${SRC_DIR}.`);
  for (const filePath of allMjsFiles) {
    rewriteImportsInFile(filePath);
  }

  console.log('Done.');
}

main();