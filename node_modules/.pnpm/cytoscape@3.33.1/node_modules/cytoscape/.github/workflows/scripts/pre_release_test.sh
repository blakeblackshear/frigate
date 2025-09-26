#!/bin/bash

# Make script exit on first failure
set -e

# Check if VERSION variable is set
if [ -z "$VERSION" ]; then
  echo "VERSION variable is not set."
  exit 1
else
  echo "VERSION is set to: $VERSION"
fi

# Check if current Git branch is named "master" or the provided branch name
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)

if [ "$current_branch" = "$1" ]; then
  echo "Current Git branch is $1."
else
  echo "Current Git branch is not $1."
  exit 2
fi

FILE=./documentation/versions.json
if [ -f "$FILE" ]; then
  echo "$FILE exists."
else 
  echo "$FILE doesn't exist. Exiting..."
  exit 1
fi

npm install
npm run release

if [ "$current_branch" = "unstable" ] || [ "$current_branch" = "master" ]; then 
  echo "Starting to check changed files"

  # List the files to check
  files_to_check=("documentation/index.html" "documentation/js/cytoscape.min.js" "dist/cytoscape.umd.js")

  echo "Files initialized"

  git status

  # Loop through the files
  for file in "${files_to_check[@]}"
  do
      echo "Checking $file"

      # Check if the file exists in the local FS
      if [ -e "$file" ]; then
          echo "The file $file exists in the locally-built files."
      else
          echo "The file $file does not exist in the locally-built files."
          exit 1
      fi

      # Check if the file has changed
      output="$(git status -s $file)"

      echo "For $file, $output"

      # Check if the file has changed
      if [ -z "$output" ]; then
          echo "The file $file has not changed."
          exit 1
      else
          echo "The file $file has changed."
      fi
  done
fi

git add . && git commit -m "Build $VERSION"

git log -n 1

npm version "$VERSION" --allow-same-version

git push && git push --tags

git remote -v

git remote set-url origin git@github.com:cytoscape/cytoscape.js.git

exit 0