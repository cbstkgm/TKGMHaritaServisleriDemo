# owsLab — TKGM CBS Servisleri Uygulamalı Eğitim Portalı

owsLab, TKGM'nin `cbsservis.tkgm.gov.tr` üzerinden yayınladığı OGC servislerinin (WMS ve WFS) nasıl kullanılacağını,
**gerçek servise canlı istekler göndererek** öğreten bir ASP.NET Core 8 uygulamasıdır.

## Neler var?

- **10 derslik müfredat** — OWS temelleri, GetCapabilities, GetMap, GetFeatureInfo, stiller/SLD, DescribeFeatureType,
  GetFeature, CQL/OGC filtreleri, parsel sorgulama uygulaması ve kendi projede entegrasyon.
- **Laboratuvar** — düzenlenebilir istek adresi, parametre parametre "URL anatomisi", harita (tıklayınca GetFeatureInfo,
  çizince `INTERSECTS` filtresi), TKGM hata mesajlarını açıklayan yanıt çözümleyici ve isteği curl/Python/OWSLib/C#/Leaflet/
  OpenLayers/QGIS koduna çeviren kod sekmesi.
- **Otomatik denetlenen görevler** — doğru isteği gönderdiğinizde görev işaretlenir; ilerleme tarayıcıda saklanır.
- **Rehber** — TKGM'ye özgü kurallar (tek katman, 1000 kayıt sınırı, kapalı formatlar, `durum=3` …), CQL başvuru tablosu,
  hata/parametre/sütun sözlükleri.

Sitedeki hiçbir örnek uydurma veri kullanmaz; her yanıt TKGM'den olduğu gibi gelir.

## Çalıştırma

```bash
git clone https://github.com/erdemalpar/owsLab.git
cd owsLab
dotnet run
```

Ardından `http://localhost:5197` adresini açın.

## Yapılandırma

TKGM demo hesabı `appsettings.json` içindeki `TkgmOws` bölümündedir. Kendi hesabınızla çalışmak için bu değerleri
(veya `TkgmOws__KullaniciAdi`, `TkgmOws__Sifre` ortam değişkenlerini) değiştirin.

## Mimari

| Parça | Dosya |
|---|---|
| TKGM proxy'si (kimlik ekler, yanıtı değiştirmeden iletir, GetCapabilities'i önbelleğe alır) | `Controllers/OwsProxyController.cs` |
| Müfredat ve görev tanımları | `Models/Mufredat.cs` |
| Ders içerikleri | `Views/Ders/_*.cshtml` |
| URL ayrıştırma, hata çözümleme, GML/KML → GeoJSON, kod üretimi | `wwwroot/js/owslab-cekirdek.js` |
| Laboratuvar bileşeni | `wwwroot/js/owslab-laboratuvar.js` |
| Görev denetimi | `wwwroot/js/owslab-gorevler.js` |
| GitHub Pages proxy'si (Cloudflare Worker) | `proxy/cloudflare-worker.js` |
| Statik kopya üretimi ve yayın | `scripts/statik-yayin.sh`, `.github/workflows/pages.yml` |

Tarayıcı, Basic Authentication başlıklı istekleri CORS ön isteği nedeniyle doğrudan TKGM'ye gönderemez (TKGM `OPTIONS`
isteğine 401 döner). Bu yüzden kimliği ekleyen bir proxy gerekir: `dotnet run` ile çalışırken `OwsProxyController`,
GitHub Pages sürümünde `proxy/cloudflare-worker.js`.

## GitHub Pages

GitHub Pages yalnızca statik dosya sunduğu için site iki parçaya ayrılır:

| Parça | Nerede | Dosya |
|---|---|---|
| Sayfalar (HTML/CSS/JS) | GitHub Pages | `scripts/statik-yayin.sh` üretir, `.github/workflows/pages.yml` yayınlar |
| TKGM proxy'si | Cloudflare Workers (ücretsiz plan yeterli) | `proxy/cloudflare-worker.js`, `proxy/wrangler.toml` |

**1. Proxy'yi yayınlayın** (Cloudflare hesabı gerekir):

```bash
cd proxy
npx wrangler login
npx wrangler deploy
```

Komut `https://owslab-proxy.<hesabiniz>.workers.dev` gibi bir adres verir. `wrangler.toml` içindeki `IZINLI_KOKENLER`
Worker'ı yalnızca sizin sitenizden çağrılabilir yapar; farklı bir GitHub kullanıcı adı kullanıyorsanız güncelleyin.

**2. GitHub ayarları** (depo → Settings):

- *Secrets and variables → Actions → Variables*: `OWSLAB_PROXY_ADRESI` = Worker adresi
- *Pages → Source*: **GitHub Actions**

**3. Yayın:** `main` dalına her push'ta site `https://<kullanici>.github.io/<depo>/` adresine yeniden yayınlanır
(Actions sekmesinden elle de çalıştırılabilir).

Statik kopyayı yerelde üretmek için:

```bash
PROXY_ADRESI=https://owslab-proxy.hesabiniz.workers.dev YOL_TABANI=/owsLab scripts/statik-yayin.sh _site
```

İlerleme kaydı tarayıcının `localStorage`'ında tutulduğundan statik sürümde de aynen çalışır.

## Lisans

[MIT](LICENSE)
