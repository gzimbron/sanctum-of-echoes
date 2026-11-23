#!/usr/bin/env python3
"""
Procedural 16-bit Pixel Art Asset Generator for Sanctum of Echoes.
Generates crisp, pixel-aligned, transparent PNG spritesheets and tilesets
with authentic SNES/GBA shading, outlines, and biome palettes.
"""

import os
import math
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "assets")
os.makedirs(OUT_DIR, exist_ok=True)


def hex_rgba(h: str, a: int = 255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def px(img: Image.Image, x: int, y: int, color):
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)


def rect(img: Image.Image, x: int, y: int, w: int, h: int, color):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            px(img, xx, yy, color)


def draw_pattern(img: Image.Image, ox: int, oy: int, pattern: list[str], palette: dict):
    for row_i, row in enumerate(pattern):
        for col_i, ch in enumerate(row):
            if ch in palette and palette[ch] is not None:
                px(img, ox + col_i, oy + row_i, palette[ch])


def generate_tiles():
    """16 cols x 4 rows of 16x16 tiles (256x64)."""
    img = Image.new("RGBA", (16 * 16, 4 * 16), (0, 0, 0, 0))

    biomes = [
        # 0: Stone Sanctum (mossy blue-slate & warm gold)
        {
            "fl1": hex_rgba("#384354"),
            "fl2": hex_rgba("#323c4c"),
            "fl_hi": hex_rgba("#48566b"),
            "fl_lo": hex_rgba("#242b38"),
            "accent": hex_rgba("#4b8b64"),
            "accent_hi": hex_rgba("#76c893"),
            "wall_top": hex_rgba("#526075"),
            "wall_mid": hex_rgba("#3a4557"),
            "wall_dark": hex_rgba("#212834"),
            "wall_hi": hex_rgba("#7687a1"),
            "wall_line": hex_rgba("#181d26"),
            "pit": hex_rgba("#0d1017"),
            "pit_rim": hex_rgba("#273040"),
            "hazard1": hex_rgba("#1c4e6b"),
            "hazard2": hex_rgba("#2a7599"),
            "hazard_hi": hex_rgba("#62b8d9"),
            "glow": hex_rgba("#58f2c8"),
            "gold": hex_rgba("#e8b948"),
            "gold_hi": hex_rgba("#fff0a8"),
            "gold_lo": hex_rgba("#9c6b1c"),
        },
        # 1: Ember Crypt (volcanic basalt & molten amber)
        {
            "fl1": hex_rgba("#423135"),
            "fl2": hex_rgba("#39292d"),
            "fl_hi": hex_rgba("#574147"),
            "fl_lo": hex_rgba("#261b1e"),
            "accent": hex_rgba("#b54328"),
            "accent_hi": hex_rgba("#f58536"),
            "wall_top": hex_rgba("#5e464b"),
            "wall_mid": hex_rgba("#453237"),
            "wall_dark": hex_rgba("#291c20"),
            "wall_hi": hex_rgba("#85646b"),
            "wall_line": hex_rgba("#1a1114"),
            "pit": hex_rgba("#12090b"),
            "pit_rim": hex_rgba("#382328"),
            "hazard1": hex_rgba("#a82c16"),
            "hazard2": hex_rgba("#de541e"),
            "hazard_hi": hex_rgba("#ffba49"),
            "glow": hex_rgba("#ff9b42"),
            "gold": hex_rgba("#e8b948"),
            "gold_hi": hex_rgba("#fff0a8"),
            "gold_lo": hex_rgba("#9c6b1c"),
        },
        # 2: Verdant Ruins (overgrown sandstone & emerald ivy)
        {
            "fl1": hex_rgba("#484b39"),
            "fl2": hex_rgba("#3e4131"),
            "fl_hi": hex_rgba("#5d614a"),
            "fl_lo": hex_rgba("#2b2e21"),
            "accent": hex_rgba("#3d8c4d"),
            "accent_hi": hex_rgba("#7ee081"),
            "wall_top": hex_rgba("#63664f"),
            "wall_mid": hex_rgba("#4a4d3b"),
            "wall_dark": hex_rgba("#2c2f23"),
            "wall_hi": hex_rgba("#8a8f70"),
            "wall_line": hex_rgba("#1b1d15"),
            "pit": hex_rgba("#0d120c"),
            "pit_rim": hex_rgba("#313829"),
            "hazard1": hex_rgba("#1f5e4b"),
            "hazard2": hex_rgba("#2d8a6e"),
            "hazard_hi": hex_rgba("#7de3be"),
            "glow": hex_rgba("#88f79c"),
            "gold": hex_rgba("#e8b948"),
            "gold_hi": hex_rgba("#fff0a8"),
            "gold_lo": hex_rgba("#9c6b1c"),
        },
        # 3: Astral Vault (indigo marble & shimmering cyan/gold)
        {
            "fl1": hex_rgba("#353454"),
            "fl2": hex_rgba("#2c2b47"),
            "fl_hi": hex_rgba("#494773"),
            "fl_lo": hex_rgba("#1e1d33"),
            "accent": hex_rgba("#4f6bd9"),
            "accent_hi": hex_rgba("#7be0ff"),
            "wall_top": hex_rgba("#4e4d7a"),
            "wall_mid": hex_rgba("#38375c"),
            "wall_dark": hex_rgba("#212038"),
            "wall_hi": hex_rgba("#7472ad"),
            "wall_line": hex_rgba("#141324"),
            "pit": hex_rgba("#090814"),
            "pit_rim": hex_rgba("#2a2847"),
            "hazard1": hex_rgba("#2b2266"),
            "hazard2": hex_rgba("#4b389e"),
            "hazard_hi": hex_rgba("#a88aff"),
            "glow": hex_rgba("#7ef6ff"),
            "gold": hex_rgba("#f0c44d"),
            "gold_hi": hex_rgba("#fff4b8"),
            "gold_lo": hex_rgba("#9c6f19"),
        },
    ]

    for row, b in enumerate(biomes):
        oy = row * 16

        # Col 0: Floor A (flagstone)
        ox = 0
        rect(img, ox, oy, 16, 16, b["fl1"])
        # subtle tile seams & top-left highlights
        for i in range(16):
            px(img, ox + i, oy + 15, b["fl_lo"])
            px(img, ox + 15, oy + i, b["fl_lo"])
            px(img, ox + i, oy, b["fl_hi"])
        for i in range(1, 15):
            px(img, ox, oy + i, b["fl_hi"])
        # inner stone variation
        px(img, ox + 4, oy + 5, b["fl2"])
        px(img, ox + 5, oy + 5, b["fl2"])
        px(img, ox + 11, oy + 10, b["fl2"])
        px(img, ox + 10, oy + 11, b["fl_hi"])

        # Col 1: Floor B (split flagstone)
        ox = 16
        rect(img, ox, oy, 16, 16, b["fl2"])
        for i in range(16):
            px(img, ox + i, oy + 15, b["fl_lo"])
            px(img, ox + 15, oy + i, b["fl_lo"])
            px(img, ox + i, oy + 7, b["fl_lo"])
            px(img, ox + i, oy + 8, b["fl_hi"])
        for i in range(7):
            px(img, ox + 7, oy + i, b["fl_lo"])
            px(img, ox + 8, oy + i, b["fl_hi"])
        px(img, ox + 1, oy + 1, b["fl_hi"])
        px(img, ox + 2, oy + 1, b["fl_hi"])
        px(img, ox + 12, oy + 11, b["fl1"])
        px(img, ox + 13, oy + 12, b["fl1"])

        # Col 2: Floor C (moss/rune corner flagstone)
        ox = 32
        rect(img, ox, oy, 16, 16, b["fl1"])
        for i in range(16):
            px(img, ox + i, oy + 15, b["fl_lo"])
            px(img, ox + 15, oy + i, b["fl_lo"])
        px(img, ox + 1, oy + 1, b["fl_hi"])
        # moss/accent cluster
        for mx, my in [(2, 2), (3, 2), (2, 3), (4, 3), (3, 4), (11, 12), (12, 12), (12, 11)]:
            px(img, ox + mx, oy + my, b["accent"])
        for mx, my in [(2, 2), (3, 3), (12, 11)]:
            px(img, ox + mx, oy + my, b["accent_hi"])

        # Col 3: Floor Decorative Medallion
        ox = 48
        rect(img, ox, oy, 16, 16, b["fl2"])
        rect(img, ox + 1, oy + 1, 14, 14, b["fl1"])
        rect(img, ox + 3, oy + 3, 10, 10, b["fl_lo"])
        rect(img, ox + 4, oy + 4, 8, 8, b["fl_hi"])
        rect(img, ox + 5, oy + 5, 6, 6, b["fl1"])
        # rune diamond center
        for dx, dy in [(7, 6), (8, 6), (6, 7), (9, 7), (6, 8), (9, 8), (7, 9), (8, 9)]:
            px(img, ox + dx, oy + dy, b["accent"])
        px(img, ox + 7, oy + 7, b["accent_hi"])
        px(img, ox + 8, oy + 8, b["accent_hi"])

        # Col 4: Wall Top / Beveled Block
        ox = 64
        rect(img, ox, oy, 16, 16, b["wall_mid"])
        rect(img, ox, oy, 16, 2, b["wall_hi"])
        rect(img, ox, oy, 2, 16, b["wall_hi"])
        rect(img, ox, oy + 14, 16, 2, b["wall_line"])
        rect(img, ox + 14, oy, 2, 16, b["wall_dark"])
        rect(img, ox + 2, oy + 2, 12, 12, b["wall_top"])
        # inner beveled block lines
        rect(img, ox + 3, oy + 3, 10, 1, b["wall_hi"])
        rect(img, ox + 3, oy + 12, 10, 1, b["wall_dark"])
        px(img, ox + 7, oy + 7, b["wall_mid"])
        px(img, ox + 8, oy + 8, b["wall_mid"])

        # Col 5: Wall Brick Front
        ox = 80
        rect(img, ox, oy, 16, 16, b["wall_mid"])
        rect(img, ox, oy, 16, 3, b["wall_top"])
        rect(img, ox, oy, 16, 1, b["wall_hi"])
        rect(img, ox, oy + 3, 16, 1, b["wall_line"])
        # brick courses
        rect(img, ox, oy + 8, 16, 1, b["wall_line"])
        rect(img, ox, oy + 13, 16, 1, b["wall_line"])
        rect(img, ox, oy + 14, 16, 2, b["wall_dark"])
        for yy in range(4, 8):
            px(img, ox + 7, oy + yy, b["wall_line"])
            px(img, ox + 8, oy + yy, b["wall_hi"])
        for yy in range(9, 13):
            px(img, ox + 3, oy + yy, b["wall_line"])
            px(img, ox + 4, oy + yy, b["wall_hi"])
            px(img, ox + 11, oy + yy, b["wall_line"])
            px(img, ox + 12, oy + yy, b["wall_hi"])

        # Col 6: Carved Stone Pillar
        ox = 96
        rect(img, ox, oy, 16, 16, b["fl2"])
        rect(img, ox + 2, oy + 1, 12, 14, b["wall_line"])
        rect(img, ox + 3, oy + 2, 10, 4, b["wall_hi"])
        rect(img, ox + 4, oy + 3, 8, 2, b["wall_top"])
        rect(img, ox + 4, oy + 6, 8, 7, b["wall_mid"])
        # fluted lines
        for yy in range(6, 13):
            px(img, ox + 5, oy + yy, b["wall_hi"])
            px(img, ox + 7, oy + yy, b["wall_dark"])
            px(img, ox + 9, oy + yy, b["wall_hi"])
            px(img, ox + 11, oy + yy, b["wall_dark"])
        rect(img, ox + 3, oy + 13, 10, 2, b["wall_dark"])

        # Col 7: Pit / Chasm
        ox = 112
        rect(img, ox, oy, 16, 16, b["pit"])
        rect(img, ox, oy, 16, 2, b["pit_rim"])
        rect(img, ox, oy, 2, 16, b["pit_rim"])
        rect(img, ox + 2, oy + 2, 12, 1, b["wall_line"])
        px(img, ox + 5, oy + 9, b["pit_rim"])
        px(img, ox + 11, oy + 6, b["pit_rim"])

        # Col 8: Hazard Water/Lava/Void
        ox = 128
        rect(img, ox, oy, 16, 16, b["hazard1"])
        rect(img, ox + 1, oy + 2, 14, 12, b["hazard2"])
        # ripples
        for rx, ry in [(3, 4), (4, 4), (5, 4), (9, 7), (10, 7), (11, 7), (4, 11), (5, 11), (6, 11)]:
            px(img, ox + rx, oy + ry, b["hazard_hi"])
        rect(img, ox, oy, 16, 1, b["pit_rim"])

        # Col 9: Pressure Plate Unpressed
        ox = 144
        rect(img, ox, oy, 16, 16, b["fl1"])
        rect(img, ox + 2, oy + 2, 12, 12, b["wall_line"])
        rect(img, ox + 3, oy + 3, 10, 10, b["wall_mid"])
        rect(img, ox + 4, oy + 4, 8, 8, b["wall_top"])
        rect(img, ox + 4, oy + 4, 8, 1, b["wall_hi"])
        # subtle rune center
        rect(img, ox + 6, oy + 6, 4, 4, b["wall_dark"])
        px(img, ox + 7, oy + 7, b["accent"])
        px(img, ox + 8, oy + 8, b["accent"])

        # Col 10: Pressure Plate Pressed (Glowing!)
        ox = 160
        rect(img, ox, oy, 16, 16, b["fl1"])
        rect(img, ox + 2, oy + 2, 12, 12, b["wall_line"])
        rect(img, ox + 3, oy + 3, 10, 10, b["wall_dark"])
        rect(img, ox + 4, oy + 4, 8, 8, b["accent"])
        rect(img, ox + 6, oy + 6, 4, 4, b["glow"])
        px(img, ox + 7, oy + 7, hex_rgba("#ffffff"))
        px(img, ox + 8, oy + 8, hex_rgba("#ffffff"))

        # Col 11: Stairs Down (Glowing Sanctum Descent!)
        ox = 176
        rect(img, ox, oy, 16, 16, b["wall_line"])
        rect(img, ox + 1, oy + 1, 14, 14, b["pit"])
        # descending stone steps
        step_colors = [b["wall_hi"], b["wall_top"], b["wall_mid"], b["wall_dark"], b["accent"], b["glow"]]
        for i, sc in enumerate(step_colors):
            rect(img, ox + 2, oy + 2 + i * 2, 12, 2, sc)
            rect(img, ox + 2, oy + 3 + i * 2, 12, 1, b["wall_line"])
        # golden frame trim
        for i in range(16):
            px(img, ox + i, oy, b["gold"])
            px(img, ox + i, oy + 15, b["gold_lo"])
            px(img, ox, oy + i, b["gold"])
            px(img, ox + 15, oy + i, b["gold_lo"])
        px(img, ox + 7, oy + 12, hex_rgba("#ffffff"))
        px(img, ox + 8, oy + 12, hex_rgba("#ffffff"))

        # Col 12: Floor Spikes Retracted
        ox = 192
        rect(img, ox, oy, 16, 16, b["fl2"])
        rect(img, ox + 1, oy + 1, 14, 14, b["fl1"])
        for sx, sy in [(4, 4), (10, 4), (4, 10), (10, 10)]:
            rect(img, ox + sx, oy + sy, 2, 2, b["wall_line"])
            px(img, ox + sx, oy + sy, b["wall_dark"])

        # Col 13: Floor Spikes Extended
        ox = 208
        rect(img, ox, oy, 16, 16, b["fl2"])
        rect(img, ox + 1, oy + 1, 14, 14, b["fl1"])
        steel_d = hex_rgba("#5d6a7a")
        steel_l = hex_rgba("#c8d6e5")
        steel_hi = hex_rgba("#ffffff")
        for sx, sy in [(3, 3), (9, 3), (3, 9), (9, 9)]:
            rect(img, ox + sx, oy + sy + 2, 4, 2, b["wall_line"])
            rect(img, ox + sx, oy + sy + 1, 4, 1, steel_d)
            rect(img, ox + sx + 1, oy + sy, 2, 2, steel_l)
            px(img, ox + sx + 1, oy + sy - 1, steel_hi)

        # Col 14: Doorway Threshold Carpet
        ox = 224
        rect(img, ox, oy, 16, 16, b["fl1"])
        rect(img, ox + 2, oy, 12, 16, b["accent"])
        rect(img, ox + 3, oy, 10, 16, b["fl_lo"])
        rect(img, ox + 4, oy, 8, 16, b["accent"])
        for yy in range(0, 16, 4):
            px(img, ox + 7, oy + yy + 1, b["gold"])
            px(img, ox + 8, oy + yy + 1, b["gold"])

        # Col 15: Locked Door Golden Seal
        ox = 240
        rect(img, ox, oy, 16, 16, b["wall_line"])
        rect(img, ox + 1, oy + 1, 14, 14, b["gold_lo"])
        rect(img, ox + 2, oy + 2, 12, 12, b["gold"])
        rect(img, ox + 3, oy + 3, 10, 2, b["gold_hi"])
        # keyhole
        rect(img, ox + 6, oy + 6, 4, 3, b["wall_line"])
        rect(img, ox + 7, oy + 9, 2, 4, b["wall_line"])
        # rivets
        for rx, ry in [(3, 3), (12, 3), (3, 12), (12, 12)]:
            px(img, ox + rx, oy + ry, b["wall_line"])

    img.save(os.path.join(OUT_DIR, "tiles.png"))
    print("Saved tiles.png")


def generate_hero():
    """8 cols x 4 rows of 24x24 frames (192x96). Rows: down, up, left, right."""
    img = Image.new("RGBA", (8 * 24, 4 * 24), (0, 0, 0, 0))

    C = {
        "O": hex_rgba("#1b141a"),      # dark outline
        "G": hex_rgba("#2f8f4e"),      # tunic green
        "g": hex_rgba("#52c46b"),      # tunic highlight
        "d": hex_rgba("#1d5c34"),      # tunic shadow
        "H": hex_rgba("#e8b648"),      # hair / gold trim
        "h": hex_rgba("#fff0a6"),      # gold bright
        "S": hex_rgba("#f5c79e"),      # skin
        "s": hex_rgba("#d4966a"),      # skin shadow
        "E": hex_rgba("#1e2538"),      # eyes
        "B": hex_rgba("#6e4328"),      # boots / leather belt
        "b": hex_rgba("#9c633b"),      # leather light
        "C": hex_rgba("#2d66a8"),      # shield blue
        "c": hex_rgba("#76b8f5"),      # shield highlight
        "W": hex_rgba("#e2edf7"),      # sword blade bright
        "w": hex_rgba("#95aec7"),      # sword blade mid
        "U": hex_rgba("#000000", 85),  # ground shadow
    }

    def draw_hero_frame(col: int, row: int):
        ox = col * 24
        oy = row * 24
        # bobbing offset for walk/dash
        bob = 0
        leg_l, leg_r = 0, 0
        if col == 1:
            bob = -1
            leg_l, leg_r = -1, 1
        elif col == 3:
            bob = -1
            leg_l, leg_r = 1, -1
        elif col == 4:
            bob = 1
        elif col == 6:
            bob = -2

        # Ground shadow
        rect(img, ox + 7, oy + 20, 10, 2, C["U"])
        rect(img, ox + 6, oy + 21, 12, 1, C["U"])

        by = oy + 4 + bob

        # Direction: 0=down, 1=up, 2=left, 3=right
        if row == 0:  # DOWN
            # Pointed cap & head
            rect(img, ox + 9, by - 1, 6, 2, C["O"])
            rect(img, ox + 10, by, 4, 1, C["g"])
            rect(img, ox + 7, by + 1, 10, 4, C["O"])
            rect(img, ox + 8, by + 1, 8, 3, C["G"])
            rect(img, ox + 9, by + 1, 5, 1, C["g"])
            # cap tail flop
            rect(img, ox + 15, by + 2, 3, 2, C["O"])
            px(img, ox + 16, by + 2, C["d"])
            # hair fringe & face
            rect(img, ox + 7, by + 4, 10, 5, C["O"])
            rect(img, ox + 8, by + 4, 8, 2, C["H"])
            rect(img, ox + 8, by + 5, 8, 3, C["S"])
            px(img, ox + 8, by + 5, C["H"])
            px(img, ox + 15, by + 5, C["H"])
            # eyes
            px(img, ox + 9, by + 6, C["E"])
            px(img, ox + 14, by + 6, C["E"])
            # Torso tunic
            rect(img, ox + 6, by + 9, 12, 6, C["O"])
            rect(img, ox + 7, by + 9, 10, 5, C["G"])
            rect(img, ox + 8, by + 9, 6, 2, C["g"])
            # Belt + gold buckle
            rect(img, ox + 7, by + 12, 10, 1, C["B"])
            rect(img, ox + 11, by + 12, 2, 1, C["h"])
            if col == 7:
                # Classic Zelda triumphant two-arms-raised item-hold pose (strictly inside 24x24)
                # Left arm raised
                rect(img, ox + 4, by + 1, 3, 9, C["O"])
                rect(img, ox + 5, by + 4, 1, 5, C["G"])
                rect(img, ox + 5, by + 2, 1, 2, C["S"])
                # Right arm raised
                rect(img, ox + 17, by + 1, 3, 9, C["O"])
                rect(img, ox + 18, by + 4, 1, 5, C["G"])
                rect(img, ox + 18, by + 2, 1, 2, C["S"])
            else:
                # Shield on right side (viewer right)
                rect(img, ox + 15, by + 10, 4, 5, C["O"])
                rect(img, ox + 16, by + 11, 2, 3, C["C"])
                px(img, ox + 16, by + 11, C["h"])
            # Boots
            rect(img, ox + 8, by + 15 + max(0, leg_l), 3, 2, C["O"])
            px(img, ox + 9, by + 15 + max(0, leg_l), C["b"])
            rect(img, ox + 13, by + 15 + max(0, leg_r), 3, 2, C["O"])
            px(img, ox + 14, by + 15 + max(0, leg_r), C["b"])
            # Sword if attacking (strictly bounded inside 24x24 frame!)
            if col in (4, 5):
                sx = ox + (8 if col == 4 else 11)
                rect(img, sx, by + 13, 3, 5, C["O"])
                rect(img, sx + 1, by + 14, 1, 3, C["W"])
                rect(img, sx - 1, by + 13, 5, 1, C["H"])

        elif row == 1:  # UP
            # Pointed cap back
            rect(img, ox + 9, by - 1, 6, 2, C["O"])
            rect(img, ox + 7, by + 1, 10, 7, C["O"])
            rect(img, ox + 8, by + 1, 8, 6, C["G"])
            rect(img, ox + 9, by + 2, 6, 2, C["g"])
            rect(img, ox + 10, by + 5, 4, 2, C["d"])
            # Hair peek at bottom
            rect(img, ox + 8, by + 7, 8, 2, C["H"])
            # Torso back + shield strapped/side
            rect(img, ox + 6, by + 9, 12, 6, C["O"])
            rect(img, ox + 7, by + 9, 10, 5, C["G"])
            rect(img, ox + 7, by + 12, 10, 1, C["B"])
            # Shield on left side
            rect(img, ox + 5, by + 10, 4, 5, C["O"])
            rect(img, ox + 6, by + 11, 2, 3, C["C"])
            px(img, ox + 6, by + 11, C["h"])
            # Boots
            rect(img, ox + 8, by + 15 + max(0, leg_l), 3, 2, C["O"])
            px(img, ox + 9, by + 15 + max(0, leg_l), C["b"])
            rect(img, ox + 13, by + 15 + max(0, leg_r), 3, 2, C["O"])
            px(img, ox + 14, by + 15 + max(0, leg_r), C["b"])
            if col in (4, 5):
                sx = ox + (11 if col == 4 else 9)
                rect(img, sx, oy + 0, 3, 5, C["O"])
                rect(img, sx + 1, oy + 1, 1, 3, C["W"])

        else:  # LEFT (row 2) or RIGHT (row 3)
            facing_right = (row == 3)
            # Draw facing right into temp 24x24, flip if left
            tmp = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
            ty = 4 + bob
            # Cap trailing behind (left)
            rect(tmp, 5, ty + 2, 4, 3, C["O"])
            rect(tmp, 6, ty + 3, 3, 1, C["d"])
            # Head
            rect(tmp, 8, ty, 9, 8, C["O"])
            rect(tmp, 9, ty + 1, 7, 3, C["G"])
            rect(tmp, 10, ty + 1, 5, 1, C["g"])
            rect(tmp, 9, ty + 4, 7, 4, C["S"])
            rect(tmp, 9, ty + 4, 3, 3, C["H"])  # sideburn hair
            px(tmp, 14, ty + 6, C["E"])  # eye
            # Torso
            rect(tmp, 8, ty + 8, 8, 7, C["O"])
            rect(tmp, 9, ty + 9, 6, 5, C["G"])
            rect(tmp, 10, ty + 9, 4, 2, C["g"])
            rect(tmp, 9, ty + 12, 6, 1, C["B"])
            px(tmp, 13, ty + 12, C["h"])
            # Shield in front/side
            rect(tmp, 13, ty + 10, 4, 5, C["O"])
            rect(tmp, 14, ty + 11, 2, 3, C["C"])
            px(tmp, 14, ty + 11, C["h"])
            # Legs
            rect(tmp, 9 + leg_l, ty + 15, 3, 2, C["O"])
            px(tmp, 10 + leg_l, ty + 15, C["b"])
            rect(tmp, 12 + leg_r, ty + 15, 3, 2, C["O"])
            px(tmp, 13 + leg_r, ty + 15, C["b"])
            # Sword lunge
            if col in (4, 5):
                rect(tmp, 16, ty + 10, 7, 3, C["O"])
                rect(tmp, 17, ty + 11, 5, 1, C["W"])
                rect(tmp, 16, ty + 9, 1, 5, C["H"])
            if not facing_right:
                tmp = tmp.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            img.alpha_composite(tmp, (ox, oy))

        # Dash sparkle tint on col 6
        if col == 6:
            px(img, ox + 4, oy + 16, hex_rgba("#c8f5ff"))
            px(img, ox + 6, oy + 18, hex_rgba("#ffffff"))
            px(img, ox + 19, oy + 16, hex_rgba("#c8f5ff"))
        # Subtle gleam on col 7 non-front rows
        if col == 7 and row != 0:
            px(img, ox + 11, oy + 1, C["h"])
            px(img, ox + 12, oy + 1, C["h"])

    for r in range(4):
        for c in range(8):
            draw_hero_frame(c, r)

    img.save(os.path.join(OUT_DIR, "hero.png"))
    print("Saved hero.png")


def generate_enemies():
    """8 cols x 4 rows of 24x24 frames (192x96).
    Row 0: Slime, Row 1: Skeleton Knight, Row 2: Wizzrobe Mage, Row 3: Sanctum Guardian
    """
    img = Image.new("RGBA", (8 * 24, 4 * 24), (0, 0, 0, 0))
    O = hex_rgba("#16121a")
    SH = hex_rgba("#000000", 85)
    W = hex_rgba("#ffffff")

    # Row 0: Slime (cols 0-5 emerald, 6-7 elite magenta)
    for col in range(8):
        ox, oy = col * 24, 0
        elite = col >= 6
        c_mid = hex_rgba("#b8338a") if elite else hex_rgba("#38b86b")
        c_hi = hex_rgba("#f57cd0") if elite else hex_rgba("#8cf5a5")
        c_lo = hex_rgba("#6b1a52") if elite else hex_rgba("#1e6e42")
        squash = [0, 1, 0, -1, -3, 2, 0, -1][col]
        w = 14 + max(0, squash * 2)
        h = 10 - squash
        x0 = ox + (24 - w) // 2
        y0 = oy + 19 - h
        rect(img, ox + 6, oy + 19, 12, 2, SH)
        # rounded blob
        rect(img, x0, y0 + 2, w, h - 2, O)
        rect(img, x0 + 2, y0, w - 4, h, O)
        rect(img, x0 + 1, y0 + 2, w - 2, h - 3, c_mid)
        rect(img, x0 + 3, y0 + 1, w - 6, h - 2, c_mid)
        rect(img, x0 + 2, y0 + h - 3, w - 4, 2, c_lo)
        # glossy highlight
        rect(img, x0 + 3, y0 + 2, 3, 2, c_hi)
        px(img, x0 + 3, y0 + 2, W)
        # eyes
        ex1 = ox + 9
        ex2 = ox + 14
        ey = y0 + h // 2
        rect(img, ex1, ey, 2, 2, O)
        rect(img, ex2, ey, 2, 2, O)
        px(img, ex1, ey, W)
        px(img, ex2, ey, W)

    # Row 1: Skeleton / Armored Knight
    BONE = hex_rgba("#ede7d5")
    BONE_D = hex_rgba("#b8ad95")
    ARMOR = hex_rgba("#52607a")
    ARMOR_H = hex_rgba("#8ea1bf")
    RED = hex_rgba("#d93848")
    GOLD = hex_rgba("#e8b948")
    for col in range(8):
        ox, oy = col * 24, 24
        bob = -1 if col % 2 == 1 else 0
        rect(img, ox + 6, oy + 20, 12, 2, SH)
        by = oy + 3 + bob
        # Plume
        rect(img, ox + 10, by - 1, 4, 2, RED)
        # Helmet & skull visor
        rect(img, ox + 7, by + 1, 10, 7, O)
        rect(img, ox + 8, by + 2, 8, 5, ARMOR)
        rect(img, ox + 9, by + 2, 6, 2, ARMOR_H)
        rect(img, ox + 8, by + 5, 8, 2, O)
        px(img, ox + 9, by + 5, RED)
        px(img, ox + 14, by + 5, RED)
        # Ribcage / breastplate
        rect(img, ox + 7, by + 8, 10, 7, O)
        rect(img, ox + 8, by + 9, 8, 5, ARMOR)
        rect(img, ox + 9, by + 9, 6, 2, BONE)
        rect(img, ox + 9, by + 12, 6, 1, GOLD)
        # Tower Shield on left
        rect(img, ox + 3, by + 8, 5, 8, O)
        rect(img, ox + 4, by + 9, 3, 6, ARMOR_H)
        rect(img, ox + 5, by + 10, 1, 4, GOLD)
        # Sword on right
        sw_y = by + (5 if col in (4, 5) else 9)
        rect(img, ox + 17, sw_y, 3, 7, O)
        rect(img, ox + 18, sw_y + 1, 1, 5, BONE)
        rect(img, ox + 16, sw_y + 5, 5, 1, GOLD)
        # Legs
        l_off = 1 if col in (1, 5) else 0
        r_off = 1 if col in (3, 7) else 0
        rect(img, ox + 8, by + 15 + l_off, 3, 2, O)
        px(img, ox + 9, by + 15 + l_off, BONE_D)
        rect(img, ox + 13, by + 15 + r_off, 3, 2, O)
        px(img, ox + 14, by + 15 + r_off, BONE_D)

    # Row 2: Wizzrobe Mage
    ROBE = hex_rgba("#5b338a")
    ROBE_H = hex_rgba("#8e54cc")
    ROBE_D = hex_rgba("#351b54")
    CYAN = hex_rgba("#62f2ff")
    for col in range(8):
        ox, oy = col * 24, 48
        hover = int(round(math.sin(col * 0.9) * 1.5))
        alpha_mult = 0.45 if col >= 6 else 1.0
        tmp = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
        rect(tmp, 7, 20, 10, 2, SH)
        by = 3 + hover
        # Pointed hood
        rect(tmp, 10, by, 4, 2, O)
        rect(tmp, 8, by + 2, 8, 6, O)
        rect(tmp, 9, by + 2, 6, 5, ROBE)
        rect(tmp, 10, by + 2, 4, 2, ROBE_H)
        # Dark void face with glowing eyes
        rect(tmp, 9, by + 5, 6, 3, O)
        px(tmp, 10, by + 6, CYAN)
        px(tmp, 13, by + 6, CYAN)
        # Flowing robe
        rect(tmp, 6, by + 8, 12, 9, O)
        rect(tmp, 7, by + 9, 10, 7, ROBE)
        rect(tmp, 8, by + 9, 4, 6, ROBE_H)
        rect(tmp, 11, by + 9, 2, 7, GOLD)
        rect(tmp, 7, by + 15, 10, 1, ROBE_D)
        # Arcane staff
        staff_y = by + (3 if col in (4, 5) else 7)
        rect(tmp, 18, staff_y, 2, 10, O)
        rect(tmp, 18, staff_y + 2, 1, 7, GOLD)
        rect(tmp, 17, staff_y - 1, 4, 4, O)
        rect(tmp, 18, staff_y, 2, 2, CYAN if col not in (4, 5) else W)
        if alpha_mult < 1.0:
            r_c, g_c, b_c, a_c = tmp.split()
            a_c = a_c.point(lambda v: int(v * alpha_mult))
            tmp = Image.merge("RGBA", (r_c, g_c, b_c, a_c))
        img.alpha_composite(tmp, (ox, oy))

    # Row 3: Sanctum Guardian (Horned Obsidian & Gold Colossus)
    OBS = hex_rgba("#2d2c3d")
    OBS_H = hex_rgba("#535070")
    OBS_D = hex_rgba("#181724")
    EMBER = hex_rgba("#ff5e3a")
    EMBER_H = hex_rgba("#ffcf56")
    for col in range(8):
        ox, oy = col * 24, 72
        bob = -1 if col % 2 == 1 else 0
        rect(img, ox + 4, oy + 20, 16, 3, SH)
        by = oy + 1 + bob
        # Horns
        rect(img, ox + 4, by + 1, 3, 4, O)
        rect(img, ox + 5, by + 2, 1, 2, GOLD)
        rect(img, ox + 17, by + 1, 3, 4, O)
        rect(img, ox + 18, by + 2, 1, 2, GOLD)
        # Crowned obsidian head
        rect(img, ox + 7, by + 2, 10, 7, O)
        rect(img, ox + 8, by + 3, 8, 5, OBS)
        rect(img, ox + 9, by + 3, 6, 2, GOLD)
        # Glowing visor slit
        rect(img, ox + 8, by + 6, 8, 2, O)
        rect(img, ox + 9, by + 6, 2, 1, EMBER_H if col in (4, 5, 6, 7) else EMBER)
        rect(img, ox + 13, by + 6, 2, 1, EMBER_H if col in (4, 5, 6, 7) else EMBER)
        # Massive armored torso & pauldrons
        rect(img, ox + 3, by + 9, 18, 9, O)
        rect(img, ox + 4, by + 10, 16, 7, OBS)
        rect(img, ox + 4, by + 10, 4, 4, OBS_H)
        rect(img, ox + 16, by + 10, 4, 4, OBS_H)
        # Glowing rune core
        rect(img, ox + 10, by + 11, 4, 4, EMBER)
        rect(img, ox + 11, by + 12, 2, 2, EMBER_H)
        # Gold trim
        rect(img, ox + 5, by + 15, 14, 1, GOLD)
        # Heavy boots
        rect(img, ox + 6, by + 18, 4, 3, O)
        rect(img, ox + 7, by + 18, 2, 2, OBS_H)
        rect(img, ox + 14, by + 18, 4, 3, O)
        rect(img, ox + 15, by + 18, 2, 2, OBS_H)

    img.save(os.path.join(OUT_DIR, "enemies.png"))
    print("Saved enemies.png")


def generate_objects():
    """8 cols x 4 rows of 16x16 objects & items (128x64)."""
    img = Image.new("RGBA", (8 * 16, 4 * 16), (0, 0, 0, 0))
    O = hex_rgba("#16121a")
    W = hex_rgba("#ffffff")

    def tile_xy(idx: int):
        return (idx % 8) * 16, (idx // 8) * 16

    # 0: Pushable Carved Stone Block
    ox, oy = tile_xy(0)
    rect(img, ox + 1, oy + 1, 14, 14, O)
    rect(img, ox + 2, oy + 2, 12, 12, hex_rgba("#6e7d91"))
    rect(img, ox + 2, oy + 2, 12, 2, hex_rgba("#a8b9cf"))
    rect(img, ox + 2, oy + 2, 2, 12, hex_rgba("#90a2ba"))
    rect(img, ox + 2, oy + 12, 12, 2, hex_rgba("#404b59"))
    rect(img, ox + 12, oy + 2, 2, 12, hex_rgba("#404b59"))
    # carved gold diamond emblem
    rect(img, ox + 6, oy + 5, 4, 6, hex_rgba("#404b59"))
    rect(img, ox + 5, oy + 6, 6, 4, hex_rgba("#404b59"))
    rect(img, ox + 7, oy + 6, 2, 4, hex_rgba("#e8b948"))
    rect(img, ox + 6, oy + 7, 4, 2, hex_rgba("#e8b948"))
    px(img, ox + 7, oy + 7, hex_rgba("#fff0a8"))

    # 1: Cracked Destructible Block
    ox, oy = tile_xy(1)
    rect(img, ox + 1, oy + 1, 14, 14, O)
    rect(img, ox + 2, oy + 2, 12, 12, hex_rgba("#7a685b"))
    rect(img, ox + 2, oy + 2, 12, 2, hex_rgba("#a89485"))
    rect(img, ox + 2, oy + 12, 12, 2, hex_rgba("#4a3d34"))
    # dark jagged cracks
    for cx, cy in [(4, 3), (5, 4), (6, 5), (7, 5), (8, 6), (8, 7), (7, 8), (6, 9), (9, 8), (10, 9), (11, 10), (11, 11), (5, 10), (4, 11)]:
        px(img, ox + cx, oy + cy, O)
        px(img, ox + cx + 1, oy + cy, hex_rgba("#382c24"))

    # 2: Brazier Unlit, 3: Brazier Lit 1, 4: Brazier Lit 2
    for idx in (2, 3, 4):
        ox, oy = tile_xy(idx)
        # stone/iron pedestal
        rect(img, ox + 4, oy + 11, 8, 4, O)
        rect(img, ox + 5, oy + 12, 6, 2, hex_rgba("#525c6b"))
        rect(img, ox + 3, oy + 7, 10, 5, O)
        rect(img, ox + 4, oy + 8, 8, 3, hex_rgba("#3c4452"))
        rect(img, ox + 4, oy + 8, 8, 1, hex_rgba("#7d8b9e"))
        rect(img, ox + 5, oy + 7, 6, 1, hex_rgba("#292424"))
        if idx == 3:
            rect(img, ox + 5, oy + 4, 6, 4, hex_rgba("#e85220"))
            rect(img, ox + 6, oy + 2, 4, 5, hex_rgba("#ff9b29"))
            rect(img, ox + 7, oy + 4, 2, 3, hex_rgba("#fff085"))
            px(img, ox + 7, oy + 1, hex_rgba("#ff9b29"))
        elif idx == 4:
            rect(img, ox + 5, oy + 3, 6, 5, hex_rgba("#e85220"))
            rect(img, ox + 6, oy + 1, 4, 6, hex_rgba("#ffad33"))
            rect(img, ox + 7, oy + 3, 2, 4, W)
            px(img, ox + 9, oy + 1, hex_rgba("#ff9b29"))

    # 5: Crystal Switch Blue, 6: Crystal Switch Red
    for idx, c_d, c_m, c_h in [
        (5, hex_rgba("#1e56a8"), hex_rgba("#3da6ff"), hex_rgba("#bdf0ff")),
        (6, hex_rgba("#a81e33"), hex_rgba("#ff425b"), hex_rgba("#ffc2cc")),
    ]:
        ox, oy = tile_xy(idx)
        rect(img, ox + 4, oy + 11, 8, 4, O)
        rect(img, ox + 5, oy + 12, 6, 2, hex_rgba("#697587"))
        rect(img, ox + 4, oy + 3, 8, 9, O)
        rect(img, ox + 5, oy + 2, 6, 10, O)
        rect(img, ox + 5, oy + 4, 6, 7, c_d)
        rect(img, ox + 6, oy + 3, 4, 7, c_m)
        rect(img, ox + 6, oy + 4, 2, 3, c_h)
        px(img, ox + 6, oy + 4, W)

    # 7: Barred Door Grate (iron portcullis)
    ox, oy = tile_xy(7)
    rect(img, ox, oy + 1, 16, 2, O)
    rect(img, ox, oy + 13, 16, 2, O)
    for bx in (2, 6, 10, 14):
        rect(img, ox + bx - 1, oy, 3, 16, O)
        rect(img, ox + bx, oy, 1, 16, hex_rgba("#9aa9bd"))
    rect(img, ox, oy + 2, 16, 1, hex_rgba("#647285"))
    rect(img, ox, oy + 13, 16, 1, hex_rgba("#647285"))

    # 8-11: Toggle Barriers (Blue Up, Blue Down, Red Up, Red Down)
    for idx, raised, c_d, c_m, c_h in [
        (8, True, hex_rgba("#1c4a94"), hex_rgba("#3898f0"), hex_rgba("#a6e4ff")),
        (9, False, hex_rgba("#1c4a94"), hex_rgba("#2b6ab8"), hex_rgba("#6eb4f5")),
        (10, True, hex_rgba("#941c32"), hex_rgba("#f03854"), hex_rgba("#ffa6b8")),
        (11, False, hex_rgba("#941c32"), hex_rgba("#b82b44"), hex_rgba("#f56e85")),
    ]:
        ox, oy = tile_xy(idx)
        if raised:
            rect(img, ox + 1, oy + 1, 14, 14, O)
            rect(img, ox + 2, oy + 2, 12, 12, c_d)
            rect(img, ox + 2, oy + 2, 12, 8, c_m)
            rect(img, ox + 3, oy + 3, 10, 2, c_h)
            px(img, ox + 4, oy + 3, W)
            rect(img, ox + 5, oy + 6, 6, 2, c_d)
        else:
            rect(img, ox + 2, oy + 2, 12, 12, O)
            rect(img, ox + 3, oy + 3, 10, 10, c_d)
            rect(img, ox + 4, oy + 4, 8, 8, hex_rgba("#222633"))
            rect(img, ox + 6, oy + 6, 4, 4, c_m)

    # 12-15: Chests (Normal Closed/Open, Ornate Closed/Open)
    for idx, is_open, wood, wood_hi, trim in [
        (12, False, hex_rgba("#8c5228"), hex_rgba("#bd753c"), hex_rgba("#e8b948")),
        (13, True, hex_rgba("#8c5228"), hex_rgba("#bd753c"), hex_rgba("#e8b948")),
        (14, False, hex_rgba("#9c2335"), hex_rgba("#d93b52"), hex_rgba("#ffd559")),
        (15, True, hex_rgba("#9c2335"), hex_rgba("#d93b52"), hex_rgba("#ffd559")),
    ]:
        ox, oy = tile_xy(idx)
        rect(img, ox + 1, oy + 2, 14, 12, O)
        rect(img, ox + 2, oy + 3, 12, 10, wood)
        if not is_open:
            rect(img, ox + 2, oy + 3, 12, 4, wood_hi)
            rect(img, ox + 2, oy + 7, 12, 1, O)
            # gold trim bands
            rect(img, ox + 2, oy + 3, 12, 1, trim)
            rect(img, ox + 2, oy + 12, 12, 1, trim)
            rect(img, ox + 7, oy + 6, 2, 3, trim)
            px(img, ox + 7, oy + 7, O)
        else:
            rect(img, ox + 2, oy + 2, 12, 3, trim)
            rect(img, ox + 3, oy + 5, 10, 4, hex_rgba("#21140d"))
            rect(img, ox + 5, oy + 6, 6, 2, hex_rgba("#fff099"))
            rect(img, ox + 2, oy + 9, 12, 4, wood)
            rect(img, ox + 2, oy + 12, 12, 1, trim)

    # 16: Full Heart
    ox, oy = tile_xy(16)
    heart_pat = [
        "................",
        "................",
        "...OOO....OOO...",
        "..ORRRO..ORRRO..",
        ".ORWWWRRORRRRRO.",
        ".ORWRRRRRRRRRRO.",
        ".ORRRRRRRRRRRRO.",
        "..ORRRRRRRRRRO..",
        "...ORRRRRRRRO...",
        "....ORRRRRRO....",
        ".....ORRRRO.....",
        "......ORRO......",
        ".......OO.......",
        "................",
        "................",
        "................",
    ]
    draw_pattern(img, ox, oy, heart_pat, {"O": O, "R": hex_rgba("#e82c48"), "W": hex_rgba("#ff9eb0")})

    # 17: Half Heart
    ox, oy = tile_xy(17)
    half_pat = [
        "................",
        "................",
        "...OOO....OOO...",
        "..ORRRO..O...O..",
        ".ORWWWRRO.....O.",
        ".ORWRRRRO.....O.",
        ".ORRRRRRO.....O.",
        "..ORRRRRO....O..",
        "...ORRRRO...O...",
        "....ORRRO..O....",
        ".....ORRO.O.....",
        "......ORO.......",
        ".......OO.......",
        "................",
        "................",
        "................",
    ]
    draw_pattern(img, ox, oy, half_pat, {"O": O, "R": hex_rgba("#e82c48"), "W": hex_rgba("#ff9eb0")})

    # 18: Golden Key
    ox, oy = tile_xy(18)
    key_pat = [
        "................",
        ".....OOOOOO.....",
        "....OGGGGGGO....",
        "...OGHHGGHGO....",
        "...OGGOOGGGO....",
        "....OGGGGGGO....",
        ".....OOGGOO.....",
        "......OGGO......",
        "......OGGO......",
        "......OGGOOO....",
        "......OGGHGO....",
        "......OGGOOO....",
        "......OGGHGO....",
        "......OGGO......",
        ".......OO.......",
        "................",
    ]
    draw_pattern(img, ox, oy, key_pat, {"O": O, "G": hex_rgba("#e8b948"), "H": hex_rgba("#fff0a8")})

    # 19-21: Gems (Emerald, Sapphire, Ruby)
    gem_pat = [
        "................",
        ".......OO.......",
        "......OHMO......",
        ".....OHMMMO.....",
        "....OHMMMMMO....",
        "....OHMMMMDO....",
        "....OMMMMMDO....",
        "....OMMMMMDO....",
        "....OMMMMMDO....",
        "....OMMMMMDO....",
        "....OMMMMMDO....",
        ".....OMMMDO.....",
        "......OMDO......",
        ".......OO.......",
        "................",
        "................",
    ]
    for idx, h_c, m_c, d_c in [
        (19, hex_rgba("#9effb8"), hex_rgba("#2ec96b"), hex_rgba("#16783d")),
        (20, hex_rgba("#a6e8ff"), hex_rgba("#2e8be8"), hex_rgba("#164a8a")),
        (21, hex_rgba("#ff9eb2"), hex_rgba("#e82e4d"), hex_rgba("#8a162b")),
    ]:
        ox, oy = tile_xy(idx)
        draw_pattern(img, ox, oy, gem_pat, {"O": O, "H": h_c, "M": m_c, "D": d_c})

    # 22: Boomerang
    ox, oy = tile_xy(22)
    boom_pat = [
        "................",
        "......OOOOO.....",
        "....OOBBBBBO....",
        "...OBBHHHBBBO...",
        "..OBBBOOOOBBO...",
        "..OBBO....OOO...",
        "..OBBO..........",
        "..OBBO..........",
        "...OBBO.........",
        "...OGGGO........",
        "....OGGGO.......",
        ".....OGGGGO.....",
        "......OGGGGO....",
        ".......OOOO.....",
        "................",
        "................",
    ]
    draw_pattern(img, ox, oy, boom_pat, {"O": O, "B": hex_rgba("#2f8de8"), "H": hex_rgba("#9ce2ff"), "G": hex_rgba("#e8b948")})

    # 23: Fire Rod
    ox, oy = tile_xy(23)
    rod_pat = [
        "................",
        "..........OOOO..",
        ".........OGRRRO.",
        "........OGHWWRO.",
        "........OGRRRGO.",
        "........OGGGGO..",
        ".......OGGOO....",
        "......OGGO......",
        ".....OGGO.......",
        "....OGGO........",
        "...OGGO.........",
        "..OGGO..........",
        ".OGGO...........",
        ".OOO............",
        "................",
        "................",
    ]
    draw_pattern(img, ox, oy, rod_pat, {"O": O, "G": hex_rgba("#e8b948"), "H": hex_rgba("#fff0a8"), "R": hex_rgba("#f03824"), "W": hex_rgba("#ffcf56")})

    # 24: Bomb, 25: Bomb Flash
    for idx, body, hi in [
        (24, hex_rgba("#2e3c54"), hex_rgba("#647ca3")),
        (25, hex_rgba("#e8382c"), hex_rgba("#ff9a73")),
    ]:
        ox, oy = tile_xy(idx)
        bomb_pat = [
            "................",
            "..........YY....",
            ".........YFFY...",
            "........O.YY....",
            ".......O........",
            ".....OOOOOO.....",
            "....OBBBBBBO....",
            "...OBHHBBBBBO...",
            "...OBHBBBBBBBO..",
            "...OBBBBBBBBBO..",
            "...OBBBBBBBBBO..",
            "....OBBBBBBBO...",
            ".....OOOOOOO....",
            "................",
            "................",
            "................",
        ]
        draw_pattern(img, ox, oy, bomb_pat, {"O": O, "B": body, "H": hi, "F": hex_rgba("#ff6624"), "Y": hex_rgba("#fff085")})

    # 26: Explosion 1, 27: Explosion 2
    ox, oy = tile_xy(26)
    rect(img, ox + 3, oy + 3, 10, 10, hex_rgba("#e84820"))
    rect(img, ox + 2, oy + 5, 12, 6, hex_rgba("#ff8824"))
    rect(img, ox + 5, oy + 2, 6, 12, hex_rgba("#ff8824"))
    rect(img, ox + 5, oy + 5, 6, 6, hex_rgba("#fff085"))
    rect(img, ox + 6, oy + 6, 4, 4, W)

    ox, oy = tile_xy(27)
    rect(img, ox + 1, oy + 4, 14, 8, hex_rgba("#52494d"))
    rect(img, ox + 4, oy + 1, 8, 14, hex_rgba("#52494d"))
    rect(img, ox + 3, oy + 3, 10, 10, hex_rgba("#d95b26"))
    rect(img, ox + 5, oy + 5, 6, 6, hex_rgba("#ffbd42"))

    # 28: Fireball Projectile
    ox, oy = tile_xy(28)
    rect(img, ox + 4, oy + 4, 8, 8, hex_rgba("#d93218"))
    rect(img, ox + 5, oy + 5, 6, 6, hex_rgba("#ff8c24"))
    rect(img, ox + 6, oy + 6, 4, 4, hex_rgba("#fff299"))
    rect(img, ox + 7, oy + 7, 2, 2, W)

    # 29: Arcane Enemy Orb
    ox, oy = tile_xy(29)
    rect(img, ox + 4, oy + 4, 8, 8, hex_rgba("#6e24b8"))
    rect(img, ox + 5, oy + 5, 6, 6, hex_rgba("#cc54ff"))
    rect(img, ox + 6, oy + 6, 4, 4, hex_rgba("#f5c2ff"))
    rect(img, ox + 7, oy + 7, 2, 2, W)

    # 30: Heart Container (Golden-framed Vessel)
    ox, oy = tile_xy(30)
    hc_pat = [
        "................",
        "..OOOO....OOOO..",
        ".OGGGGO..OGGGGO.",
        "OGRRRGGOOGGRRRGO",
        "OGRWWRRGGGRRRRGO",
        "OGRWRRRRRRRRRRGO",
        "OGRRRRRRRRRRRRGO",
        ".OGRRRRRRRRRRGO.",
        "..OGRRRRRRRRGO..",
        "...OGRRRRRRGO...",
        "....OGRRRRGO....",
        ".....OGRRGO.....",
        "......OGGO......",
        ".......OO.......",
        "................",
        "................",
    ]
    draw_pattern(img, ox, oy, hc_pat, {"O": O, "G": hex_rgba("#f0c44d"), "R": hex_rgba("#e82c48"), "W": hex_rgba("#ffb3c1")})

    # 31: Relic Star / Shrine Charm
    ox, oy = tile_xy(31)
    relic_pat = [
        "................",
        ".......OO.......",
        "......OGGO......",
        ".....OGHHGO.....",
        "....OGHGGHGO....",
        ".OOOGHGGGGHGOOO.",
        "OGGGHGGGGGGHGGGO",
        ".OGGGGGWWGGGGGO.",
        "..OGGGGWWGGGGO..",
        "...OGGGGGGGGO...",
        "..OGGGGOOGGGGO..",
        "..OGGO....OGGO..",
        "...OO......OO...",
        "................",
        "................",
        "................",
    ]
    draw_pattern(img, ox, oy, relic_pat, {"O": O, "G": hex_rgba("#e8b948"), "H": hex_rgba("#fff0a8"), "W": hex_rgba("#7ef6ff")})

    img.save(os.path.join(OUT_DIR, "objects.png"))
    print("Saved objects.png")


def generate_favicon():
    """64x64 crisp pixel-art shield & emerald rune icon."""
    base = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    O = hex_rgba("#12151f")
    G = hex_rgba("#e8b948")
    GH = hex_rgba("#fff0a8")
    B = hex_rgba("#24395c")
    BH = hex_rgba("#385d8f")
    E = hex_rgba("#38d989")
    EH = hex_rgba("#a8ffcf")

    pat = [
        "....OOOOOOOO....",
        "..OOGGGGGGGGOO..",
        ".OGHHBBBBBBHHGO.",
        ".OGBBBBBBBBBBGO.",
        ".OGBBBHBBHBBBGO.",
        ".OGBBBEHHBBEBGO.",
        ".OGBBBEHEEBBBGO.",
        ".OGBBBEEEEBBBGO.",
        "..OGBBBEBBBBGO..",
        "..OGBBBBBBBBGO..",
        "...OGBBBBBBGO...",
        "....OGBBBBGO....",
        ".....OGBBGO.....",
        "......OGGO......",
        ".......OO.......",
        "................",
    ]
    draw_pattern(base, 0, 0, pat, {"O": O, "G": G, "H": GH, "B": B, "E": E})
    px(base, 7, 5, EH)
    px(base, 8, 5, EH)
    px(base, 4, 4, BH)
    px(base, 11, 4, BH)

    big = base.resize((64, 64), Image.Resampling.NEAREST)
    big.save(os.path.join(OUT_DIR, "favicon.png"))
    print("Saved favicon.png")


if __name__ == "__main__":
    generate_tiles()
    generate_hero()
    generate_enemies()
    generate_objects()
    generate_favicon()
    print("All pixel-art assets generated successfully!")
