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
| Statik kopya üretimi ve yayın | `scripts/statik-yayin.sh`, `.github/workflows/pages.yml` |

Tarayıcı, Basic Authentication başlıklı istekleri CORS ön isteği nedeniyle doğrudan TKGM'ye gönderemez (TKGM `OPTIONS`
isteğine 401 döner). Bu yüzden kimliği ekleyen bir proxy gerekir: `dotnet run` ile çalışırken `OwsProxyController`,
GitHub Pages sürümünde Türkiye'deki kurum sunucusuna kurulan aynı uygulamanın `/OwsProxy` adresi.

## Kurum sunucusuna kurulum

TKGM CBS Servisi **yalnızca Türkiye IP adreslerine** yanıt verir; yurt dışındaki bulut servisleri (Cloudflare, Vercel,
GitHub Actions …) TKGM'ye bağlanamaz. Bu yüzden canlı istekleri ileten uygulama Türkiye'deki bir sunucuda çalışmalıdır.

**Paketi hazırlama** (geliştirici bilgisayarında):

```bash
dotnet publish -c Release -o yayin/owsLab
```

Çıkan `yayin/owsLab` klasörü Windows ve Linux'ta aynen çalışır.

**Windows Server + IIS:**

1. Sunucuya [ASP.NET Core 8 Hosting Bundle](https://dotnet.microsoft.com/download/dotnet/8.0) kurun, ardından `iisreset`.
2. `owsLab` klasörünü sunucuya kopyalayın (ör. `C:\inetpub\owsLab`).
3. IIS Yöneticisi → yeni site (veya mevcut siteye *Uygulama ekle*), fiziksel yol bu klasör.
   Uygulama havuzunda *.NET CLR sürümü*: **Yönetilen kod yok**.
4. HTTPS bağlaması ekleyin (GitHub Pages HTTPS olduğu için proxy de HTTPS olmalıdır).

**Linux:**

```bash
sudo apt install aspnetcore-runtime-8.0
ASPNETCORE_URLS=http://127.0.0.1:5000 dotnet /opt/owsLab/owsLab.dll
```

Önüne HTTPS sonlandıran bir nginx/Apache koyun ve bir systemd hizmetiyle sürekli çalıştırın.

**Sunucuda gereken ağ izni:** sunucudan `cbsservis.tkgm.gov.tr:443` adresine giden HTTPS trafiği açık olmalıdır.

Kurulumdan sonra `https://<sunucu>/` portalın tamamıdır; GitHub Pages olmadan da kullanılabilir.
`https://<sunucu>/OwsProxy/wms?SERVICE=WMS&REQUEST=GetCapabilities` XML döndürüyorsa proxy çalışıyordur.

**GitHub Pages ile birlikte kullanmak için** GitHub'daki `OWSLAB_PROXY_ADRESI` değişkenine `https://<sunucu>/OwsProxy`
yazın. Proxy'yi hangi sitelerin çağırabileceği `appsettings.json` → `TkgmOws:IzinliKokenler` listesindedir
(varsayılan: `https://cbstkgm.github.io`).

> **Demo hesap sınırı:** `cbsdemouser` hesabının günlük istek kotası vardır; aşıldığında TKGM
> "günlük servis kullanım limitinizi aştınız" hatası döner. Herkese açık bir yayın için TKGM'den kuruma ait
> ayrı bir hesap alıp `TkgmOws:KullaniciAdi` / `TkgmOws:Sifre` değerlerini (veya `TkgmOws__KullaniciAdi`,
> `TkgmOws__Sifre` ortam değişkenlerini) değiştirin.

## GitHub Pages

GitHub Pages yalnızca statik dosya sunduğu için site iki parçaya ayrılır:

| Parça | Nerede | Dosya |
|---|---|---|
| Sayfalar (HTML/CSS/JS) | GitHub Pages | `scripts/statik-yayin.sh` üretir, `.github/workflows/pages.yml` yayınlar |
| TKGM proxy'si | Türkiye'deki kurum sunucusu (yukarıya bakın) | `Controllers/OwsProxyController.cs` |

**1. Proxy'yi kurun:** yukarıdaki "Kurum sunucusuna kurulum" bölümü.

**2. GitHub ayarları** (depo → Settings):

- *Secrets and variables → Actions → Variables*: `OWSLAB_PROXY_ADRESI` = `https://<sunucu>/OwsProxy`
- *Pages → Source*: **GitHub Actions**

**3. Yayın:** `main` dalına her push'ta site `https://<kullanici>.github.io/<depo>/` adresine yeniden yayınlanır
(Actions sekmesinden elle de çalıştırılabilir).

Statik kopyayı yerelde üretmek için:

```bash
PROXY_ADRESI=https://sunucu.kurum.gov.tr/OwsProxy YOL_TABANI=/owsLab scripts/statik-yayin.sh _site
```

İlerleme kaydı tarayıcının `localStorage`'ında tutulduğundan statik sürümde de aynen çalışır.

## Lisans

[MIT](LICENSE)
