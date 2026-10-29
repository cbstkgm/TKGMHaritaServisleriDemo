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

Tarayıcı, Basic Authentication başlıklı istekleri CORS ön isteği nedeniyle doğrudan TKGM'ye gönderemez. Bu yüzden
uygulama bir sunucu bileşeni gerektirir; statik bir sayfa olarak (örneğin GitHub Pages'te) çalışmaz.

## Lisans

[MIT](LICENSE)
