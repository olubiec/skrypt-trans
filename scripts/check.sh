#!/usr/bin/env bash
# Kontrola przed wydaniem: składnia, testy i zasady bezpieczeństwa z CLAUDE.md.
# Uruchomienie: bash scripts/check.sh  (albo: npm run check)
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
note() { printf '%s\n' "$*"; }
bad()  { printf 'BLAD: %s\n' "$*"; fail=1; }

note "== Składnia (node --check)"
while IFS= read -r f; do
  node --check "$f" || bad "składnia: $f"
done < <(find extension -name '*.js')

note "== Testy (node --test)"
LOG=$(mktemp)
node --test tests/*.test.js >"$LOG" 2>&1 || { cat "$LOG"; bad "testy nie przechodzą"; }
grep -E '^# (pass|fail)' "$LOG" || true
rm -f "$LOG"

note "== Manifest"
python3 - <<'PY' || fail=1
import json, sys
m = json.load(open('extension/manifest.json', encoding='utf8'))
errs = []
if m.get('permissions') != ['storage']: errs.append(f"uprawnienia: {m.get('permissions')} (dozwolone tylko storage)")
if 'host_permissions' in m: errs.append('host_permissions niedozwolone')
for cs in m['content_scripts']:
    if cs.get('matches') != ['https://platform.trans.eu/*']: errs.append(f"matches: {cs.get('matches')}")
for cs in m['content_scripts']:
    for js in cs['js']:
        try:
            open('extension/' + js, encoding='utf8').close()
        except OSError:
            errs.append(f'brak pliku z manifestu: {js}')
if errs:
    print('\n'.join('BLAD: ' + e for e in errs)); sys.exit(1)
print('manifest OK')
PY

note "== Zasady bezpieczeństwa (wzorce zakazane)"
check_absent() {
  local pattern="$1" why="$2"
  if grep -rnE "$pattern" extension/src --include=*.js; then bad "$why"; fi
}
check_absent 'fonts\.googleapis|fonts\.gstatic' 'zewnętrzne fonty (CLAUDE.md pkt 6)'
check_absent '\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket' 'zapytania sieciowe z rozszerzenia (CLAUDE.md pkt 6)'
check_absent 'catch *\([a-zA-Z_]*\) *\{ *\}|catch *\{ *\}' 'pusty catch (CLAUDE.md zasady kodu)'
check_absent 'data-trans|dataset\.trans' 'zapis data-* w DOM Transa (CLAUDE.md pkt 5)'
# innerHTML wolno tylko ze stałym szablonem (literał `...` bez podstawień) albo pustym stringiem.
if grep -rnE '\.innerHTML *=[^=]' extension/src --include=*.js | grep -vE "innerHTML = \`|innerHTML = ''" ; then
  bad 'innerHTML z danymi (dozwolony tylko stały szablon albo pusty string)'
fi

# Wyślij zlecenie może wystąpić tylko w komentarzach, nigdy w kodzie klikającym.
if grep -rn "Wyślij zlecenie" extension/src --include=*.js | grep -vE '^\S+:\s*(\*|//)' ; then
  bad 'tekst "Wyślij zlecenie" w kodzie (poza komentarzem)'
fi

# Selektory tylko w selectors.js (klasy CSS są haszowane, ale i tak nie wolno ich używać).
if grep -rnE "querySelector(All)?\('[^']*\.[_a-zA-Z][^']*'" extension/src/page --include=*.js | grep -v adapters/selectors.js; then
  bad 'selektor klasy poza selectors.js'
fi

if [ "$fail" -eq 0 ]; then note "OK: wszystkie kontrole zaliczone"; else note "NIE: są błędy"; fi
exit "$fail"
