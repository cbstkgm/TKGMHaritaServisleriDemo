# 🌍 owsLab - OGC Web Servisleri Laboratuvarı

**owsLab**, OGC (Open Geospatial Consortium) web servisleri ve CBS (Coğrafi Bilgi Sistemleri) teknolojilerini öğrenmek ve uygulamak için geliştirilmiş interaktif bir web uygulamasıdır.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknolojiler](#-teknolojiler)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [OGC Servisleri](#-ogc-servisleri)
- [Harita Araçları](#-harita-araçları)
- [Proje Yapısı](#-proje-yapısı)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)

## ✨ Özellikler

### 🗺️ OGC Web Servisleri Örnekleri

Proje, aşağıdaki OGC standartlarını içeren kapsamlı örnekler sunar:

- **WMS (Web Map Service)** - Harita görüntüleme servisi
- **WFS (Web Feature Service)** - Vektör verisi servisi
- **WCS (Web Coverage Service)** - Raster verisi servisi
- **WMTS (Web Map Tile Service)** - Döşeme harita servisi
- **WPS (Web Processing Service)** - Coğrafi işlem servisi
- **SOS (Sensor Observation Service)** - Sensör gözlem servisi
- **CSW (Catalogue Service for the Web)** - Metadata katalog servisi
- **GML (Geography Markup Language)** - Coğrafi veri formatı
- **KML (Keyhole Markup Language)** - Google Earth formatı
- **SLD (Styled Layer Descriptor)** - Harita stil tanımlama
- **Filter Encoding** - Veri sorgulama

### 🛠️ Gelişmiş Harita Araçları

- **Geometri Çizim Araçları**: Nokta, çizgi, poligon, daire çizimi
- **Geometri Düzenleme**: Sürükleme, yeniden boyutlandırma, silme
- **Geometri Bölme (Split)**: Poligonları bölme işlevi
- **Ölçüm Araçları**: Mesafe ve alan ölçümü
- **Geometri Kaydetme**: GeoJSON ve WKT formatlarında kaydetme
- **NetTopologySuite Entegrasyonu**: Gelişmiş geometri işlemleri

## 🚀 Teknolojiler

### Backend
- **ASP.NET Core 8.0** - Modern web framework
- **C#** - Programlama dili
- **NetTopologySuite 2.6.0** - Geometri işlemleri
- **NetTopologySuite.IO.GeoJSON 4.0.0** - GeoJSON desteği

### Frontend
- **Leaflet.js** - Açık kaynak harita kütüphanesi
- **Leaflet Draw** - Geometri çizim eklentisi
- **OpenStreetMap** - Temel harita katmanı
- **HTML5 / CSS3 / JavaScript** - Modern web standartları

## 📦 Kurulum

### Gereksinimler

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- Modern bir web tarayıcısı (Chrome, Firefox, Edge, Safari)

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone https://github.com/erdemalpar/owsLab.git
cd owsLab
```

2. **Bağımlılıkları yükleyin:**
```bash
dotnet restore
```

3. **Projeyi derleyin:**
```bash
dotnet build
```

4. **Uygulamayı çalıştırın:**
```bash
dotnet run
```

5. **Tarayıcınızda açın:**
```
https://localhost:5001
```

## 💻 Kullanım

### Ana Sayfa

Uygulama ana sayfasında OGC servislerine ait örnek sayfaları bulabilirsiniz.

### OGC Örnekleri

Her OGC servisi için ayrı bir örnek sayfa mevcuttur:

- `/OGC_Ornekler/wmsornek` - WMS Örneği
- `/OGC_Ornekler/wfsornek` - WFS Örneği
- `/OGC_Ornekler/wcsornek` - WCS Örneği
- `/OGC_Ornekler/wmtsornek` - WMTS Örneği
- Ve daha fazlası...

### Harita Araçları Kullanımı

1. **Çizim Araçları**: Sol üstteki araç çubuğundan geometri türünü seçin
2. **Düzenleme**: Çizilen geometrileri tıklayıp sürükleyerek taşıyın
3. **Bölme**: Poligonları seçip "Split" butonuna tıklayın
4. **Kaydetme**: Geometrileri GeoJSON veya WKT formatında kaydedin

## 🌐 OGC Servisleri

### WMS - Web Map Service
Harita görüntülerini sunmak için kullanılan OGC standardı. Raster formatında görüntü döndürür.

### WFS - Web Feature Service
Vektör verilerini (nokta, çizgi, poligon) sorgulamak ve düzenlemek için kullanılır.

### WCS - Web Coverage Service
Raster verilerini (elevation, sıcaklık haritaları) sunmak için kullanılır.

### WMTS - Web Map Tile Service
Önceden oluşturulmuş harita döşemelerini (tiles) hızlı bir şekilde sunmak için kullanılır.

## 🎯 Harita Araçları

### Toolbar API Endpoints

#### POST /Toolbar/Split
Poligonları yatay olarak iki parçaya böler.

**İstek:**
```json
{
  "type": "Feature",
  "geometry": { ... },
  "properties": { ... }
}
```

**Yanıt:**
```json
[
  { "type": "Feature", "geometry": { ... } },
  { "type": "Feature", "geometry": { ... } }
]
```

#### POST /Toolbar/SaveGeometry
Tüm geometri türlerini WKT ve GeoJSON formatında kaydeder.

**İstek:**
```json
{
  "type": "Feature",
  "geometry": { "type": "Polygon", "coordinates": [...] },
  "properties": { "name": "Alan1" }
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Polygon (Alan1) başarıyla kaydedildi.",
  "wktData": "POLYGON ((...))",
  "name": "Alan1",
  "type": "Polygon"
}
```

## 📁 Proje Yapısı

```
owsLab/
├── Controllers/           # MVC Controller sınıfları
│   ├── HomeController.cs
│   ├── OGC_OrneklerController.cs
│   └── ToolbarController.cs
├── Models/               # Veri modelleri
├── Views/                # Razor view dosyaları
│   ├── Home/
│   ├── OGC_Ornekler/    # OGC örnek sayfaları
│   └── Shared/          # Paylaşılan layout ve bileşenler
├── wwwroot/             # Statik dosyalar (CSS, JS, resimler)
├── Program.cs           # Uygulama giriş noktası
└── owsLab.csproj       # Proje dosyası
```

## 🧪 Geliştirme

### Debug Modu
```bash
dotnet run --environment Development
```

### Production Build
```bash
dotnet publish -c Release -o ./publish
```

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen şu adımları izleyin:

1. Bu repository'yi fork edin
2. Yeni bir özellik branch'i oluşturun (`git checkout -b yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik: Açıklama'`)
4. Branch'inizi push edin (`git push origin yeni-ozellik`)
5. Pull Request oluşturun

## 📝 Yapılacaklar

- [ ] Veritabanı entegrasyonu (PostgreSQL/PostGIS)
- [ ] Kullanıcı kimlik doğrulama sistemi
- [ ] Daha fazla OGC servisi örneği
- [ ] Gelişmiş geometri analiz araçları
- [ ] Export/Import işlevleri (Shapefile, GeoPackage)
- [ ] Unit testler
- [ ] API dokümantasyonu (Swagger)

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👤 Geliştirici

**Erdem Alpar**

- GitHub: [@erdemalpar](https://github.com/erdemalpar)
- GitLab: [@erdemalpar](https://gitlab.com/erdemalpar)

## 🙏 Teşekkürler

- [ASP.NET Core](https://dotnet.microsoft.com/apps/aspnet) - Web framework
- [NetTopologySuite](https://github.com/NetTopologySuite/NetTopologySuite) - Geometri işlemleri
- [Leaflet.js](https://leafletjs.com/) - Harita kütüphanesi
- [OpenStreetMap](https://www.openstreetmap.org/) - Harita verileri
- [OGC](https://www.ogc.org/) - Açık coğrafi standartlar

---

⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!
