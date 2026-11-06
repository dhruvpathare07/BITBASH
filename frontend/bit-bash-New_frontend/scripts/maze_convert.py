"""Turn the MQ1..MQ10 maze images into playable Round 2 mazes.

For each image:
  - read every wall of the 30 x 15 grid from the pixels
  - check it's one connected maze (every cell reachable from the start)
  - open 4 exit gates (A-D) in the outer wall, all reachable
  - save a wall mask PNG (walls white, rest transparent; the green start /
    finish triangles removed, exit gates cut out) for the game to tint
  - write logicMazeMaps.js with the walls, start, exits and image geometry

usage (needs Pillow): python scripts/maze_convert.py <folder with MQ1.png..MQ10.png> src
"""
import collections
import json
import os
import sys

from PIL import Image

SRC = sys.argv[1]
FRONT = sys.argv[2]
OUT_IMG = os.path.join(FRONT, "assets", "mazes")
OUT_JS = os.path.join(FRONT, "data", "logicMazeMaps.js")
os.makedirs(OUT_IMG, exist_ok=True)

COLS, ROWS = 30, 15
CROP_TOP, CROP_BOTTOM = 82, 966          # maze box in the 2048 x 1024 image
X0, CW = 0.0, 2048 / COLS                # vertical line k at x = X0 + k*CW
Y0, CH = 87.0 - CROP_TOP, (959.5 - 87.0) / ROWS   # horizontal line k (in crop)
BORDER = 6                               # half the outer wall thickness

STEPS = {"top": (0, -1, "bottom"), "right": (1, 0, "left"),
         "bottom": (0, 1, "top"), "left": (-1, 0, "right")}

# Exit gates, spread over three sides, far from the top-left start.
# (x, y, side the gate opens on)
EXIT_PLAN = {"A": (20, 0, "top"), "B": (29, 4, "right"),
             "C": (14, 14, "bottom"), "D": (29, 14, "bottom")}
START = (0, 0)


def parse(im):
    g = im.convert("L")
    px = g.load()
    w, h = g.size

    def dark_near(x, y, r=3):
        x, y = int(round(x)), int(round(y))
        return any(px[min(w - 1, max(0, x + dx)), min(h - 1, max(0, y + dy))] < 110
                   for dx in range(-r, r + 1) for dy in range(-r, r + 1))

    cells = [[{s: True for s in STEPS} for _ in range(COLS)] for _ in range(ROWS)]
    for r in range(ROWS):
        for c in range(1, COLS):          # inner vertical walls
            wall = dark_near(X0 + c * CW, CROP_TOP + Y0 + (r + 0.5) * CH)
            cells[r][c - 1]["right"] = cells[r][c]["left"] = wall
    for r in range(1, ROWS):              # inner horizontal walls
        for c in range(COLS):
            wall = dark_near(X0 + (c + 0.5) * CW, CROP_TOP + Y0 + r * CH)
            cells[r - 1][c]["bottom"] = cells[r][c]["top"] = wall
    return cells


def reachable(cells, start):
    seen = {start}
    q = collections.deque([start])
    dist = {start: 0}
    while q:
        x, y = q.popleft()
        for side, (dx, dy, _) in STEPS.items():
            nx, ny = x + dx, y + dy
            if cells[y][x][side] or not (0 <= nx < COLS and 0 <= ny < ROWS) or (nx, ny) in seen:
                continue
            seen.add((nx, ny))
            dist[(nx, ny)] = dist[(x, y)] + 1
            q.append((nx, ny))
    return seen, dist


def make_mask(im, exits, out_path):
    """Walls white with alpha from darkness; everything else transparent."""
    crop = im.convert("RGB").crop((0, CROP_TOP, im.width, CROP_BOTTOM))
    w, h = crop.size
    src = crop.load()
    mask = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if g - r > 20:               # the green start / finish triangles (and their soft edges)
                continue
            lum = (r + g + b) / 3
            a = int(max(0, min(255, (230 - lum) * 255 / 200)))
            if a:
                dst[x, y] = (255, 255, 255, a)
    # cut the exit gates out of the outer wall
    for (cx, cy, side) in exits.values():
        if side in ("top", "bottom"):
            yc = Y0 if side == "top" else Y0 + ROWS * CH
            x1, x2 = X0 + cx * CW + BORDER + 2, X0 + (cx + 1) * CW - BORDER - 2
            for y in range(int(yc - BORDER - 2), int(yc + BORDER + 3)):
                for x in range(int(x1), int(x2) + 1):
                    if 0 <= x < w and 0 <= y < h:
                        dst[x, y] = (0, 0, 0, 0)
        else:
            xc = X0 if side == "left" else X0 + COLS * CW
            y1, y2 = Y0 + cy * CH + BORDER + 2, Y0 + (cy + 1) * CH - BORDER - 2
            for x in range(int(xc - BORDER - 2), int(xc + BORDER + 3)):
                for y in range(int(y1), int(y2) + 1):
                    if 0 <= x < w and 0 <= y < h:
                        dst[x, y] = (0, 0, 0, 0)
    mask.save(out_path, optimize=True)
    return w, h


def encode(cells):
    """One hex digit per cell: bit 1 top, 2 right, 4 bottom, 8 left."""
    bits = {"top": 1, "right": 2, "bottom": 4, "left": 8}
    return ["".join(format(sum(b for s, b in bits.items() if cell[s]), "x") for cell in row)
            for row in cells]


mazes = []
problems = []
for n in range(1, 11):
    path = os.path.join(SRC, f"MQ{n}.png")
    im = Image.open(path)
    cells = parse(im)
    seen, dist = reachable(cells, START)
    open_links = sum((not cells[r][c]["right"]) for r in range(ROWS) for c in range(COLS - 1)) + \
        sum((not cells[r][c]["bottom"]) for r in range(ROWS - 1) for c in range(COLS))
    if len(seen) != COLS * ROWS:
        problems.append(f"MQ{n}: only {len(seen)} of {COLS * ROWS} cells reachable")
    for letter, (x, y, side) in EXIT_PLAN.items():
        if (x, y) not in seen:
            problems.append(f"MQ{n}: exit {letter} unreachable")
        cells[y][x][side] = False         # open the gate
    w, h = make_mask(im, EXIT_PLAN, os.path.join(OUT_IMG, f"mq{n}.png"))
    lengths = {L: dist.get((x, y)) for L, (x, y, _) in EXIT_PLAN.items()}
    print(f"MQ{n}: {len(seen)}/{COLS * ROWS} cells reachable, {open_links} openings "
          f"({'one route each' if open_links == COLS * ROWS - 1 else 'has loops'}), "
          f"steps to exits {lengths}")
    mazes.append({"n": n, "rows": encode(cells), "w": w, "h": h})

if problems:
    print("PROBLEMS:", *problems, sep="\n  ")
    sys.exit(1)

imports = "\n".join(f'import mq{m["n"]} from "../assets/mazes/mq{m["n"]}.png";' for m in mazes)
entries = ",\n".join(
    f'  {{ id: "MQ{m["n"]}", image: mq{m["n"]}, rows: {json.dumps(m["rows"])} }}' for m in mazes)
exits_js = ", ".join(f'{L}: {{ x: {x}, y: {y}, side: "{s}" }}' for L, (x, y, s) in EXIT_PLAN.items())

js = f'''// GENERATED from the MQ1..MQ10 maze images by maze_convert.py. Do not edit by hand.
//
// Round 2 mazes: challenge 1 uses MQ1, challenge 2 uses MQ2, and so on.
// The game draws each maze image (src/assets/mazes, walls only, tinted in
// the game) and moves the player on the walls read from that same image.
// Each maze is one connected 30 x 15 grid: the player starts top-left and
// four gates in the outer wall are the exits A-D, all reachable.

{imports}

export const MAZE_COLS = {COLS};
export const MAZE_ROWS = {ROWS};

// Where the grid sits inside each image (pixels): line k is at
// x0 + k * cellW and y0 + k * cellH.
const IMAGE = {{ width: {mazes[0]["w"]}, height: {mazes[0]["h"]}, x0: {X0}, y0: {Y0:.3f}, cellW: {CW:.4f}, cellH: {CH:.4f} }};

const START = {{ x: {START[0]}, y: {START[1]} }};
const EXITS = {{ {exits_js} }};

const WALL_BITS = {{ top: 1, right: 2, bottom: 4, left: 8 }};

function decode(rows) {{
  return rows.map((row) =>
    [...row].map((hex) => {{
      const v = parseInt(hex, 16);
      return {{
        top: Boolean(v & WALL_BITS.top),
        right: Boolean(v & WALL_BITS.right),
        bottom: Boolean(v & WALL_BITS.bottom),
        left: Boolean(v & WALL_BITS.left),
      }};
    }})
  );
}}

const SOURCES = [
{entries},
];

export const LOGIC_MAZE_MAPS = SOURCES.map(({{ id, image, rows }}) => ({{
  id,
  cols: MAZE_COLS,
  rows: MAZE_ROWS,
  cells: decode(rows),
  start: START,
  exits: EXITS,
  image: {{ src: image, ...IMAGE }},
}}));

const STEPS = [
  {{ dx: 0, dy: -1, wall: "top" }},
  {{ dx: 1, dy: 0, wall: "right" }},
  {{ dx: 0, dy: 1, wall: "bottom" }},
  {{ dx: -1, dy: 0, wall: "left" }},
];

// Every exit must be reachable from the start (checked when the file is
// generated; kept here as a check in case the data is ever edited).
export function validateMazeMap(maze) {{
  const seen = new Set([`${{maze.start.x}},${{maze.start.y}}`]);
  const queue = [maze.start];
  for (let i = 0; i < queue.length; i += 1) {{
    const {{ x, y }} = queue[i];
    for (const s of STEPS) {{
      const nx = x + s.dx;
      const ny = y + s.dy;
      const key = `${{nx}},${{ny}}`;
      if (
        !maze.cells[y][x][s.wall] &&
        nx >= 0 && nx < maze.cols && ny >= 0 && ny < maze.rows &&
        !seen.has(key)
      ) {{
        seen.add(key);
        queue.push({{ x: nx, y: ny }});
      }}
    }}
  }}
  return Object.values(maze.exits).every((e) => seen.has(`${{e.x}},${{e.y}}`));
}}
'''
open(OUT_JS, "w", encoding="utf-8", newline="\n").write(js)
print("wrote", OUT_JS, "and", len(mazes), "masks,", sum(os.path.getsize(os.path.join(OUT_IMG, f"mq{m['n']}.png")) for m in mazes) // 1024, "KB")
