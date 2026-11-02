#!/usr/bin/env bash
# Buduje paczkę ZIP do instalacji („Załaduj rozpakowane" albo „Załaduj spakowane").
# Wynik: dist/trans-combajn-<wersja>.zip. Uruchamia najpierw kontrolę.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/check.sh >/dev/null || { echo "Kontrola nie przeszła, paczka nie powstała. Uruchom: bash scripts/check.sh"; exit 1; }
VERSION=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")
OUT="dist/trans-combajn-${VERSION}.zip"
mkdir -p dist
rm -f "$OUT"
python3 - "$OUT" <<'PY'
import os, sys, zipfile
out = sys.argv[1]
root = 'extension'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(root):
        for name in sorted(files):
            full = os.path.join(base, name)
            z.write(full, os.path.relpath(full, root))
print('zapisano', out)
PY
