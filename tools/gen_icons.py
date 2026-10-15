"""Genera iconos PWA (diana) sin dependencias: PNG RGBA con zlib+struct."""
import struct, zlib
from pathlib import Path

RINGS = ["#f5f5f5", "#212121", "#29b6f6", "#e53935", "#fdd835"]  # exterior -> centro
BG = "#121212"
SS = 4  # supermuestreo


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 1 + 2, 1 + 4))


def px_ring(x, y, n, cx, cy):
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    if d > n * 0.46:
        return BG
    i = min(int(d / (n * 0.46) * len(RINGS)), len(RINGS) - 1)
    return RINGS[i]


def png(n, path):
    ss, half = SS * n, SS * n // 2
    grid = [[px_ring(x, y, ss, half, half) for x in range(ss)] for y in range(ss)]
    rows = []
    for y in range(0, ss, SS):
        for _ in range(SS):
            row = bytearray([0])
            for x in range(0, ss, SS):
                block = [grid[y + j][x + i] for j in range(SS) for i in range(SS)]
                r = sum(p[0] for p in block) // SS // SS
                g = sum(p[1] for p in block) // SS // SS
                b = sum(p[2] for p in block) // SS // SS
                row += bytes((r, g, b, 255))
            rows.append(bytes(row))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    out = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(b"".join(rows))) + chunk(b"IEND", b"")
    Path(path).write_bytes(out)
    print(f"{path}: {n}x{n} {len(out)} B")


RINGS = [rgb(c) for c in RINGS] + [rgb("#fdd835")]
BG = rgb(BG)
for n in (192, 512):
    png(n, Path(__file__).parent.parent / "mobile" / f"icon-{n}.png")
