#!/usr/bin/env bash
# owsLab'in GitHub Pages'e konacak statik kopyasını üretir.
#
# Uygulama yerelde çalıştırılır, tüm sayfalar HTML olarak indirilir ve wwwroot ile birlikte
# çıktı klasörüne yazılır. Canlı TKGM istekleri tarayıcıdan PROXY_ADRESI'ndeki proxy'ye (Türkiye'deki
# kurum sunucusunda çalışan bu uygulamanın /OwsProxy adresi) gider.
#
# Kullanım:  [PROXY_ADRESI=https://sunucu.kurum.gov.tr/OwsProxy] YOL_TABANI=/owsLab scripts/statik-yayin.sh [cikti]
set -euo pipefail

CIKTI="${1:-_site}"
YOL_TABANI="${YOL_TABANI:-/owsLab}"
PORT="${PORT:-5299}"
# Boş bırakılırsa site canlı istekler kapalı olarak üretilir (dersler ve rehber çalışır, laboratuvar istek gönderemez)
PROXY_ADRESI="${PROXY_ADRESI:-yok}"

KOK="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KOK"

dotnet build -c Release --nologo -v q

ASPNETCORE_ENVIRONMENT=Production \
YolTabani="$YOL_TABANI" \
TkgmOws__ProxyAdresi="$PROXY_ADRESI" \
    dotnet run -c Release --no-build --no-launch-profile --urls "http://127.0.0.1:$PORT" >/dev/null 2>&1 &
SUNUCU=$!
trap 'kill $SUNUCU 2>/dev/null || true' EXIT

ADRES="http://127.0.0.1:$PORT$YOL_TABANI"
for _ in $(seq 1 60); do
    curl -sf "$ADRES/" -o /dev/null && break
    sleep 1
done

rm -rf "$CIKTI"
mkdir -p "$CIKTI"
cp -R wwwroot/. "$CIKTI/"

indir() { # $1: site içi yol ("" = ana sayfa) → <yol>/index.html
    mkdir -p "$CIKTI/$1"
    curl -sf "$ADRES/$1" -o "$CIKTI/$1/index.html"
    echo "  ${YOL_TABANI}/$1"
}

echo "Sayfalar:"
indir ""
indir "Home/Laboratuvar"
indir "Home/Rehber"
DERSLER=$(grep -oE "$YOL_TABANI/ders/[a-z0-9-]+" "$CIKTI/index.html" | sed -e "s#.*/ders/##" | sort -u)
for ders in $DERSLER; do
    indir "ders/$ders"
done

# Bilinmeyen adresler ana sayfaya yönlenir
cat > "$CIKTI/404.html" <<HTML
<!DOCTYPE html><meta charset="utf-8"><title>Sayfa bulunamadı · owsLab</title>
<meta http-equiv="refresh" content="0; url=$YOL_TABANI/">
<p>Sayfa bulunamadı. <a href="$YOL_TABANI/">Ana sayfaya dönün</a>.</p>
HTML
touch "$CIKTI/.nojekyll"

echo "Statik site hazır: $CIKTI"
