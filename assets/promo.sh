#!/bin/sh
# Render the store promo images from promo.html with headless Chrome.
cd "$(dirname "$0")" || exit 1
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() {  # size, query, out
  "$chrome" --headless --disable-gpu --hide-scrollbars \
    --window-size="$1" --screenshot="$3" "file://$PWD/promo.html$2" 2>/dev/null
  echo "→ $3 ($1)"
}
shot 440,280   ""         Promo-440x280.png
shot 1400,560  "?marquee" Marquee-1400x560.png
