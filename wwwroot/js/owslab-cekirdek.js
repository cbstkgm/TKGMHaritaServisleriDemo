// ============================================================================
// owsLab çekirdeği: TKGM CBS Servisi bilgileri, URL ayrıştırma, istek gönderme,
// hata çözümleme, GML/KML → GeoJSON dönüşümü, kod üretimi ve ilerleme kaydı.
//
// Buradaki servis davranışları (desteklenen formatlar, sürümler, sınırlar)
// cbsservis.tkgm.gov.tr üzerinde demo hesabıyla tek tek denenerek yazılmıştır.
// ============================================================================

const OwsLab = (() => {
    "use strict";

    // Sayfa düzeni (_Layout) tarafından yazılır. GitHub Pages sürümünde site bir alt dizinde (ör. /owsLab/) durur
    // ve istekler TKGM kimliğini ekleyen Türkiye'deki kurum sunucusunun /OwsProxy adresine gider.
    // proxy null ise (proxy'siz statik yayın) canlı istekler kapalıdır.
    const AYAR = Object.assign({ kok: "/", proxy: "/OwsProxy" }, window.OwsLabAyar);
    const canliAcik = Boolean(AYAR.proxy);

    /** Site köküne göre adres üretir: siteAdresi("data/x.gml") → "/owsLab/data/x.gml". */
    function siteAdresi(yol) {
        return AYAR.kok.replace(/\/$/, "") + "/" + yol.replace(/^\//, "");
    }

    /** Proxy üzerinden servis kökü: proxyKoku("wms") → "/OwsProxy/wms" veya "https://sunucu/OwsProxy/wms". */
    function proxyKoku(servis) {
        return `${AYAR.proxy}/${servis}`;
    }

    // --- 1. TKGM SERVİS BİLGİLERİ ------------------------------------------------

    const TKGM = {
        temelAdres: "https://cbsservis.tkgm.gov.tr/tkgm.ows",
        kullaniciAdi: "cbsdemouser",
        sifre: "q3b8f+r*",
        // Demo hesabın veri gördüğü alan: Amasya / Merkez / Hızırpaşa mahallesi
        merkez: [40.6528, 35.8128],
        baslangicZoom: 16,
        ornekBbox: "35.805,40.648,35.820,40.660",
        mahalleRef: 126978,
        kayitSiniri: 1000
    };

    /** Servislerin GetCapabilities belgelerinde ilan edilen katmanlar ve demo hesapta gerçekte ne döndükleri. */
    const KATMANLAR = {
        "TKGM:parseller": { ad: "Parseller", wms: true, wfs: true, veriVar: true, not: "Hızırpaşa ve çevresindeki mahallelerin parselleri; mahalleye göre tapumahalleref ile süzün. Eski (durum=2) ve güncel (durum=3) kayıtlar birlikte gelir." },
        "TKGM:mahalleler": { ad: "Mahalleler", wms: true, wfs: true, veriVar: true, not: "Demo hesap yalnızca Hızırpaşa mahallesini görür." },
        "TKGM:ilceler": { ad: "İlçeler", wms: true, wfs: true, veriVar: false, not: "Demo hesabın yetkisi dışında: boş sonuç döner." },
        "TKGM:iller": { ad: "İller", wms: true, wfs: true, veriVar: false, not: "Demo hesabın yetkisi dışında: boş sonuç döner." },
        "TKGM:MEGSIS": { ad: "MEGSİS (birleşik)", wms: true, wfs: false, veriVar: false, not: "Yalnızca WMS'te var; demo hesapta boş görüntü döner." }
    };

    const WMS_STILLERI = ["parseller", "TKGM:parseller_style_v2", "hazineparsellerstyle", "tematik_parsel_entegrasyon_durum", "mahalleler", "ilceler", "iller"];

    /** Parametre adı → açıklama ve öneri değerleri. Açıklamalar laboratuvardaki "URL anatomisi" tablosunda görünür. */
    const PARAMETRELER = {
        SERVICE: { aciklama: "Hangi OGC servisiyle konuşulduğu. TKGM'de yalnızca WMS ve WFS vardır.", oneriler: ["WMS", "WFS"] },
        VERSION: { aciklama: "Protokol sürümü. WMS: 1.1.1 veya 1.3.0. WFS: 1.0.0 (1.1.0 kabul edilir, 2.0.0 hata verir).", oneriler: ["1.1.1", "1.3.0", "1.0.0", "1.1.0"] },
        REQUEST: { aciklama: "Servisten istenen işlem.", oneriler: ["GetCapabilities", "GetMap", "GetFeatureInfo", "GetLegendGraphic", "DescribeLayer", "GetStyles", "DescribeFeatureType", "GetFeature"] },
        LAYERS: { aciklama: "Çizilecek katman. TKGM ağ geçidi tek katman kabul eder; virgülle iki katman 'Katman bulunamadı' hatası verir.", oneriler: Object.keys(KATMANLAR) },
        LAYER: { aciklama: "GetLegendGraphic için lejantı istenen katman.", oneriler: Object.keys(KATMANLAR) },
        STYLES: { aciklama: "Katmanın hangi hazır stille çizileceği. Boş bırakılırsa varsayılan stil kullanılır.", oneriler: ["", ...WMS_STILLERI] },
        STYLE: { aciklama: "GetLegendGraphic için stil adı.", oneriler: WMS_STILLERI },
        SRS: { aciklama: "Koordinat sistemi (WMS 1.1.1). EPSG:4326 = enlem/boylam (WGS84), EPSG:3857 = Web Mercator.", oneriler: ["EPSG:4326", "EPSG:3857"] },
        CRS: { aciklama: "Koordinat sistemi (WMS 1.3.0). Dikkat: 1.3.0'da EPSG:4326 için BBOX sırası enlem,boylam olur.", oneriler: ["EPSG:4326", "EPSG:3857"] },
        BBOX: { aciklama: "İstenen alanın sınırları: minX,minY,maxX,maxY. EPSG:4326 + 1.1.1'de boylam,enlem sırasıyla yazılır.", oneriler: [] },
        WIDTH: { aciklama: "Üretilecek görüntünün piksel genişliği.", oneriler: ["256", "512", "800"] },
        HEIGHT: { aciklama: "Üretilecek görüntünün piksel yüksekliği.", oneriler: ["256", "512", "600"] },
        FORMAT: { aciklama: "Yanıt formatı. GetMap için image/png, image/jpeg, application/pdf vb.", oneriler: ["image/png", "image/jpeg", "image/png8", "application/pdf", "image/svg+xml"] },
        TRANSPARENT: { aciklama: "true ise boş alanlar saydam olur; harita üzerine bindirmek için gereklidir.", oneriler: ["true", "false"] },
        BGCOLOR: { aciklama: "Saydam olmayan görüntüde arka plan rengi (0xRRGGBB).", oneriler: ["0xFFFFFF"] },
        QUERY_LAYERS: { aciklama: "GetFeatureInfo'da bilgisi sorgulanacak katman.", oneriler: Object.keys(KATMANLAR) },
        INFO_FORMAT: { aciklama: "GetFeatureInfo yanıt formatı. TKGM'de application/json ve text/html çalışır; text/plain ve GML hata verir.", oneriler: ["application/json", "text/html"] },
        X: { aciklama: "Tıklanan pikselin soldan uzaklığı (WMS 1.1.1). 1.3.0'da adı I'dır.", oneriler: [] },
        Y: { aciklama: "Tıklanan pikselin üstten uzaklığı (WMS 1.1.1). 1.3.0'da adı J'dir.", oneriler: [] },
        I: { aciklama: "Tıklanan pikselin soldan uzaklığı (WMS 1.3.0).", oneriler: [] },
        J: { aciklama: "Tıklanan pikselin üstten uzaklığı (WMS 1.3.0).", oneriler: [] },
        FEATURE_COUNT: { aciklama: "Tıklanan noktada en fazla kaç nesne döndürüleceği.", oneriler: ["1", "5"] },
        SLD_BODY: { aciklama: "İstekle birlikte gönderilen, URL kodlanmış SLD (stil) belgesi. Sunucudaki stili ezmeden kendi stilinizi kullanırsınız.", oneriler: [] },
        CQL_FILTER: { aciklama: "GeoServer'ın okunabilir filtre dili. WMS'te çizilecek, WFS'te döndürülecek nesneleri süzer.", oneriler: ["durum=3", "adano='983'", "tapucinsaciklama ILIKE '%apartman%'"] },
        FILTER: { aciklama: "OGC Filter Encoding standardındaki XML filtre. CQL_FILTER ile aynı işi standart biçimde yapar.", oneriler: [] },
        TYPENAME: { aciklama: "WFS'te verisi istenen katman (feature type).", oneriler: Object.keys(KATMANLAR).filter(k => KATMANLAR[k].wfs) },
        MAXFEATURES: { aciklama: "Döndürülecek en fazla kayıt (WFS 1.0/1.1). TKGM yine de tek istekte en çok 1000 kayıt verir.", oneriler: ["5", "50", "1000"] },
        PROPERTYNAME: { aciklama: "Yalnızca istenen sütunlar. Geometri isteniyorsa 'geom' da yazılmalıdır.", oneriler: ["adano,parselno,geom", "adano,parselno,tapualan,tapucinsaciklama,geom"] },
        OUTPUTFORMAT: { aciklama: "WFS yanıt formatı. TKGM'de GML2, GML3 ve KML açık; JSON, CSV ve SHAPE-ZIP kapalıdır.", oneriler: ["GML2", "GML3", "KML"] },
        SRSNAME: { aciklama: "WFS'in geometriyi hangi koordinat sisteminde döndüreceği.", oneriler: ["EPSG:4326"] },
        SORTBY: { aciklama: "Sıralama (WFS 1.1.0): 'sütun A' artan, 'sütun D' azalan.", oneriler: ["tapualan D"] },
        TYPENAMES: { aciklama: "WFS 2.0'da TYPENAME'in yeni adı. TKGM 2.0'ı desteklemediği için çalışmaz.", oneriler: [] },
        COUNT: { aciklama: "WFS 2.0'da MAXFEATURES'ın yeni adı. TKGM 2.0'ı desteklemediği için çalışmaz.", oneriler: [] },
        EXCEPTIONS: { aciklama: "Hata durumunda yanıt biçimi.", oneriler: ["application/vnd.ogc.se_xml"] }
    };

    /** DescribeFeatureType'tan gelen sütunların Türkçe açıklamaları. */
    const SUTUNLAR = {
        tapukimlikno: "Kaydın TKGM'deki tekil kimlik numarası",
        ad: "İdari birim adı",
        uavt: "Ulusal Adres Veri Tabanı (UAVT) kodu",
        ilref: "Bağlı olduğu ilin kimlik numarası",
        ilceref: "Bağlı olduğu ilçenin kimlik numarası (Amasya Merkez = 40)",
        tapumahalleref: "Bağlı olduğu tapu mahallesinin kimlik numarası (Hızırpaşa = 126978)",
        tapumahallead: "Tapu kaydındaki mahalle adı",
        kadastromahallead: "Kadastrodaki mahalle adı",
        adano: "Ada numarası (metin tipindedir; filtrede tırnak içinde yazın: adano='983')",
        parselno: "Parsel numarası (metin tipindedir; '42/YO' gibi değerler alabilir)",
        tapualan: "Tapu kütüğündeki yüzölçümü (m²)",
        kadastroalan: "Geometriden hesaplanan kadastro alanı (m²)",
        tapucinsaciklama: "Taşınmazın tapudaki cinsi (ör. BETONARME APARTMAN VE ARSASI)",
        tapucinsid: "Tapu cinsi kod numarası",
        tapuzeminref: "Tapu zemin (taşınmaz) kayıt numarası",
        durum: "Kayıt durumu kodu. Bu veri setinde güncel kayıtlar 3, önceki sürümler 2 değerini taşır",
        onaydurum: "Onay durumu kodu",
        onaytarih: "Onay tarihi",
        tip: "Kayıt tipi kodu",
        belirtmetip: "Belirtme tipi kodu",
        geom: "Geometri sütunu (poligon/nokta koordinatları)",
        sistemkayittarihi: "Kaydın sisteme ilk girildiği tarih",
        sistemguncellemetarihi: "Kaydın son güncellendiği tarih",
        hazineparseldurum: "Hazine parseli durum kodu (hazineparsellerstyle bu sütuna göre renklendirir)",
        orjinalgeomwkt: "Geometrinin kaynak koordinat sistemindeki WKT metni",
        orjinalgeomkoordinatsistem: "Kaynak geometrinin koordinat sistemi kodu",
        dom: "Dilim orta meridyeni (ör. 36)",
        yanilmasiniri: "Alan hesabındaki izin verilen yanılma sınırı",
        kmdurum: "Kadastro müdürlüğü durum kodu",
        vuvgdbid: "Kaynak veritabanı kayıt numarası"
    };

    /** TKGM'nin "Bilinen Hata içeriği" metinleri ve genel hata durumları için öğretici açıklamalar. */
    const BILINEN_HATALAR = [
        {
            desen: /parametresiz/i,
            baslik: "Servise parametre gönderilmedi",
            aciklama: "Her OGC isteği en az SERVICE, VERSION ve REQUEST parametrelerini taşımalıdır. Yalnızca servis adresini çağırmak bir şey istemek değildir.",
            cozum: "Adresin sonuna ?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities ekleyin."
        },
        {
            desen: /katman bulunamad/i,
            baslik: "Katman bulunamadı",
            aciklama: "LAYERS/QUERY_LAYERS/TYPENAME içindeki ad TKGM'de yok ya da birden fazla katman virgülle yazıldı. TKGM ağ geçidi tek istekte tek katman kabul eder.",
            cozum: "Katman adını GetCapabilities'teki gibi yazın (ör. TKGM:parseller). Birden fazla katman gerekiyorsa her biri için ayrı istek gönderin."
        }
    ];

    // --- 2. URL İŞLEMLERİ -----------------------------------------------------------

    /** OGC değerlerini okunur bırakarak URL kodlar (':' ',' '/' ve boşluk dışı güvenli karakterler açık kalır). */
    function degerKodla(deger) {
        return encodeURIComponent(deger)
            .replace(/%3A/gi, ":")
            .replace(/%2C/gi, ",")
            .replace(/%2F/gi, "/");
    }

    function degerCoz(deger) {
        try {
            return decodeURIComponent(deger.replace(/\+/g, "%20"));
        } catch {
            return deger;
        }
    }

    /**
     * TKGM adresini parçalar. Parametre sırası ve yazımı korunur.
     * Dönen nesne: { servis: "wms"|"wfs"|null, temel, parametreler: [[ad, deger], ...] }
     */
    function istekAyristir(adres) {
        const metin = (adres || "").trim();
        const soruIndeksi = metin.indexOf("?");
        const temel = soruIndeksi >= 0 ? metin.substring(0, soruIndeksi) : metin;
        const sorgu = soruIndeksi >= 0 ? metin.substring(soruIndeksi + 1) : "";
        const servisEslesme = temel.match(/tkgm\.ows\/(wms|wfs)\/?$/i);

        const parametreler = sorgu
            .split("&")
            .filter(p => p.length > 0)
            .map(p => {
                const esit = p.indexOf("=");
                return esit >= 0
                    ? [degerCoz(p.substring(0, esit)), degerCoz(p.substring(esit + 1))]
                    : [degerCoz(p), ""];
            });

        return { servis: servisEslesme ? servisEslesme[1].toLowerCase() : null, temel, parametreler };
    }

    /**
     * Parametrelerden TKGM adresi üretir. okunur=true ise yalnızca adresi bozan karakterler
     * (% & # +) kodlanır; laboratuvar kutusunda insanın okuyabileceği hali göstermek için kullanılır.
     */
    function istekOlustur(servis, parametreler, okunur = false) {
        const kodla = okunur
            ? d => String(d).replace(/[%&#+\n]/g, c => encodeURIComponent(c))
            : degerKodla;
        const sorgu = parametreler
            .filter(([ad]) => ad && ad.trim().length > 0)
            .map(([ad, deger]) => `${ad}=${kodla(deger ?? "")}`)
            .join("&");
        return `${TKGM.temelAdres}/${servis}?${sorgu}`;
    }

    /** Büyük/küçük harf duyarsız parametre okuma. */
    function parametreAl(parametreler, ad) {
        const bulunan = parametreler.find(([a]) => a.toUpperCase() === ad.toUpperCase());
        return bulunan ? bulunan[1] : null;
    }

    /** Parametreleri büyük harfli anahtarlarla düz nesneye çevirir (görev denetimlerinde kullanılır). */
    function parametreSozlugu(parametreler) {
        const sozluk = {};
        parametreler.forEach(([ad, deger]) => { sozluk[ad.toUpperCase()] = deger; });
        return sozluk;
    }

    /** TKGM adresini bu uygulamanın proxy adresine çevirir. TKGM dışı adresler reddedilir. */
    function proxyAdresi(tkgmAdresi) {
        const ayrisan = istekAyristir(tkgmAdresi);
        if (!ayrisan.servis) {
            return null;
        }
        const soruIndeksi = tkgmAdresi.indexOf("?");
        const sorgu = soruIndeksi >= 0 ? tkgmAdresi.substring(soruIndeksi) : "";
        return proxyKoku(ayrisan.servis) + sorgu;
    }

    // --- 3. İSTEK GÖNDERME VE YANIT SINIFLANDIRMA -----------------------------------

    async function istekGonder(tkgmAdresi) {
        // Okunur biçimde yazılmış adresler de (# boşluk < > içeren) doğru kodlanarak gönderilir
        const ayrisan = istekAyristir(tkgmAdresi);
        const proxy = ayrisan.servis ? proxyAdresi(istekOlustur(ayrisan.servis, ayrisan.parametreler)) : null;
        const sonuc = {
            adres: tkgmAdresi,
            proxyAdres: proxy,
            servis: ayrisan.servis,
            parametreler: ayrisan.parametreler,
            p: parametreSozlugu(ayrisan.parametreler),
            durum: 0,
            icerikTipi: "",
            sureMs: 0,
            boyut: 0,
            onbellek: false,
            tur: "bos",
            metin: null,
            blobAdres: null,
            xml: null,
            json: null,
            geojson: null,
            hata: null
        };

        if (ayrisan.servis && !canliAcik) {
            sonuc.hata = {
                baslik: "Bu yayında canlı istek kapalı",
                aciklama: "Bu kopya proxy'siz yayınlandı. TKGM, kimlik isteyen servisine başka bir siteden tarayıcıyla erişime izin vermediği için istek gönderilemiyor.",
                cozum: "\"TKGM'de aç\" düğmesiyle isteği yeni sekmede açıp demo hesapla (cbsdemouser) giriş yapın; ya da Kopyala ile alıp QGIS, curl, Python gibi araçlarda çalıştırın.",
                ham: ""
            };
            return sonuc;
        }

        if (!proxy) {
            sonuc.hata = {
                baslik: "Geçersiz servis adresi",
                aciklama: "Adres https://cbsservis.tkgm.gov.tr/tkgm.ows/wms veya .../wfs ile başlamalıdır. TKGM bu iki servis dışında OGC servisi yayınlamaz (WMTS, WCS, CSW, WPS adresleri 404 döner).",
                cozum: "Adresi .../tkgm.ows/wms? veya .../tkgm.ows/wfs? ile başlatın.",
                ham: ""
            };
            return sonuc;
        }

        const baslangic = performance.now();
        let yanit;
        try {
            yanit = await fetch(proxy);
        } catch (hata) {
            sonuc.hata = { baslik: "Bağlantı hatası", aciklama: hata.message, cozum: "İnternet bağlantınızı ve uygulamanın çalıştığını kontrol edin.", ham: "" };
            return sonuc;
        }

        const govde = await yanit.blob();
        sonuc.sureMs = parseInt(yanit.headers.get("X-Owslab-Sure-Ms") || "0", 10) || Math.round(performance.now() - baslangic);
        sonuc.onbellek = yanit.headers.get("X-Owslab-Onbellek") === "evet";
        sonuc.durum = yanit.status;
        sonuc.icerikTipi = (yanit.headers.get("content-type") || "").toLowerCase();
        sonuc.boyut = govde.size;

        const imza = new Uint8Array(await govde.slice(0, 8).arrayBuffer());
        const resimMi = (imza[0] === 0x89 && imza[1] === 0x50) || (imza[0] === 0xff && imza[1] === 0xd8) || (imza[0] === 0x47 && imza[1] === 0x49);
        const pdfMi = imza[0] === 0x25 && imza[1] === 0x50 && imza[2] === 0x44 && imza[3] === 0x46;

        if (resimMi) {
            sonuc.tur = "resim";
            sonuc.blobAdres = URL.createObjectURL(govde);
        } else if (pdfMi) {
            sonuc.tur = "pdf";
            sonuc.blobAdres = URL.createObjectURL(govde);
        } else {
            sonuc.metin = await govde.text();
            const kirpik = sonuc.metin.trimStart();
            if (kirpik.startsWith("{") || kirpik.startsWith("[")) {
                sonuc.tur = "json";
                try { sonuc.json = JSON.parse(sonuc.metin); } catch { sonuc.tur = "metin"; }
            } else if (kirpik.startsWith("<?xml") || /^<[a-zA-Z_:]/.test(kirpik) && !/^<html/i.test(kirpik)) {
                sonuc.tur = "xml";
                sonuc.xml = new DOMParser().parseFromString(sonuc.metin, "application/xml");
                if (sonuc.xml.getElementsByTagName("parsererror").length > 0) {
                    sonuc.xml = null;
                    sonuc.tur = "metin";
                }
            } else if (/^<(!doctype|html)/i.test(kirpik)) {
                sonuc.tur = "html";
            } else {
                sonuc.tur = "metin";
            }
        }

        sonuc.hata = hataCozumle(sonuc);
        if (!sonuc.hata) {
            if (sonuc.xml && (sonuc.xml.documentElement.localName === "FeatureCollection")) {
                sonuc.geojson = gmlGeoJson(sonuc.xml);
            } else if (sonuc.xml && sonuc.xml.documentElement.localName === "kml") {
                sonuc.geojson = kmlGeoJson(sonuc.xml);
            } else if (sonuc.json && sonuc.json.type === "FeatureCollection") {
                sonuc.geojson = sonuc.json;
            }
        }
        return sonuc;
    }

    /** Yanıt bir OGC/TKGM hatasıysa öğretici bir açıklama döndürür, değilse null. */
    function hataCozumle(sonuc) {
        const metin = sonuc.metin || "";
        const p = sonuc.p;
        const hataBelgesiMi = /ExceptionReport|ServiceException/i.test(metin.substring(0, 2000));
        if (!hataBelgesiMi && sonuc.durum < 400) {
            return null;
        }

        const exceptionMetni = (metin.match(/<(?:ows:)?ExceptionText>([\s\S]*?)<\/(?:ows:)?ExceptionText>/i)
            || metin.match(/<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/i)
            || [null, metin])[1] || "";
        const ham = metinCoz(exceptionMetni).trim();
        const bilinen = (ham.match(/Bilinen Hata içeriği:\s*([^\n\r]*)/i) || [])[1];
        const hataKodu = (ham.match(/Hata Link:\s*(\{[^}]+\})/i) || [])[1];

        // WFS 2.0 isteğinde TKGM "Katman bulunamadı" der (TYPENAMES'i tanımaz); asıl neden sürümdür.
        const surumHatasi = sonuc.servis === "wfs" && (p.VERSION || "").startsWith("2");
        const eslesen = surumHatasi ? null : BILINEN_HATALAR.find(h => h.desen.test(ham));
        if (eslesen) {
            return { ...eslesen, tkgmMesaji: bilinen || null, hataKodu, ham };
        }

        // TKGM yalnızca "Sistemde Hata oluştu" dediğinde, isteğe bakarak olası nedeni söyleriz.
        const ipucu = genelHataIpucu(sonuc.servis, p);
        return {
            baslik: bilinen ? bilinen : "Sunucu isteği işleyemedi",
            aciklama: ipucu ? ipucu.aciklama : "TKGM ayrıntı vermeden 'Sistemde Hata oluştu' yanıtı döndürdü. Genellikle desteklenmeyen bir parametre değeri ya da hatalı yazılmış bir filtre bu sonuca yol açar.",
            cozum: ipucu ? ipucu.cozum : "Parametreleri tek tek kaldırarak hangisinin hataya yol açtığını bulun. CQL_FILTER'daki tırnakları ve sütun adlarını DescribeFeatureType ile karşılaştırın.",
            tkgmMesaji: bilinen || null,
            hataKodu,
            ham
        };
    }

    function genelHataIpucu(servis, p) {
        const request = (p.REQUEST || "").toLowerCase();
        const cikti = (p.OUTPUTFORMAT || "").toLowerCase();
        if (servis === "wfs" && /json|csv|shape/.test(cikti)) {
            return { aciklama: `WFS GetCapabilities belgesi ${p.OUTPUTFORMAT} formatını ilan etse de TKGM ağ geçidi bu formatı demo hesaba kapatmıştır.`, cozum: "OUTPUTFORMAT=GML2, GML3 veya KML kullanın. GeoJSON gerekiyorsa GML'i istemci tarafında dönüştürün (bu laboratuvar da öyle yapıyor)." };
        }
        if (servis === "wfs" && (p.VERSION || "").startsWith("2")) {
            return { aciklama: "TKGM WFS 2.0.0 sürümünü desteklemez. Capabilities belgesi 1.0.0 olarak döner.", cozum: "VERSION=1.0.0 kullanın; TYPENAMES yerine TYPENAME, COUNT yerine MAXFEATURES yazın." };
        }
        if (servis === "wfs" && p.FEATUREID) {
            return { aciklama: "FEATUREID parametresi TKGM ağ geçidinde desteklenmiyor.", cozum: "Aynı kaydı CQL_FILTER ile, örneğin tapukimlikno veya adano/parselno üzerinden bulun." };
        }
        if (request === "getfeatureinfo" && p.INFO_FORMAT && !/json|html/i.test(p.INFO_FORMAT)) {
            return { aciklama: `INFO_FORMAT=${p.INFO_FORMAT} TKGM'de kapalı.`, cozum: "INFO_FORMAT=application/json veya text/html kullanın." };
        }
        if (p.CQL_FILTER) {
            return { aciklama: "Büyük olasılıkla CQL_FILTER ifadesi çözümlenemedi.", cozum: "Metin değerleri tek tırnakla yazın (adano='983'), sütun adlarını DescribeFeatureType çıktısıyla karşılaştırın, % işaretinin URL'de %25 olarak kodlandığından emin olun." };
        }
        return null;
    }

    function metinCoz(metin) {
        const alan = document.createElement("textarea");
        alan.innerHTML = metin;
        return alan.value;
    }

    // --- 4. GML / KML → GeoJSON -----------------------------------------------------

    const GEOMETRI_ADLARI = new Set(["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "MultiSurface", "MultiCurve", "Surface", "Curve", "LinearRing", "Box", "Envelope"]);

    function gmlGeoJson(belge) {
        const ogeler = [];
        Array.from(belge.getElementsByTagNameNS("*", "featureMember")).forEach(uye => {
            if (uye.firstElementChild) ogeler.push(uye.firstElementChild);
        });
        Array.from(belge.getElementsByTagNameNS("*", "featureMembers")).forEach(uyeler => {
            Array.from(uyeler.children).forEach(c => ogeler.push(c));
        });

        const features = ogeler.map(oge => {
            const ozellikler = {};
            let geometri = null;
            Array.from(oge.children).forEach(alan => {
                const ic = alan.firstElementChild;
                if (ic && GEOMETRI_ADLARI.has(ic.localName)) {
                    geometri = gmlGeometri(ic);
                } else if (alan.localName !== "boundedBy") {
                    ozellikler[alan.localName] = alan.textContent;
                }
            });
            const kimlik = oge.getAttribute("fid") || oge.getAttribute("gml:id") || oge.getAttributeNS("http://www.opengis.net/gml", "id");
            return { type: "Feature", id: kimlik, properties: ozellikler, geometry: geometri };
        });

        return { type: "FeatureCollection", features };
    }

    function gmlGeometri(el) {
        const cocuk = ad => Array.from(el.children).filter(c => c.localName === ad);
        switch (el.localName) {
            case "Point":
                return { type: "Point", coordinates: gmlKoordinatlar(el)[0] };
            case "LineString":
            case "Curve":
                return { type: "LineString", coordinates: gmlKoordinatlar(el) };
            case "Polygon":
            case "Surface": {
                const halkalar = [];
                ["outerBoundaryIs", "exterior", "innerBoundaryIs", "interior"].forEach(ad => {
                    cocuk(ad).forEach(sinir => {
                        Array.from(sinir.getElementsByTagNameNS("*", "LinearRing")).forEach(h => halkalar.push(gmlKoordinatlar(h)));
                    });
                });
                return { type: "Polygon", coordinates: halkalar };
            }
            case "MultiPolygon":
            case "MultiSurface": {
                const poligonlar = Array.from(el.getElementsByTagNameNS("*", "Polygon")).map(p => gmlGeometri(p).coordinates);
                return { type: "MultiPolygon", coordinates: poligonlar };
            }
            case "MultiLineString":
            case "MultiCurve": {
                const cizgiler = Array.from(el.getElementsByTagNameNS("*", "LineString")).map(c => gmlKoordinatlar(c));
                return { type: "MultiLineString", coordinates: cizgiler };
            }
            case "MultiPoint": {
                const noktalar = Array.from(el.getElementsByTagNameNS("*", "Point")).map(n => gmlKoordinatlar(n)[0]);
                return { type: "MultiPoint", coordinates: noktalar };
            }
            default:
                return null;
        }
    }

    /** gml:coordinates (GML2), gml:posList ve gml:pos (GML3) okur. TKGM her durumda boylam,enlem sırası kullanır. */
    function gmlKoordinatlar(el) {
        const coordinates = el.getElementsByTagNameNS("*", "coordinates")[0];
        if (coordinates) {
            const cs = coordinates.getAttribute("cs") || ",";
            const ts = coordinates.getAttribute("ts") || " ";
            return coordinates.textContent.trim().split(ts === " " ? /\s+/ : ts).map(cift => cift.split(cs).map(Number));
        }
        const posList = el.getElementsByTagNameNS("*", "posList")[0];
        if (posList) {
            const boyut = parseInt(posList.getAttribute("srsDimension") || el.getAttribute("srsDimension") || "2", 10);
            const sayilar = posList.textContent.trim().split(/\s+/).map(Number);
            const sonuc = [];
            for (let i = 0; i < sayilar.length; i += boyut) sonuc.push([sayilar[i], sayilar[i + 1]]);
            return sonuc;
        }
        return Array.from(el.getElementsByTagNameNS("*", "pos")).map(pos => pos.textContent.trim().split(/\s+/).slice(0, 2).map(Number));
    }

    function kmlGeoJson(belge) {
        const features = Array.from(belge.getElementsByTagNameNS("*", "Placemark")).map(pm => {
            const ozellikler = {};
            Array.from(pm.getElementsByTagNameNS("*", "SimpleData")).forEach(sd => { ozellikler[sd.getAttribute("name")] = sd.textContent; });
            Array.from(pm.getElementsByTagNameNS("*", "Data")).forEach(d => {
                const v = d.getElementsByTagNameNS("*", "value")[0];
                ozellikler[d.getAttribute("name")] = v ? v.textContent : "";
            });
            const kmlKoordinat = el => el.textContent.trim().split(/\s+/).map(c => c.split(",").slice(0, 2).map(Number));
            const poligonlar = Array.from(pm.getElementsByTagNameNS("*", "Polygon")).map(poly => {
                return Array.from(poly.getElementsByTagNameNS("*", "coordinates")).map(kmlKoordinat);
            });
            let geometri = null;
            if (poligonlar.length === 1) geometri = { type: "Polygon", coordinates: poligonlar[0] };
            else if (poligonlar.length > 1) geometri = { type: "MultiPolygon", coordinates: poligonlar };
            else {
                const nokta = pm.getElementsByTagNameNS("*", "Point")[0];
                if (nokta) geometri = { type: "Point", coordinates: kmlKoordinat(nokta.getElementsByTagNameNS("*", "coordinates")[0])[0] };
            }
            return { type: "Feature", id: pm.getAttribute("id"), properties: ozellikler, geometry: geometri };
        });
        return { type: "FeatureCollection", features };
    }

    // --- 5. XML BİÇİMLENDİRME VE VURGULAMA ------------------------------------------

    const GOSTERIM_SINIRI = 120000;

    function htmlKacis(metin) {
        return String(metin ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /** Tek satırlık XML'i girintili hale getirir. Çok uzun belgelerde ilk bölümü gösterir. */
    function xmlGirintile(xml) {
        let kesildi = false;
        let metin = xml;
        if (metin.length > GOSTERIM_SINIRI) {
            metin = metin.substring(0, GOSTERIM_SINIRI);
            kesildi = true;
        }
        const parcalar = metin.replace(/>\s*</g, ">\n<").split("\n");
        let girinti = 0;
        const satirlar = parcalar.map(satir => {
            const s = satir.trim();
            if (/^<\//.test(s)) girinti = Math.max(girinti - 1, 0);
            const sonuc = "  ".repeat(girinti) + s;
            if (/^<[^!?/][^>]*[^/]>$/.test(s) && !/^<[^>]+>.*<\/[^>]+>$/.test(s)) girinti++;
            else if (/^<[^!?/][^>]*>[^<]*$/.test(s) && !/\/>$/.test(s)) girinti++;
            return sonuc;
        });
        return { metin: satirlar.join("\n"), kesildi };
    }

    function xmlVurgula(metin) {
        return htmlKacis(metin)
            .replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="xv-etiket">$2</span>')
            .replace(/([\w:.-]+)=(&quot;[^&]*?&quot;)/g, '<span class="xv-nitelik">$1</span>=<span class="xv-deger">$2</span>');
    }

    // --- 6. KOD ÜRETİCİ -------------------------------------------------------------

    function kodUret(tkgmAdresi, dil) {
        const ayrisan = istekAyristir(tkgmAdresi);
        const p = parametreSozlugu(ayrisan.parametreler);
        const servisAdresi = `${TKGM.temelAdres}/${ayrisan.servis || "wms"}`;
        const kullanici = TKGM.kullaniciAdi;
        const sifre = TKGM.sifre;
        const request = (p.REQUEST || "").toLowerCase();
        const pyParam = ayrisan.parametreler.map(([a, d]) => `    "${a}": ${JSON.stringify(d)},`).join("\n");
        const csParam = ayrisan.parametreler.map(([a, d]) => `    ["${a}"] = ${JSON.stringify(d)},`).join("\n");

        switch (dil) {
            case "curl":
                return `# -u ile Basic Authentication bilgisi gönderilir\ncurl -u '${kullanici}:${sifre}' \\\n  '${tkgmAdresi}' \\\n  -o yanit${request === "getmap" ? ".png" : ".xml"}`;

            case "python":
                return `import requests

# TKGM Basic Authentication ister
KIMLIK = ("${kullanici}", "${sifre}")

parametreler = {
${pyParam}
}

yanit = requests.get("${servisAdresi}", params=parametreler, auth=KIMLIK, timeout=60)
print(yanit.status_code, yanit.headers.get("content-type"))
${request === "getmap" || request === "getlegendgraphic"
    ? `\nwith open("harita.png", "wb") as f:\n    f.write(yanit.content)`
    : `\n# Hata durumunda TKGM HTTP 500 ile ows:ExceptionReport döndürür\nif "ExceptionReport" in yanit.text:\n    print("Hata:", yanit.text)\nelse:\n    print(yanit.text[:500])`}`;

            case "owslib":
                if (ayrisan.servis === "wfs") {
                    return `from owslib.wfs import WebFeatureService

wfs = WebFeatureService("${servisAdresi}", version="1.0.0",
                        username="${kullanici}", password="${sifre}")
print(list(wfs.contents))  # ['TKGM:ilceler', 'TKGM:iller', 'TKGM:mahalleler', 'TKGM:parseller']

yanit = wfs.getfeature(typename="${p.TYPENAME || "TKGM:parseller"}", maxfeatures=${p.MAXFEATURES || 10})
open("parseller.gml", "wb").write(yanit.read())`;
                }
                return `from owslib.wms import WebMapService

wms = WebMapService("${servisAdresi}", version="1.1.1",
                    username="${kullanici}", password="${sifre}")
print(list(wms.contents))  # ['TKGM:MEGSIS', 'TKGM:ilceler', ...]

goruntu = wms.getmap(layers=["${p.LAYERS || "TKGM:parseller"}"], styles=[""],
                     srs="EPSG:4326", bbox=(${(p.BBOX || TKGM.ornekBbox).split(",").join(", ")}),
                     size=(${p.WIDTH || 800}, ${p.HEIGHT || 600}), format="image/png", transparent=True)
open("harita.png", "wb").write(goruntu.read())`;

            case "csharp":
                return `using System.Net.Http.Headers;
using System.Text;

using var istemci = new HttpClient();
var kimlik = Convert.ToBase64String(Encoding.UTF8.GetBytes("${kullanici}:${sifre}"));
istemci.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", kimlik);

var parametreler = new Dictionary<string, string>
{
${csParam}
};
var sorgu = string.Join("&", parametreler.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));

using var yanit = await istemci.GetAsync($"${servisAdresi}?{sorgu}");
Console.WriteLine($"{(int)yanit.StatusCode} {yanit.Content.Headers.ContentType}");
${request === "getmap" ? `await File.WriteAllBytesAsync("harita.png", await yanit.Content.ReadAsByteArrayAsync());` : `Console.WriteLine(await yanit.Content.ReadAsStringAsync());`}`;

            case "leaflet":
                return `// Tarayıcı, Authorization başlığı ekleyemediği için WMS karoları
// kendi sunucunuzdaki bir proxy üzerinden istenir (bu sitede: /OwsProxy/wms).
const harita = L.map("harita").setView([${TKGM.merkez.join(", ")}], ${TKGM.baslangicZoom});
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(harita);

L.tileLayer.wms("/OwsProxy/wms", {
    layers: "${p.LAYERS || p.QUERY_LAYERS || "TKGM:parseller"}",
    styles: "${p.STYLES || ""}",
    format: "image/png",
    transparent: true,
    version: "1.1.1"${p.CQL_FILTER ? `,\n    CQL_FILTER: ${JSON.stringify(p.CQL_FILTER)}` : ""}
}).addTo(harita);`;

            case "openlayers":
                return `import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import { fromLonLat } from "ol/proj";

new Map({
  target: "harita",
  layers: [
    new TileLayer({ source: new OSM() }),
    new TileLayer({
      source: new TileWMS({
        url: "/OwsProxy/wms", // kimlik bilgisini ekleyen kendi proxy'niz
        params: { LAYERS: "${p.LAYERS || "TKGM:parseller"}", STYLES: "${p.STYLES || ""}", VERSION: "1.1.1", TRANSPARENT: true },
      }),
    }),
  ],
  view: new View({ center: fromLonLat([${TKGM.merkez[1]}, ${TKGM.merkez[0]}]), zoom: ${TKGM.baslangicZoom} }),
});`;

            case "qgis":
                return ayrisan.servis === "wfs"
                    ? `QGIS'te TKGM WFS bağlantısı:

1. Katman ▸ Katman Ekle ▸ WFS / OGC API - Features Katmanı Ekle
2. "Yeni" düğmesine basın
3. Ad:   TKGM WFS
   URL:  ${servisAdresi}
4. Kimlik Doğrulama ▸ Temel (Basic):
   Kullanıcı adı: ${kullanici}
   Parola:        ${sifre}
5. WFS sürümü: 1.0.0 seçin (2.0 TKGM'de çalışmaz)
6. "Bağlan" ▸ TKGM:parseller ▸ "Ekle"

İpucu: Katmanı eklerken "Yalnızca mevcut görünümle kesişen nesneleri iste"
seçeneği açıkken haritayı Amasya Hızırpaşa'ya yaklaştırın.`
                    : `QGIS'te TKGM WMS bağlantısı:

1. Katman ▸ Katman Ekle ▸ WMS/WMTS Katmanı Ekle
2. "Yeni" düğmesine basın
3. Ad:   TKGM WMS
   URL:  ${servisAdresi}
4. Kimlik Doğrulama ▸ Temel (Basic):
   Kullanıcı adı: ${kullanici}
   Parola:        ${sifre}
5. "Bağlan" ▸ ${p.LAYERS || "TKGM:parseller"} katmanını seçin
6. Koordinat sistemi: EPSG:4326 veya EPSG:3857 ▸ "Ekle"

Not: Birden fazla katmanı tek seferde seçmeyin; her katmanı ayrı ekleyin.`;
        }
        return "";
    }

    const KOD_DILLERI = [
        { kod: "curl", ad: "curl" },
        { kod: "python", ad: "Python" },
        { kod: "owslib", ad: "OWSLib" },
        { kod: "csharp", ad: "C#" },
        { kod: "leaflet", ad: "Leaflet" },
        { kod: "openlayers", ad: "OpenLayers" },
        { kod: "qgis", ad: "QGIS" }
    ];

    // --- 7. İLERLEME KAYDI ------------------------------------------------------------

    const ILERLEME_ANAHTARI = "owslab.tamamlananGorevler";

    function tamamlananlar() {
        try {
            return new Set(JSON.parse(localStorage.getItem(ILERLEME_ANAHTARI) || "[]"));
        } catch {
            return new Set();
        }
    }

    function gorevTamamla(kimlik) {
        const kume = tamamlananlar();
        if (kume.has(kimlik)) return false;
        kume.add(kimlik);
        try {
            localStorage.setItem(ILERLEME_ANAHTARI, JSON.stringify([...kume]));
        } catch { /* gizli pencerede depolama kapalı olabilir; ilerleme yalnızca bu oturumda görünür */ }
        document.dispatchEvent(new CustomEvent("owslab:gorev", { detail: { kimlik } }));
        return true;
    }

    function ilerlemeyiSifirla() {
        try { localStorage.removeItem(ILERLEME_ANAHTARI); } catch { /* yok say */ }
        document.dispatchEvent(new CustomEvent("owslab:gorev", { detail: { kimlik: null } }));
    }

    // --- 8. YARDIMCILAR ---------------------------------------------------------------

    function boyutYaz(bayt) {
        if (bayt < 1024) return `${bayt} B`;
        if (bayt < 1024 * 1024) return `${(bayt / 1024).toFixed(1)} KB`;
        return `${(bayt / 1024 / 1024).toFixed(2)} MB`;
    }

    async function panoyaKopyala(metin) {
        try {
            await navigator.clipboard.writeText(metin);
            return true;
        } catch {
            const alan = document.createElement("textarea");
            alan.value = metin;
            document.body.appendChild(alan);
            alan.select();
            const basarili = document.execCommand("copy");
            alan.remove();
            return basarili;
        }
    }

    function bildir(mesaj, tur = "bilgi") {
        let kap = document.getElementById("bildirimKabi");
        if (!kap) {
            kap = document.createElement("div");
            kap.id = "bildirimKabi";
            kap.className = "bildirim-kabi";
            document.body.appendChild(kap);
        }
        const oge = document.createElement("div");
        oge.className = `bildirim bildirim-${tur}`;
        oge.innerHTML = mesaj;
        kap.appendChild(oge);
        setTimeout(() => oge.classList.add("gorunur"), 10);
        setTimeout(() => { oge.classList.remove("gorunur"); setTimeout(() => oge.remove(), 300); }, 3800);
    }

    return {
        TKGM, KATMANLAR, WMS_STILLERI, PARAMETRELER, SUTUNLAR, KOD_DILLERI,
        istekAyristir, istekOlustur, parametreAl, parametreSozlugu, proxyAdresi, proxyKoku, siteAdresi, canliAcik, degerKodla,
        istekGonder, gmlGeoJson, kmlGeoJson,
        xmlGirintile, xmlVurgula, htmlKacis,
        kodUret,
        tamamlananlar, gorevTamamla, ilerlemeyiSifirla,
        boyutYaz, panoyaKopyala, bildir
    };
})();
