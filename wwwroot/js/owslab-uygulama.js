// ============================================================================
// Uygulama dersi: WMS + WFS'i birlikte kullanan küçük bir parsel sorgulama ekranı.
// Her adım gerçek bir TKGM isteği gönderir ve isteği "istek günlüğüne" yazar,
// böylece öğrenci arayüzün arkasında hangi OGC çağrılarının yapıldığını görür.
// ============================================================================

(() => {
    "use strict";

    const kok = document.querySelector("[data-parsel-uygulamasi]");
    if (!kok) return;

    const { TKGM, htmlKacis } = OwsLab;
    const F = `${TKGM.temelAdres}/wfs?`;
    const sec = rol => kok.querySelector(`[data-rol="${rol}"]`);

    const harita = L.map(sec("harita"), { zoomSnap: 0.5, maxZoom: 20 }).setView(TKGM.merkez, 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, maxNativeZoom: 19, attribution: "&copy; OpenStreetMap | Kadastro: TKGM" }).addTo(harita);

    const mahalleKatmani = L.featureGroup().addTo(harita);
    const adaKatmani = L.featureGroup().addTo(harita);
    let vurguKatmani = null;
    let adaParselleri = [];

    // Seçili parseli sunucu tarafında kırmızıya boyayan SLD (WMS + CQL_FILTER + SLD_BODY birlikte)
    const VURGU_SLD = `<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>TKGM:parseller</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill">#e03131</CssParameter><CssParameter name="fill-opacity">0.45</CssParameter></Fill><Stroke><CssParameter name="stroke">#c92a2a</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

    function gunlugeYaz(baslik, sonuc, ek = "") {
        const liste = sec("gunluk");
        liste.querySelector(".gunluk-bos")?.remove();
        const lab = `/Home/Laboratuvar?istek=${encodeURIComponent(sonuc.adres)}`;
        liste.insertAdjacentHTML("afterbegin", `<li class="gunluk-satir">
            <div class="d-flex justify-content-between gap-2">
                <b>${htmlKacis(baslik)}</b>
                <span class="text-muted text-nowrap">${sonuc.durum} · ${sonuc.sureMs} ms · ${OwsLab.boyutYaz(sonuc.boyut)}</span>
            </div>
            <code class="gunluk-url">${htmlKacis(sonuc.adres)}</code>
            <div class="d-flex justify-content-between">${ek}<a href="${lab}" target="_blank" class="small ms-auto">Laboratuvarda aç ↗</a></div>
        </li>`);
    }

    function adimDurumu(adim, durum) {
        const oge = kok.querySelector(`[data-adim="${adim}"]`);
        if (oge) oge.dataset.durum = durum;
    }

    async function mahalleyiGetir() {
        adimDurumu(1, "calisiyor");
        const sonuc = await OwsLab.istekGonder(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:mahalleler&PROPERTYNAME=tapukimlikno,tapumahallead,ilceref,geom`);
        gunlugeYaz("1 · Mahalle sınırı (WFS GetFeature)", sonuc);
        if (sonuc.hata || !sonuc.geojson?.features.length) {
            adimDurumu(1, "hata");
            OwsLab.bildir("Mahalle alınamadı. Günlükteki isteği laboratuvarda açıp inceleyin.", "uyari");
            return;
        }
        mahalleKatmani.clearLayers();
        const katman = L.geoJSON(sonuc.geojson, { style: { color: "#5f3dc4", weight: 3, fillOpacity: 0.04, dashArray: "6 4" }, interactive: false }).addTo(mahalleKatmani);
        harita.fitBounds(katman.getBounds());
        const p = sonuc.geojson.features[0].properties;
        sec("mahalleBilgi").innerHTML = `<b>${htmlKacis(p.tapumahallead)}</b> · mahalle kimliği <code>${htmlKacis(p.tapukimlikno)}</code> · ilçe <code>${htmlKacis(p.ilceref)}</code>`;
        adimDurumu(1, "tamam");
        OwsLab.gorevTamamla("uyg-mahalle");
        await adalariGetir();
    }

    // Demo hesap zaten tek mahalleyi gördüğü için mahalle filtresi yazılmaz. tapumahalleref ile süzmek,
    // PROPERTYNAME ile birlikte kullanıldığında TKGM ağ geçidinde 0 kayıt döndürüyor (bkz. Rehber).
    async function adalariGetir() {
        adimDurumu(2, "calisiyor");
        const sonuc = await OwsLab.istekGonder(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&PROPERTYNAME=adano&MAXFEATURES=1000&CQL_FILTER=durum=3`);
        const adalar = sonuc.geojson
            ? [...new Set(sonuc.geojson.features.map(f => f.properties.adano).filter(a => a && a !== "0"))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
            : [];
        gunlugeYaz("2a · Ada listesi (yalnızca adano sütunu)", sonuc,
            `<span class="small text-muted">${sonuc.geojson?.features.length ?? 0} kayıttan ${adalar.length} farklı ada</span>`);

        const secim = sec("adaSecimi");
        secim.innerHTML = `<option value="">Ada seçin (${adalar.length})</option>` + adalar.map(a => `<option value="${htmlKacis(a)}">${htmlKacis(a)}</option>`).join("");
        secim.disabled = adalar.length === 0;
        if (sonuc.geojson && sonuc.geojson.features.length >= TKGM.kayitSiniri) {
            sec("adaNotu").classList.remove("d-none");
        }
        adimDurumu(2, adalar.length ? "bekliyor" : "hata");
    }

    async function adaSecildi(ada) {
        if (!ada) return;
        adimDurumu(2, "calisiyor");
        const sonuc = await OwsLab.istekGonder(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&PROPERTYNAME=adano,parselno,tapualan,tapucinsaciklama,durum,geom&CQL_FILTER=adano='${ada}' AND durum=3`);
        gunlugeYaz(`2b · ${ada} ada parselleri (geometrili)`, sonuc);
        adaKatmani.clearLayers();
        adaParselleri = sonuc.geojson ? sonuc.geojson.features : [];
        const katman = L.geoJSON(sonuc.geojson, {
            style: { color: "#d9480f", weight: 2, fillColor: "#ff922b", fillOpacity: 0.15 },
            onEachFeature: (f, k) => {
                k.bindTooltip(`${htmlKacis(f.properties.adano)}/${htmlKacis(f.properties.parselno)}`, { permanent: adaParselleri.length <= 25, direction: "center", className: "parsel-etiketi" });
                k.on("click", () => parselSecildi(f.properties.parselno));
            }
        }).addTo(adaKatmani);
        if (katman.getBounds().isValid()) harita.fitBounds(katman.getBounds(), { maxZoom: 19, padding: [30, 30] });

        const secim = sec("parselSecimi");
        const sirali = [...adaParselleri].sort((a, b) => String(a.properties.parselno).localeCompare(String(b.properties.parselno), "tr", { numeric: true }));
        secim.innerHTML = `<option value="">Parsel seçin (${sirali.length})</option>` + sirali.map(f => `<option value="${htmlKacis(f.properties.parselno)}">${htmlKacis(f.properties.parselno)} — ${htmlKacis(f.properties.tapualan)} m²</option>`).join("");
        secim.disabled = sirali.length === 0;
        adimDurumu(2, "tamam");
        if (sirali.length) OwsLab.gorevTamamla("uyg-ada");
    }

    async function parselSecildi(parselNo) {
        if (!parselNo) return;
        const ada = sec("adaSecimi").value;
        sec("parselSecimi").value = parselNo;
        adimDurumu(3, "calisiyor");

        const cql = `adano='${ada}' AND parselno='${parselNo}' AND durum=3`;
        if (vurguKatmani) vurguKatmani.remove();
        vurguKatmani = L.tileLayer.wms("/OwsProxy/wms", {
            layers: "TKGM:parseller", styles: "", format: "image/png", transparent: true, version: "1.1.1",
            CQL_FILTER: cql, SLD_BODY: VURGU_SLD, maxZoom: 20
        }).addTo(harita);

        // Aynı vurgunun tek bir GetMap karşılığı günlükte gösterilir (karolar da bu parametrelerle istenir)
        const b = harita.getBounds();
        const getMap = `${TKGM.temelAdres}/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=TKGM:parseller&STYLES=&SRS=EPSG:4326&BBOX=${[b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => v.toFixed(6)).join(",")}&WIDTH=${harita.getSize().x}&HEIGHT=${harita.getSize().y}&FORMAT=image/png&TRANSPARENT=true&CQL_FILTER=${cql}&SLD_BODY=${VURGU_SLD}`;
        const sonuc = await OwsLab.istekGonder(getMap);
        if (sonuc.blobAdres) URL.revokeObjectURL(sonuc.blobAdres);
        gunlugeYaz(`3 · ${ada}/${parselNo} vurgusu (WMS GetMap + CQL_FILTER + SLD_BODY)`, sonuc);

        const f = adaParselleri.find(x => x.properties.parselno === parselNo);
        if (f) {
            const k = L.geoJSON(f);
            harita.fitBounds(k.getBounds(), { maxZoom: 19, padding: [60, 60] });
            const p = f.properties;
            sec("parselBilgi").innerHTML = `<table class="table table-sm ozet-tablo dikey mb-0"><tbody>
                <tr><th>Ada / Parsel</th><td><b>${htmlKacis(p.adano)} / ${htmlKacis(p.parselno)}</b></td></tr>
                <tr><th>Tapu alanı</th><td>${htmlKacis(p.tapualan)} m²</td></tr>
                <tr><th>Nitelik</th><td>${htmlKacis(p.tapucinsaciklama || "—")}</td></tr>
                <tr><th>Kayıt durumu</th><td><code>durum=${htmlKacis(p.durum)}</code> (güncel)</td></tr>
            </tbody></table>`;
        }
        adimDurumu(3, sonuc.hata ? "hata" : "tamam");
        if (!sonuc.hata) OwsLab.gorevTamamla("uyg-parsel");
    }

    sec("baslat").addEventListener("click", mahalleyiGetir);
    sec("adaSecimi").addEventListener("change", e => adaSecildi(e.target.value));
    sec("parselSecimi").addEventListener("change", e => parselSecildi(e.target.value));
    new ResizeObserver(() => harita.invalidateSize()).observe(sec("harita"));
})();
