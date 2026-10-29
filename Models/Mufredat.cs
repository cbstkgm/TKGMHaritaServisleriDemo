namespace owsLab.Models;

/// <summary>Bir dersteki, laboratuvarda yapılan istek denetlenerek otomatik tamamlanan görev.</summary>
public record Gorev(string Kimlik, string Metin);

public record Ders(
    string Slug,
    string Bolum,
    string Baslik,
    string Ozet,
    int DakikaSuresi,
    string Ikon,
    IReadOnlyList<Gorev> Gorevler);

/// <summary>
/// Eğitim müfredatı. Her dersin içeriği Views/Ders/_{Slug}.cshtml dosyasındadır;
/// görevlerin denetimi wwwroot/js/owslab-gorevler.js içinde aynı kimlikle tanımlanır.
/// </summary>
public static class Mufredat
{
    public static readonly IReadOnlyList<Ders> Dersler = new List<Ders>
    {
        new("ows-nedir", "Temeller", "OWS nedir, TKGM'ye ilk istek",
            "Bir OGC isteğinin anatomisi, demo hesabın kapsamı ve sunucunun hata mesajlarını okumak.",
            10, "fa-plug",
            new[]
            {
                new Gorev("ilk-hata", "Parametresiz bir istek gönderip TKGM'nin hata mesajını görün"),
                new Gorev("ilk-basari", "SERVICE, VERSION ve REQUEST ile başarılı bir istek gönderin"),
            }),

        new("getcapabilities", "Temeller", "GetCapabilities: servisin kimlik kartı",
            "Hangi katmanlar, stiller, koordinat sistemleri ve formatlar var? Hepsini servise sorarak öğrenin.",
            12, "fa-id-card",
            new[]
            {
                new Gorev("wms-cap", "WMS GetCapabilities belgesini alın"),
                new Gorev("wfs-cap", "WFS GetCapabilities belgesini alın ve filtre yeteneklerini inceleyin"),
            }),

        new("wms-getmap", "WMS — Harita görüntüsü", "GetMap: haritayı resim olarak almak",
            "BBOX, SRS/CRS, boyut ve format parametreleri; 1.1.1 ile 1.3.0 arasındaki eksen sırası tuzağı.",
            15, "fa-image",
            new[]
            {
                new Gorev("getmap-parsel", "TKGM:parseller katmanının PNG haritasını alın"),
                new Gorev("getmap-130", "Aynı haritayı VERSION=1.3.0 ve CRS ile, doğru eksen sırasıyla alın"),
                new Gorev("getmap-coklu", "LAYERS'a iki katman yazarak TKGM'nin tek katman kuralını görün"),
            }),

        new("wms-getfeatureinfo", "WMS — Harita görüntüsü", "GetFeatureInfo: haritaya tıklayıp bilgi almak",
            "Ekrandaki bir pikselin altındaki parselin özniteliklerini sorgulamak; X/Y'nin nereden geldiği.",
            12, "fa-hand-pointer",
            new[]
            {
                new Gorev("gfi-json", "Haritaya tıklayarak bir parselin bilgisini JSON olarak alın"),
                new Gorev("gfi-mahalle", "QUERY_LAYERS=TKGM:mahalleler ile mahalle bilgisini sorgulayın"),
            }),

        new("wms-stil", "WMS — Harita görüntüsü", "Stiller, lejant ve SLD",
            "Hazır stiller, GetLegendGraphic, GetStyles ile SLD okumak ve SLD_BODY ile kendi stilinizi göndermek.",
            15, "fa-palette",
            new[]
            {
                new Gorev("lejant", "Parseller katmanının lejantını alın"),
                new Gorev("hazir-stil", "STYLES ile farklı bir hazır stil kullanın"),
                new Gorev("sld-body", "SLD_BODY ile kendi renginizde bir harita çizdirin"),
                new Gorev("wms-cql", "WMS isteğine CQL_FILTER ekleyerek tek bir adayı çizdirin"),
            }),

        new("wfs-describefeaturetype", "WFS — Vektör veri", "DescribeFeatureType: tablonun şeması",
            "Bir katmanın sütunlarını ve veri tiplerini öğrenmek; filtre yazmadan önce yapılması gereken adım.",
            10, "fa-table-columns",
            new[]
            {
                new Gorev("dft-parsel", "TKGM:parseller katmanının şemasını alın"),
                new Gorev("dft-mahalle", "TKGM:mahalleler katmanının şemasını alın"),
            }),

        new("wfs-getfeature", "WFS — Vektör veri", "GetFeature: gerçek geometri ve öznitelik",
            "MAXFEATURES, PROPERTYNAME ve OUTPUTFORMAT; 1000 kayıt sınırı ve yetki dışı katmanların boş dönmesi.",
            15, "fa-draw-polygon",
            new[]
            {
                new Gorev("gf-propertyname", "PROPERTYNAME ile yalnızca birkaç sütun isteyin"),
                new Gorev("gf-kml", "Sonucu KML formatında alın"),
                new Gorev("gf-bos", "TKGM:iller katmanını sorgulayıp boş sonucu yorumlayın"),
            }),

        new("filtreleme", "WFS — Vektör veri", "CQL_FILTER ve OGC FILTER ile sorgulama",
            "Karşılaştırma, LIKE, mantıksal ve mekânsal filtreler; haritada çizdiğiniz alanla sorgulamak.",
            20, "fa-filter",
            new[]
            {
                new Gorev("cql-parsel", "983 ada 2 parselin güncel kaydını CQL_FILTER ile bulun"),
                new Gorev("cql-like", "ILIKE ile niteliğinde 'apartman' geçen parselleri bulun"),
                new Gorev("cql-mekansal", "Haritada bir alan çizip INTERSECTS ile sorgulayın"),
                new Gorev("ogc-filter", "Aynı sorguyu XML tabanlı FILTER parametresiyle yapın"),
            }),

        new("parsel-uygulamasi", "Uygulama", "Uygulama: parsel sorgulama ekranı",
            "Öğrendiklerinizi birleştirin: mahalle → ada → parsel akışını WMS ve WFS'i birlikte kullanarak kurun.",
            20, "fa-map-location-dot",
            new[]
            {
                new Gorev("uyg-mahalle", "Mahalle sınırını WFS ile getirin"),
                new Gorev("uyg-ada", "Bir adanın parsellerini listeleyin"),
                new Gorev("uyg-parsel", "Bir parseli seçip WMS'te vurgulayın"),
            }),

        new("entegrasyon", "Uygulama", "Kendi projenizde kullanmak",
            "Leaflet, OpenLayers, QGIS, Python, C# ve curl ile aynı isteği yapmak; kimlik bilgisini güvenle taşımak.",
            15, "fa-code",
            new[]
            {
                new Gorev("kod-kopyala", "Laboratuvardaki bir isteğin kodunu kopyalayın"),
            }),
    };

    public static Ders? Bul(string slug) =>
        Dersler.FirstOrDefault(d => string.Equals(d.Slug, slug, StringComparison.OrdinalIgnoreCase));

    public static int Sira(Ders ders) => Dersler.ToList().IndexOf(ders);

    public static int ToplamGorev => Dersler.Sum(d => d.Gorevler.Count);
}
