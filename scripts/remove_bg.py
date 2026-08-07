#!/usr/bin/env python3
"""
Şəkillərin AĞ fonunu şəffaf edir.

İstifadə:
    python3 scripts/remove_bg.py                        # public/categories
    python3 scripts/remove_bg.py public/assets          # başqa qovluq
    python3 scripts/remove_bg.py foo.png bar.webp       # ayrıca fayllar
    python3 scripts/remove_bg.py --dry                  # yazmadan sınaq
    python3 scripts/remove_bg.py --force                # şəffafları da yenidən emal et
    python3 scripts/remove_bg.py --hard 250 --soft 230  # həssaslıq

Necə işləyir: hər pikselin ƏN QARANLIQ kanalına baxılır.
  >= hard        → tam şəffaf (təmiz ağ fon)
  soft..hard     → qismən şəffaf (yumşaq keçid, kənarda ağ halo qalmasın)
  <= soft        → toxunulmur (rəngli/ağ məhsulun özü itmir)
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

EXTS = {".png", ".webp", ".jpg", ".jpeg"}


def remove_white(img: Image.Image, hard: int, soft: int) -> Image.Image:
    """Ağ pikselləri alfa kanalına çevirir (numpy — bütün şəkil bir anda)."""
    arr = np.array(img.convert("RGBA"))
    rgb_min = arr[..., :3].min(axis=2).astype(np.int16)
    alpha = arr[..., 3].astype(np.float32)

    span = max(1, hard - soft)
    ramp = np.clip((hard - rgb_min) / span, 0.0, 1.0) * 255.0

    new_alpha = np.where(
        rgb_min >= hard, 0.0, np.where(rgb_min > soft, ramp, alpha)
    )
    arr[..., 3] = new_alpha.astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def is_transparent(img: Image.Image, ratio: float = 0.02) -> bool:
    """Şəklin 2%-dən çoxu tam şəffafdırsa — artıq emal olunub."""
    alpha = np.array(img.convert("RGBA"))[..., 3]
    return float((alpha == 0).mean()) > ratio


def collect(paths: list[str]) -> list[Path]:
    if not paths:
        paths = ["public/categories"]
    files: list[Path] = []
    for p in paths:
        path = Path(p)
        if path.is_dir():
            files += sorted(f for f in path.iterdir() if f.suffix.lower() in EXTS)
        elif path.is_file():
            files.append(path)
        else:
            print(f"  ! tapılmadı: {p}", file=sys.stderr)
    return files


def main() -> int:
    ap = argparse.ArgumentParser(description="Ağ fonu şəffaf edir")
    ap.add_argument("paths", nargs="*", help="qovluq və ya fayllar")
    ap.add_argument("--hard", type=int, default=248, help="tam şəffaflıq həddi")
    ap.add_argument("--soft", type=int, default=228, help="yumşaq keçid həddi")
    ap.add_argument("--quality", type=int, default=85)
    ap.add_argument("--dry", action="store_true", help="fayla yazma")
    ap.add_argument("--force", action="store_true", help="şəffafları da emal et")
    args = ap.parse_args()

    files = collect(args.paths)
    if not files:
        print("Şəkil tapılmadı.")
        return 1

    print(f"{len(files)} şəkil{' (DRY RUN)' if args.dry else ''}")
    done = skipped = 0

    for f in files:
        with Image.open(f) as img:
            img.load()
            if not args.force and is_transparent(img):
                skipped += 1
                continue

            before = f.stat().st_size
            out = remove_white(img, args.hard, args.soft)

        if not args.dry:
            if f.suffix.lower() in {".jpg", ".jpeg"}:
                f = f.with_suffix(".webp")  # jpg alfa saxlamır
            out.save(f, quality=args.quality, lossless=False)

        after = f.stat().st_size if f.exists() else before
        print(f"  ✓ {f.name}  {before // 1024}KB → {after // 1024}KB")
        done += 1

    print(f"Bitdi: {done} emal olundu, {skipped} artıq şəffaf idi.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
