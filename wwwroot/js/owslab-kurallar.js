// ============================================================================
// Parametre kuralları: hangi parametre hangi servis/işlemde geçerli, hangi
// değerleri alabilir, hangileri zorunlu. Laboratuvarın parametre tablosu
// seçim listelerini, uyarıları ve "Parametre ekle" menüsünü buradan üretir.
// ============================================================================

const OwsKurallar = (() => {
    "use strict";

    const { KATMANLAR, WMS_STILLERI } = OwsLab;

    const WMS_ISTEKLERI = ["GetCapabilities", "GetMap", "GetFeatureInfo", "GetLegendGraphic", "DescribeLayer", "GetStyles"];
    const WFS_ISTEKLERI = ["GetCapabilities", "DescribeFeatureType", "GetFeature"];
    const HEPSI = "*";

    // Seçenek durumları: gecerli → seçilebilir; kapali → seçilebilir ama TKGM'de hata verir; gecersiz → seçilemez
    const gecerli = (deger, not = "") => ({ deger, durum: "gecerli", not });
    const kapali = (deger, not) => ({ deger, durum: "kapali", not });
    const gecersiz = (deger, not) => ({ deger, durum: "gecersiz", not });

    const katmanSecenekleri = (servis) => Object.entries(KATMANLAR).map(([ad, k]) => {
        if (servis === "wfs" && !k.wfs) return gecersiz(ad, "yalnızca WMS'te");
        return k.veriVar ? gecerli(ad) : kapali(ad, "demo hesapta boş döner");
    });

    /**
     * kapsam: { wms: [işlemler] | HEPSI, wfs: ... } — parametrenin anlamlı olduğu yerler.
     * surum : yalnızca belirli WMS sürümünde geçerliyse ("1.1.1" / "1.3.0").
     * secenekler(b): sabit değer listesi; yoksa serbest metin.
     */
    const TANIMLAR = {
        SERVICE: { kapsam: { wms: HEPSI, wfs: HEPSI }, secenekler: () => [gecerli("WMS", "harita görüntüsü"), gecerli("WFS", "vektör veri")] },
        VERSION: {
            kapsam: { wms: HEPSI, wfs: HEPSI },
            secenekler: b => b.servis === "wfs"
                ? [gecerli("1.0.0", "önerilen"), gecerli("1.1.0"), kapali("2.0.0", "TKGM desteklemez")]
                : [gecerli("1.1.1", "önerilen"), gecerli("1.3.0", "CRS ve enlem,boylam BBOX")]
        },
        REQUEST: {
            kapsam: { wms: HEPSI, wfs: HEPSI },
            secenekler: b => [
                ...WMS_ISTEKLERI.map(r => b.servis === "wms" || r === "GetCapabilities" ? gecerli(r) : gecersiz(r, "yalnızca WMS")),
                ...WFS_ISTEKLERI.filter(r => r !== "GetCapabilities").map(r => b.servis === "wfs" ? gecerli(r) : gecersiz(r, "yalnızca WFS"))
            ]
        },
        LAYERS: { kapsam: { wms: ["GetMap", "GetFeatureInfo", "DescribeLayer", "GetStyles"] }, secenekler: () => katmanSecenekleri("wms") },
        QUERY_LAYERS: { kapsam: { wms: ["GetFeatureInfo"] }, secenekler: () => katmanSecenekleri("wms") },
        LAYER: { kapsam: { wms: ["GetLegendGraphic"] }, secenekler: () => katmanSecenekleri("wms") },
        STYLES: { kapsam: { wms: ["GetMap", "GetFeatureInfo"] }, secenekler: () => [gecerli("", "varsayılan stil"), ...WMS_STILLERI.map(s => gecerli(s))] },
        STYLE: { kapsam: { wms: ["GetLegendGraphic"] }, secenekler: () => WMS_STILLERI.map(s => gecerli(s)) },
        SRS: { kapsam: { wms: ["GetMap", "GetFeatureInfo"] }, surum: "1.1.1", secenekler: () => [gecerli("EPSG:4326", "boylam/enlem"), gecerli("EPSG:3857", "Web Mercator")] },
        CRS: { kapsam: { wms: ["GetMap", "GetFeatureInfo"] }, surum: "1.3.0", secenekler: () => [gecerli("EPSG:4326", "enlem/boylam sırası"), gecerli("EPSG:3857", "Web Mercator")] },
        BBOX: { kapsam: { wms: ["GetMap", "GetFeatureInfo"], wfs: ["GetFeature"] } },
        WIDTH: { kapsam: { wms: ["GetMap", "GetFeatureInfo", "GetLegendGraphic"] } },
        HEIGHT: { kapsam: { wms: ["GetMap", "GetFeatureInfo", "GetLegendGraphic"] } },
        FORMAT: {
            kapsam: { wms: ["GetMap", "GetLegendGraphic"] },
            secenekler: b => b.istek === "getlegendgraphic"
                ? [gecerli("image/png"), gecerli("image/jpeg"), gecerli("image/gif")]
                : [gecerli("image/png", "saydamlık destekler"), gecerli("image/jpeg", "saydamlık yok"), gecerli("image/png8"), gecerli("image/gif"), gecerli("application/pdf"), gecerli("image/svg+xml")]
        },
        TRANSPARENT: { kapsam: { wms: ["GetMap"] }, secenekler: () => [gecerli("true"), gecerli("false")] },
        BGCOLOR: { kapsam: { wms: ["GetMap"] } },
        SLD_BODY: { kapsam: { wms: ["GetMap", "GetLegendGraphic"] } },
        INFO_FORMAT: {
            kapsam: { wms: ["GetFeatureInfo"] },
            secenekler: b => [gecerli("application/json", b.surum.startsWith("1.3") ? "1.3.0'da HTML döner" : "önerilen"), gecerli("text/html"), kapali("text/plain", "TKGM'de hata"), kapali("application/vnd.ogc.gml", "TKGM'de hata")]
        },
        X: { kapsam: { wms: ["GetFeatureInfo"] }, surum: "1.1.1" },
        Y: { kapsam: { wms: ["GetFeatureInfo"] }, surum: "1.1.1" },
        I: { kapsam: { wms: ["GetFeatureInfo"] }, surum: "1.3.0" },
        J: { kapsam: { wms: ["GetFeatureInfo"] }, surum: "1.3.0" },
        FEATURE_COUNT: { kapsam: { wms: ["GetFeatureInfo"] } },
        CQL_FILTER: { kapsam: { wms: ["GetMap", "GetFeatureInfo"], wfs: ["GetFeature"] } },
        TYPENAME: { kapsam: { wfs: ["DescribeFeatureType", "GetFeature"] }, secenekler: () => katmanSecenekleri("wfs") },
        MAXFEATURES: { kapsam: { wfs: ["GetFeature"] } },
        PROPERTYNAME: { kapsam: { wfs: ["GetFeature"] } },
        OUTPUTFORMAT: {
            kapsam: { wfs: ["GetFeature"] },
            secenekler: () => [gecerli("GML2", "varsayılan"), gecerli("GML3"), gecerli("KML"), kapali("application/json", "TKGM'de kapalı"), kapali("CSV", "TKGM'de kapalı"), kapali("SHAPE-ZIP", "TKGM'de kapalı")]
        },
        SRSNAME: { kapsam: { wfs: ["GetFeature"] }, secenekler: () => [gecerli("EPSG:4326")] },
        FILTER: { kapsam: { wfs: ["GetFeature"] } },
        SORTBY: { kapsam: { wfs: ["GetFeature"] } },
        TYPENAMES: { kapsam: { wfs: ["DescribeFeatureType", "GetFeature"] }, wfs2: "TYPENAME" },
        COUNT: { kapsam: { wfs: ["GetFeature"] }, wfs2: "MAXFEATURES" },
        EXCEPTIONS: { kapsam: { wms: HEPSI, wfs: HEPSI } }
    };

    const ZORUNLU = {
        wms: {
            getcapabilities: [],
            getmap: ["LAYERS", "STYLES", "SRS", "BBOX", "WIDTH", "HEIGHT", "FORMAT"],
            getfeatureinfo: ["LAYERS", "STYLES", "SRS", "BBOX", "WIDTH", "HEIGHT", "QUERY_LAYERS", "INFO_FORMAT", "X", "Y"],
            getlegendgraphic: ["LAYER", "FORMAT"],
            describelayer: ["LAYERS"],
            getstyles: ["LAYERS"]
        },
        wfs: {
            getcapabilities: [],
            describefeaturetype: ["TYPENAME"],
            getfeature: ["TYPENAME"]
        }
    };

    /** WMS 1.1.1 ↔ 1.3.0 arasında adı değişen parametreler. */
    const SURUM_KARSILIKLARI = { SRS: "CRS", X: "I", Y: "J" };

    function surumeGoreAd(ad, surum) {
        if (!surum.startsWith("1.3")) return ad;
        return SURUM_KARSILIKLARI[ad] || ad;
    }

    function istekAdi(ham) {
        return [...WMS_ISTEKLERI, ...WFS_ISTEKLERI].find(r => r.toLowerCase() === (ham || "").toLowerCase()) || ham;
    }

    /** İsteğin bağlamı: servis, sürüm ve işlem (küçük harf). */
    function baglam(parametreler, yolServisi) {
        const al = ad => OwsLab.parametreAl(parametreler, ad);
        const servis = ((al("SERVICE") || yolServisi || "wms") + "").toLowerCase();
        return { servis, surum: al("VERSION") || "", istek: (al("REQUEST") || "").toLowerCase() };
    }

    function uygulanabilirMi(ad, b) {
        const t = TANIMLAR[ad];
        if (!t) return true;
        const kapsam = t.kapsam[b.servis];
        if (!kapsam) return false;
        if (kapsam !== HEPSI && b.istek && !kapsam.some(r => r.toLowerCase() === b.istek)) return false;
        if (t.surum && b.servis === "wms" && b.surum && !b.surum.startsWith(t.surum.slice(0, 3))) return false;
        return true;
    }

    function uygulanamamaNedeni(ad, b) {
        const t = TANIMLAR[ad];
        const kapsam = t.kapsam[b.servis];
        if (!kapsam) {
            const diger = Object.keys(t.kapsam).map(s => s.toUpperCase()).join("/");
            return `${ad} yalnızca ${diger} servisinde kullanılır; SERVICE=${b.servis.toUpperCase()} isteğinde sunucu bunu yok sayar.`;
        }
        if (t.surum && b.surum && !b.surum.startsWith(t.surum.slice(0, 3))) {
            const karsilik = Object.entries(SURUM_KARSILIKLARI).find(([e, y]) => e === ad || y === ad);
            const dogru = karsilik ? (karsilik[0] === ad ? karsilik[1] : karsilik[0]) : null;
            return `${ad} WMS ${t.surum} parametresidir; VERSION=${b.surum} için${dogru ? ` ${dogru} kullanın` : " kullanılmaz"}.`;
        }
        return `${ad}, ${b.servis.toUpperCase()} ${istekAdi(b.istek)} isteğinde kullanılmaz; sunucu yok sayar.`;
    }

    /**
     * Tüm parametreleri denetler. Dönen dizi her satır için
     * { secenekler, uyarilar: [{ tur: "hata"|"uyari", metin }] } içerir.
     */
    function denetle(parametreler, yolServisi) {
        const b = baglam(parametreler, yolServisi);
        const gorulen = {};
        const satirlar = parametreler.map(([hamAd, deger], i) => {
            const ad = (hamAd || "").trim().toUpperCase();
            const t = TANIMLAR[ad];
            const uyarilar = [];

            if (!ad) {
                uyarilar.push({ tur: "uyari", metin: "Parametre adı boş; bu satır gönderilmez." });
            } else if (ad in gorulen) {
                uyarilar.push({ tur: "hata", metin: `${ad} zaten ${gorulen[ad] + 1}. satırda var. Bir parametre istekte yalnızca bir kez yazılabilir; bu satırı silin.` });
            } else {
                gorulen[ad] = i;
            }

            let secenekler = null;
            if (ad && t) {
                if (!uygulanabilirMi(ad, b)) uyarilar.push({ tur: "uyari", metin: uygulanamamaNedeni(ad, b) });
                if (t.wfs2) uyarilar.push({ tur: "uyari", metin: `${ad} bir WFS 2.0 parametresidir; TKGM 2.0'ı desteklemez. Yerine ${t.wfs2} kullanın.` });
                if (t.secenekler) {
                    secenekler = t.secenekler(b);
                    const eslesen = secenekler.find(s => s.deger.toLowerCase() === (deger || "").toLowerCase());
                    if (!eslesen && ["LAYERS", "QUERY_LAYERS", "STYLES"].includes(ad) && (deger || "").includes(",")) {
                        uyarilar.push({ tur: "uyari", metin: ad === "STYLES"
                            ? "Virgülle her katman için ayrı stil yazılır; TKGM tek katman kabul ettiği için gereksizdir."
                            : "Virgülle birden fazla katman WMS standardında geçerlidir, ama TKGM tek katman kabul eder ve 'Katman bulunamadı' hatası verir." });
                    } else if (!eslesen) {
                        uyarilar.push({ tur: "uyari", metin: `"${deger}" bu parametre için listelenen değerlerden biri değil.` });
                    } else if (eslesen.durum === "gecersiz") {
                        uyarilar.push({ tur: "hata", metin: `${deger} bu istekle kullanılamaz (${eslesen.not}).` });
                    } else if (eslesen.durum === "kapali") {
                        uyarilar.push({ tur: "uyari", metin: `${deger}: ${eslesen.not}.` });
                    }
                }
            } else if (ad) {
                uyarilar.push({ tur: "uyari", metin: "Bu parametre OGC standardında tanımlı değil ya da TKGM için anlamsız; sunucu yok sayabilir." });
            }
            return { ad, secenekler, uyarilar };
        });

        if (b.servis === "wms" && b.surum && !["1.1.1", "1.3.0"].includes(b.surum)) {
            const i = parametreler.findIndex(([a]) => a.toUpperCase() === "VERSION");
            if (i >= 0 && !satirlar[i].uyarilar.length) satirlar[i].uyarilar.push({ tur: "uyari", metin: "WMS için 1.1.1 veya 1.3.0 kullanın." });
        }

        return { baglam: b, satirlar, eksikler: eksikZorunlular(parametreler, b), tekrarVar: satirlar.some(s => s.uyarilar.some(u => u.tur === "hata" && u.metin.includes("zaten"))) };
    }

    function eksikZorunlular(parametreler, b) {
        const mevcut = new Set(parametreler.map(([a]) => (a || "").toUpperCase()));
        const liste = ["SERVICE", "VERSION", "REQUEST", ...((ZORUNLU[b.servis] || {})[b.istek] || [])].map(a => surumeGoreAd(a, b.surum));
        return liste.filter(a => !mevcut.has(a));
    }

    /** "Parametre ekle" menüsü: henüz eklenmemiş, bu istekte anlamlı parametreler. */
    function eklenebilirler(parametreler, yolServisi) {
        const b = baglam(parametreler, yolServisi);
        const mevcut = new Set(parametreler.map(([a]) => (a || "").toUpperCase()));
        const zorunlu = eksikZorunlular(parametreler, b);
        const istegeBagli = Object.keys(TANIMLAR).filter(ad =>
            !mevcut.has(ad) && !zorunlu.includes(ad) && !TANIMLAR[ad].wfs2 && uygulanabilirMi(ad, b) && (b.istek || ["SERVICE", "VERSION", "REQUEST"].includes(ad)));
        return { zorunlu, istegeBagli };
    }

    function varsayilanSurum(servis) {
        return servis === "wfs" ? "1.0.0" : "1.1.1";
    }

    return { TANIMLAR, ZORUNLU, SURUM_KARSILIKLARI, baglam, denetle, eklenebilirler, uygulanabilirMi, varsayilanSurum, surumeGoreAd, istekAdi };
})();
