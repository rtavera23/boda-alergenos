#!/usr/bin/env python3
"""Extract dish photos from the alternative menu PDF into assets/dishes/."""

from __future__ import annotations

import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = next(ROOT.glob(".source-docs/Men* alternativo*.pdf"))
MENU_JSON = ROOT / "data" / "menu.json"
OUTPUT_DIR = ROOT / "assets" / "dishes"
ZOOM = 4  # ~288 DPI on A4 landscape

# Crop regions in PDF points (x0, y0, x1, y1). y1 stops before dish titles.
CROPS = [
    {
        "filename": "alt-primero-crema-calabaza-vieira.png",
        "page": 0,
        "bbox": (38, 72, 230, 198),
    },
    {
        "filename": "alt-primero-crema-zanahoria-quinoa.png",
        "page": 0,
        "bbox": (290, 60, 490, 198),
    },
    {
        "filename": "alt-primero-tataki-atun.png",
        "page": 0,
        "bbox": (565, 65, 758, 198),
    },
    {
        "filename": "alt-segundo-paletilla-cordero.png",
        "page": 0,
        "bbox": (42, 300, 242, 428),
    },
    {
        "filename": "alt-segundo-taco-merluza-romesco.png",
        "page": 0,
        "bbox": (286, 288, 490, 428),
    },
    {
        "filename": "alt-segundo-wellington-espinaca-setas.png",
        "page": 0,
        "bbox": (524, 268, 810, 428),
    },
    {
        "filename": "alt-postre-bizcocho-chocolate-almendra.png",
        "page": 1,
        "bbox": (18, 72, 232, 196),
    },
    {
        "filename": "alt-postre-tarta-mousse-mascarpone.png",
        "page": 1,
        "bbox": (272, 48, 522, 196),
    },
    {
        "filename": "alt-postre-fruta-temporada.png",
        "page": 1,
        "bbox": (532, 50, 784, 196),
    },
]


def crop_to_png(page: fitz.Page, bbox: tuple[float, float, float, float], out_path: Path) -> tuple[int, int]:
    rect = fitz.Rect(bbox)
    pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=rect, alpha=False)
    pix.save(out_path)
    return pix.width, pix.height


def load_expected_paths() -> set[str]:
    menu = json.loads(MENU_JSON.read_text(encoding="utf-8"))
    paths: set[str] = set()
    for section in menu["alternatives"].values():
        for dish in section:
            if dish.get("image"):
                paths.add(dish["image"])
    return paths


def main() -> None:
    expected = load_expected_paths()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(PDF_PATH)
    results = []

    for crop in CROPS:
        out_rel = f"assets/dishes/{crop['filename']}"
        out_path = ROOT / out_rel
        page = doc[crop["page"]]
        width, height = crop_to_png(page, tuple(crop["bbox"]), out_path)
        results.append(
            {
                "filename": crop["filename"],
                "path": out_rel,
                "page": crop["page"] + 1,
                "size": f"{width}x{height}",
                "exists": out_path.exists(),
                "expected": out_rel in expected,
            }
        )
        print(f"Saved {out_path} ({width}x{height})")

    doc.close()

    missing = expected - {r["path"] for r in results}
    if missing:
        raise SystemExit(f"Missing expected images: {missing}")

    extra = {r["path"] for r in results} - expected
    if extra:
        raise SystemExit(f"Unexpected extra images: {extra}")

    print(f"\nExtracted {len(results)} images to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
