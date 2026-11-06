"""Az arany sprite-okból kivágja a rögöket átlátszó háttérre.

A gold*.png képek a full_dirt.png földjén ülnek; ahol a pixel megegyezik a földdel,
ott átlátszó lesz. Így a rögök bármilyen (pl. kiásott) háttérre rátehetők.
Futtatás (Pillow kell): python3 scripts/cut-gold-chips.py
"""
from pathlib import Path
from PIL import Image

SPRITES = Path(__file__).resolve().parent.parent / "public" / "sprites"
FRAMES = ["", "_down", "_down_half", "_up", "_up_half"]

dirt = Image.open(SPRITES / "full_dirt.png").convert("RGBA")
for frame in FRAMES:
    gold = Image.open(SPRITES / f"gold{frame}.png").convert("RGBA")
    chips = Image.new("RGBA", gold.size, (0, 0, 0, 0))
    for x in range(gold.width):
        for y in range(gold.height):
            pixel = gold.getpixel((x, y))
            if pixel != dirt.getpixel((x, y)):
                chips.putpixel((x, y), pixel)
    chips.save(SPRITES / f"gold_chips{frame}.png")
    print(f"gold_chips{frame}.png")
