#!/usr/bin/env python3
"""Fit the raw window screenshots to 1280x800: transparent for the README,
white for the stores (they composite alpha onto their own background)."""
from PIL import Image

for name in ("After", "Before", "Rail", "Edit-Star-List"):
    shot = Image.open(f"{name}.png").convert("RGBA")
    shot.thumbnail((1280, 800), Image.LANCZOS)
    at = ((1280 - shot.width) // 2, (800 - shot.height) // 2)
    for suffix, bg in (("", (0, 0, 0, 0)), ("-store", (255, 255, 255, 255))):
        canvas = Image.new("RGBA", (1280, 800), bg)
        canvas.alpha_composite(shot, at)
        if suffix:  # no alpha channel at all, so no store can composite it wrong
            canvas = canvas.convert("RGB")
        canvas.save(f"{name}-1280x800{suffix}.png")
        print(f"→ {name}-1280x800{suffix}.png")
