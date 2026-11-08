"""A térkép számozott vonalzóinak pixel art elemei (public/sprites/timber-*.png).

A térkép fölött egy vízszintes bányagerenda, bal oldalán egy függőleges dúc fut; mindkettőn mezőnként egy bevésett
tábla, amelybe a felület az oszlop / sor számát írja. Egy gerendaszakasz egy mező széles (32 px), a vonalzó vastagsága
fél mező (16 px), így a művészi pixel mérete egyezik a térkép sprite-jaival. Futtatás: python3 scripts/draw-mine-timber.py
"""

from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "sprites"

# A meglévő sprite-ok barna-tégla palettájához illő fa- és vasárnyalatok.
OUTLINE = (28, 16, 10, 255)
SEAM = (42, 23, 13, 255)
SHADOW = (74, 42, 23, 255)
WOOD = (107, 64, 36, 255)
WOOD_DARK = (87, 50, 25, 255)
WOOD_LIGHT = (127, 79, 44, 255)
HIGHLIGHT = (160, 106, 58, 255)
PLATE = (36, 21, 13, 255)
PLATE_TOP = (23, 12, 7, 255)
PLATE_LIP = (138, 90, 50, 255)
IRON_DARK = (58, 58, 58, 255)
IRON = (109, 109, 109, 255)
IRON_LIGHT = (200, 200, 200, 255)

# Rögzített erezet (hossz menti csíkok): (sor, kezdet, vég, szín). Szándékosan szabálytalan, mint a fa.
GRAIN = [
    (3, 2, 9, WOOD_DARK),
    (4, 20, 30, WOOD_LIGHT),
    (6, 25, 31, WOOD_DARK),
    (9, 1, 6, WOOD_LIGHT),
    (11, 26, 31, WOOD_LIGHT),
    (12, 3, 12, WOOD_DARK),
    (13, 18, 27, WOOD_DARK),
]


def nail(image: Image.Image, x: int, y: int) -> None:
    """2×2-es szögfej: bal felül csillan, jobb alul árnyékos."""
    image.putpixel((x, y), IRON_LIGHT)
    image.putpixel((x + 1, y), IRON)
    image.putpixel((x, y + 1), IRON)
    image.putpixel((x + 1, y + 1), IRON_DARK)


def plate(image: Image.Image, left: int, top: int, right: int, bottom: int) -> None:
    """Bevésett tábla: sötét mélyedés, felső széle árnyékban, alsó pereme megvilágítva."""
    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            image.putpixel((x, y), PLATE)
    for x in range(left, right + 1):
        image.putpixel((x, top), PLATE_TOP)
        image.putpixel((x, bottom), PLATE_LIP)
    for y in range(top, bottom):
        image.putpixel((left, y), PLATE_TOP)


def beam() -> Image.Image:
    """Vízszintes gerendaszakasz (32×16): felülről jön a fény, bal szélén illesztés a szomszéd szakasszal."""
    image = Image.new("RGBA", (32, 16), WOOD)
    for x in range(32):
        image.putpixel((x, 0), OUTLINE)
        image.putpixel((x, 1), HIGHLIGHT)
        image.putpixel((x, 14), SHADOW)
        image.putpixel((x, 15), OUTLINE)
    for row, start, end, color in GRAIN:
        for x in range(start, end + 1):
            image.putpixel((x, row), color)
    for y in range(1, 15):
        image.putpixel((0, y), SEAM)
    plate(image, 7, 3, 24, 12)
    nail(image, 3, 7)
    nail(image, 27, 7)
    return image


def post() -> Image.Image:
    """Függőleges dúcszakasz (16×32): balról jön a fény, felső szélén illesztés."""
    image = Image.new("RGBA", (16, 32), WOOD)
    for y in range(32):
        image.putpixel((0, y), OUTLINE)
        image.putpixel((1, y), HIGHLIGHT)
        image.putpixel((14, y), SHADOW)
        image.putpixel((15, y), OUTLINE)
    # Az erezet ugyanaz, mint a gerendán, csak elforgatva.
    for row, start, end, color in GRAIN:
        for y in range(start, end + 1):
            image.putpixel((row, y), color)
    for x in range(1, 15):
        image.putpixel((x, 0), SEAM)
    plate(image, 2, 8, 13, 23)
    nail(image, 7, 3)
    nail(image, 7, 27)
    return image


def corner() -> Image.Image:
    """A gerenda és a dúc találkozása (16×16): bütü (évgyűrűk) vasalással."""
    image = Image.new("RGBA", (16, 16), WOOD)
    for i in range(16):
        for edge in (0, 15):
            image.putpixel((i, edge), OUTLINE)
            image.putpixel((edge, i), OUTLINE)
    # Évgyűrűk a bütün.
    for ring, color in ((5, WOOD_DARK), (3, WOOD_LIGHT), (1, WOOD_DARK)):
        for i in range(8 - ring, 8 + ring):
            for x, y in ((i, 8 - ring), (i, 7 + ring), (8 - ring, i), (7 + ring, i)):
                image.putpixel((x, y), color)
    # Vas sarokpánt a bal felső és jobb alsó sarkon.
    for i in range(1, 6):
        image.putpixel((i, 1), IRON)
        image.putpixel((1, i), IRON)
        image.putpixel((15 - i, 14), IRON_DARK)
        image.putpixel((14, 15 - i), IRON_DARK)
    nail(image, 2, 2)
    nail(image, 12, 12)
    return image


if __name__ == "__main__":
    beam().save(OUT / "timber-beam.png")
    post().save(OUT / "timber-post.png")
    corner().save(OUT / "timber-corner.png")
    print("timber-beam.png, timber-post.png, timber-corner.png ->", OUT)
