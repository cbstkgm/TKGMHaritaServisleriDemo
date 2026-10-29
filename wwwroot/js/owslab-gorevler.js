// ============================================================================
// Görev denetimi: laboratuvardan gelen her yanıt aşağıdaki kurallarla denetlenir.
// Kimlikler Models/Mufredat.cs içindeki Gorev kimlikleriyle aynıdır.
// ============================================================================

(() => {
    "use strict";

    const istek = s => (s.p.REQUEST || "").toLowerCase();
    const basarili = s => !s.hata && s.durum >= 200 && s.durum < 300;
    const nesneSayisi = s => (s.geojson ? s.geojson.features.length : -1);
    const katmanIcerir = (deger, ad) => (deger || "").toLowerCase().includes(ad);

    const DENETIMLER = {
        "ilk-hata": s => !s.p.REQUEST && !!s.hata,
        "ilk-basari": s => !!s.p.SERVICE && !!s.p.VERSION && !!s.p.REQUEST && basarili(s),

        "wms-cap": s => s.servis === "wms" && istek(s) === "getcapabilities" && basarili(s),
        "wfs-cap": s => s.servis === "wfs" && istek(s) === "getcapabilities" && basarili(s),

        "getmap-parsel": s => istek(s) === "getmap" && katmanIcerir(s.p.LAYERS, "parseller") && s.tur === "resim",
        "getmap-130": s => istek(s) === "getmap" && (s.p.VERSION || "").startsWith("1.3") && !!s.p.CRS && katmanIcerir(s.p.LAYERS, "parseller") && s.tur === "resim",
        "getmap-coklu": s => istek(s) === "getmap" && (s.p.LAYERS || "").includes(",") && !!s.hata,

        "gfi-json": s => istek(s) === "getfeatureinfo" && katmanIcerir(s.p.QUERY_LAYERS, "parseller") && /json/i.test(s.p.INFO_FORMAT || "") && nesneSayisi(s) > 0,
        "gfi-mahalle": s => istek(s) === "getfeatureinfo" && katmanIcerir(s.p.QUERY_LAYERS, "mahalleler") && nesneSayisi(s) > 0,

        "lejant": s => istek(s) === "getlegendgraphic" && s.tur === "resim",
        "hazir-stil": s => istek(s) === "getmap" && !!(s.p.STYLES || "").trim() && s.tur === "resim",
        "sld-body": s => istek(s) === "getmap" && !!s.p.SLD_BODY && s.tur === "resim",
        "wms-cql": s => istek(s) === "getmap" && !!s.p.CQL_FILTER && s.tur === "resim",

        "dft-parsel": s => istek(s) === "describefeaturetype" && katmanIcerir(s.p.TYPENAME, "parseller") && basarili(s),
        "dft-mahalle": s => istek(s) === "describefeaturetype" && katmanIcerir(s.p.TYPENAME, "mahalleler") && basarili(s),

        "gf-propertyname": s => istek(s) === "getfeature" && !!s.p.PROPERTYNAME && nesneSayisi(s) > 0,
        "gf-kml": s => istek(s) === "getfeature" && /kml/i.test(s.p.OUTPUTFORMAT || "") && nesneSayisi(s) > 0,
        "gf-bos": s => istek(s) === "getfeature" && katmanIcerir(s.p.TYPENAME, "iller") && basarili(s) && nesneSayisi(s) === 0,

        "cql-parsel": s => {
            if (istek(s) !== "getfeature" || !s.geojson || s.geojson.features.length !== 1) return false;
            const p = s.geojson.features[0].properties;
            return p.adano === "983" && p.parselno === "2" && (p.durum === undefined || p.durum === "3") && /durum\s*=\s*'?3/i.test(s.p.CQL_FILTER || "");
        },
        "cql-like": s => istek(s) === "getfeature" && /like\s+'%?apartman/i.test(s.p.CQL_FILTER || "") && nesneSayisi(s) > 0,
        "cql-mekansal": s => istek(s) === "getfeature" && /(intersects|within|bbox|dwithin|contains)\s*\(/i.test(s.p.CQL_FILTER || "") && nesneSayisi(s) > 0,
        "ogc-filter": s => istek(s) === "getfeature" && !!s.p.FILTER && nesneSayisi(s) > 0
    };

    function arayuzuGuncelle() {
        const tamam = OwsLab.tamamlananlar();
        document.querySelectorAll("[data-gorev]").forEach(oge => {
            oge.classList.toggle("tamam", tamam.has(oge.dataset.gorev));
        });
        document.querySelectorAll("[data-ders-ilerleme]").forEach(oge => {
            const kimlikler = oge.dataset.dersIlerleme.split(",").filter(Boolean);
            const biten = kimlikler.filter(k => tamam.has(k)).length;
            oge.dataset.biten = biten;
            const metin = oge.querySelector(".ilerleme-metin");
            if (metin) metin.textContent = `${biten}/${kimlikler.length}`;
            const cubuk = oge.querySelector(".ilerleme-dolgu");
            if (cubuk) cubuk.style.width = `${kimlikler.length ? (biten / kimlikler.length) * 100 : 0}%`;
            oge.classList.toggle("ders-bitti", kimlikler.length > 0 && biten === kimlikler.length);
        });
        document.querySelectorAll("[data-toplam-ilerleme]").forEach(oge => {
            const toplam = parseInt(oge.dataset.toplamIlerleme, 10);
            const biten = [...tamam].filter(k => k in DENETIMLER || k.startsWith("uyg-") || k === "kod-kopyala").length;
            const metin = oge.querySelector(".ilerleme-metin");
            if (metin) metin.textContent = `${biten}/${toplam}`;
            const cubuk = oge.querySelector(".ilerleme-dolgu");
            if (cubuk) cubuk.style.width = `${toplam ? Math.min(biten / toplam, 1) * 100 : 0}%`;
        });
    }

    document.addEventListener("owslab:yanit", e => {
        const sonuc = e.detail.sonuc;
        Object.entries(DENETIMLER).forEach(([kimlik, denetim]) => {
            let gecti = false;
            try { gecti = denetim(sonuc); } catch { gecti = false; }
            if (gecti && OwsLab.gorevTamamla(kimlik)) {
                const oge = document.querySelector(`[data-gorev="${kimlik}"]`);
                const metin = oge ? oge.querySelector(".gorev-metin")?.textContent : null;
                OwsLab.bildir(`<i class="fa-solid fa-circle-check"></i> Görev tamamlandı${metin ? `: ${OwsLab.htmlKacis(metin)}` : ""}`, "basari");
            }
        });
    });

    document.addEventListener("owslab:gorev", arayuzuGuncelle);
    document.addEventListener("DOMContentLoaded", () => {
        arayuzuGuncelle();
        document.querySelectorAll("[data-eylem='ilerlemeSifirla']").forEach(d => d.addEventListener("click", () => {
            if (confirm("Tüm görev ilerlemeniz silinsin mi?")) OwsLab.ilerlemeyiSifirla();
        }));
    });
})();
