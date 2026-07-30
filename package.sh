#!/bin/sh
# Build the store zip: manifest at the zip root, shipped files only.
cd "$(dirname "$0")" || exit 1
rm -f nested-star-lists-for-github.zip
zip -r nested-star-lists-for-github.zip \
  manifest.json styles.css options.html options.js src icons \
  -x '*/.*' '*/.*/*' '.*'
echo "→ nested-star-lists-for-github.zip"
