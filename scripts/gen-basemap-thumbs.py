#!/usr/bin/env python3
"""
Regenerate the run-card thumbnail base-map crops in src/assets/basemap-thumbs/.

The thumbnail (src/components/left-panel/run-thumbnail.tsx) draws a synthetic mini-map: a baked
base-map PNG ground with the storm track / H-L / SST-anomaly markers projected on top. The base-map
PNGs are Web-Mercator crops of an exact lat/lng window, and that window MUST match the projection
bounds in run-thumbnail.tsx (LAT_MAX / LAT_MIN / LNG_MIN / LNG_MAX) or the coastlines won't line up
with the markers. This script fetches the same Esri tile layers the live app uses, stitches them,
and crops to that exact window.

Usage:  python3 scripts/gen-basemap-thumbs.py
Requires: Pillow (pip install Pillow) and network access to the Esri tile servers.

To change the framing: edit LNG_MIN / LNG_MAX / LAT_MAX below, run this, then set the SAME values in
run-thumbnail.tsx. (LAT_MIN is computed to keep the 100:78 aspect with the top fixed.)
"""
import io, math, os, time, urllib.request
from PIL import Image

# ---- window (keep in sync with run-thumbnail.tsx) --------------------------------------------
Z = 4                               # tile zoom; source ~1080px wide -> ample for a 500px crop
LNG_MIN, LNG_MAX = -102.6667, 0.0   # full Gulf of Mexico on the left, West Africa/Iberia on the right
LAT_MAX = 56.9429                   # top fixed; bottom (LAT_MIN) derived below to keep 100:78
OUT_W, OUT_H = 500, 390             # crop size (100:78) — matches the thumbnail viewBox aspect

TILE = 256
LAYERS = {
    "satellite": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "street":    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    "relief":    "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/ETOPO1_Global_Relief_Model_Color_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
}

def mx(lng): return (lng + 180.0) / 360.0
def my(lat): return (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0
def lat_of_my(m): return math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * m))))

wnorm = mx(LNG_MAX) - mx(LNG_MIN)
LAT_MIN = lat_of_my(my(LAT_MAX) + wnorm * (OUT_H / float(OUT_W)))   # aspect-locked, top fixed
print(f"bounds: LAT_MAX={LAT_MAX} LAT_MIN={LAT_MIN:.4f} LNG_MIN={LNG_MIN} LNG_MAX={LNG_MAX}")
print(f"  -> set these in run-thumbnail.tsx (LAT_MIN rounded to 4dp)")

N = TILE * (2 ** Z)
gx = lambda lng: mx(lng) * N
gy = lambda lat: my(lat) * N
gx0, gx1, gy0, gy1 = gx(LNG_MIN), gx(LNG_MAX), gy(LAT_MAX), gy(LAT_MIN)
tx0, tx1 = int(gx0 // TILE), int(gx1 // TILE)
ty0, ty1 = int(gy0 // TILE), int(gy1 // TILE)

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "basemap-thumb-gen"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return Image.open(io.BytesIO(r.read())).convert("RGB")
        except Exception as e:
            if attempt == 3:
                raise RuntimeError(f"failed {url}: {e}")
            time.sleep(1.0)

outdir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "src", "assets", "basemap-thumbs")
for name, tmpl in LAYERS.items():
    canvas = Image.new("RGB", ((tx1 - tx0 + 1) * TILE, (ty1 - ty0 + 1) * TILE))
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            canvas.paste(fetch(tmpl.format(z=Z, y=ty, x=tx)), ((tx - tx0) * TILE, (ty - ty0) * TILE))
    box = (round(gx0 - tx0 * TILE), round(gy0 - ty0 * TILE),
           round(gx1 - tx0 * TILE), round(gy1 - ty0 * TILE))
    canvas.crop(box).resize((OUT_W, OUT_H), Image.LANCZOS).save(os.path.join(outdir, name + ".png"))
    print("wrote", name + ".png")
print("done ->", outdir)
