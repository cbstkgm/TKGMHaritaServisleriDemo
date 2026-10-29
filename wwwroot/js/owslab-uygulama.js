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

    const idariKatman = L.featureGroup().addTo(harita);
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

    function secimDoldur(rol, bosEtiket, ogeler) {
        const secim = sec(rol);
        secim.innerHTML = `<option value="">${htmlKacis(bosEtiket)}</option>` + ogeler.map(o => `<option value="${htmlKacis(o.deger)}">${htmlKacis(o.etiket)}</option>`).join("");
        secim.disabled = ogeler.length === 0;
    }

    // Demo hesap TKGM:iller ve TKGM:ilceler katmanlarını göremez (canlı istekler boş döner). Bu durumda
    // aynı yapıdaki örnek GML kayıtları kullanılır; ekran ve günlük bunun canlı veri olmadığını açıkça söyler.
    const ORNEK_DOSYALAR = { "TKGM:iller": OwsLab.siteAdresi("data/ornek-iller.gml"), "TKGM:ilceler": OwsLab.siteAdresi("data/ornek-ilceler.gml") };

    async function ornekKayitlariOku(katman) {
        const dosya = ORNEK_DOSYALAR[katman];
        const baslangic = performance.now();
        const yanit = await fetch(dosya);
        const metin = await yanit.text();
        const ogeler = OwsLab.gmlGeoJson(new DOMParser().parseFromString(metin, "application/xml")).features;
        return { dosya, ogeler, sureMs: Math.round(performance.now() - baslangic), boyut: metin.length };
    }

    function gunlugeOrnekYaz(baslik, ornek, kayitSayisi) {
        const liste = sec("gunluk");
        liste.insertAdjacentHTML("afterbegin", `<li class="gunluk-satir ornek">
            <div class="d-flex justify-content-between gap-2">
                <b>${htmlKacis(baslik)}</b>
                <span class="text-muted text-nowrap">yerel · ${ornek.sureMs} ms · ${OwsLab.boyutYaz(ornek.boyut)}</span>
            </div>
            <code class="gunluk-url">${htmlKacis(ornek.dosya)}</code>
            <div class="d-flex justify-content-between"><span class="small text-muted">${kayitSayisi} örnek kayıt · TKGM'ye istek gitmedi</span><a href="${ornek.dosya}" target="_blank" class="small ms-auto">Dosyayı aç ↗</a></div>
        </li>`);
    }

    function ornekNotuGoster(notRol, katman, dosya) {
        sec(notRol).innerHTML = `<b>${katman}</b> canlı istekte hata vermeden <b>boş</b> döndü: demo hesabın yetkisi dışında. Liste örnek kayıttan dolduruldu (<a href="${dosya}" target="_blank">${dosya.split("/").pop()}</a>). Gerçek hesapta canlı yanıt kullanılır.`;
        sec(notRol).classList.remove("d-none");
    }

    /** Canlı WFS isteğini gönderir; boş dönerse örnek kayda düşer. Dönen değer: { ogeler, ornekMi } ya da hata durumunda null. */
    async function idariListeGetir({ adim, katman, filtre, baslik, notRol, suzgec }) {
        const sonuc = await OwsLab.istekGonder(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=${katman}&PROPERTYNAME=tapukimlikno,ad${katman === "TKGM:ilceler" ? ",ilref" : ""}${filtre ? `&CQL_FILTER=${filtre}` : ""}`);
        const canli = sonuc.geojson?.features || [];
        gunlugeYaz(`${adim} · ${baslik}${filtre ? ` (${filtre})` : ""} — canlı WFS`, sonuc, `<span class="small text-muted">${canli.length} kayıt</span>`);
        if (sonuc.hata) return null;
        if (canli.length) return { ogeler: canli, ornekMi: false };

        const ornek = await ornekKayitlariOku(katman);
        const ogeler = ornek.ogeler.filter(suzgec || (() => true));
        gunlugeOrnekYaz(`${adim} · ${baslik} — örnek kayıt`, ornek, ogeler.length);
        ornekNotuGoster(notRol, katman, ornek.dosya);
        return { ogeler, ornekMi: true };
    }

    function idariSiniriCiz(oge, renk) {
        idariKatman.clearLayers();
        if (!oge?.geometry) return;
        const k = L.geoJSON(oge, { style: { color: renk, weight: 2, fillOpacity: 0.03, dashArray: "8 6" }, interactive: false }).addTo(idariKatman);
        harita.fitBounds(k.getBounds());
    }

    // --- 1. İl ----------------------------------------------------------------------

    let iller = [];
    let ilceler = [];

    async function illeriGetir() {
        // Yeniden başlatıldığında önceki seçimleri ve vurguyu temizle
        [idariKatman, mahalleKatmani, adaKatmani].forEach(k => k.clearLayers());
        if (vurguKatmani) { vurguKatmani.remove(); vurguKatmani = null; }
        [1, 2, 3, 4, 5].forEach(a => adimDurumu(a, "bekliyor"));
        ["ilNotu", "ilceNotu", "adaNotu"].forEach(r => sec(r).classList.add("d-none"));
        ["mahalleBilgi", "parselBilgi"].forEach(r => { sec(r).innerHTML = ""; });
        ["ilceSecimi", "mahalleSecimi", "adaSecimi", "parselSecimi"].forEach(r => { sec(r).disabled = true; });
        if (!OwsLab.canliAcik) {
            adimDurumu(1, "hata");
            OwsLab.bildir("Bu yayında canlı TKGM istekleri kapalı; parsel uygulaması yalnızca canlı sürümde çalışır.");
            return;
        }
        adimDurumu(1, "calisiyor");

        const sonuc = await idariListeGetir({ adim: 1, katman: "TKGM:iller", baslik: "İl listesi", notRol: "ilNotu" });
        if (!sonuc || !sonuc.ogeler.length) { adimDurumu(1, "hata"); return; }
        iller = sonuc.ogeler;
        sec("ilSecimi").dataset.ornek = sonuc.ornekMi;
        const sirali = [...iller].sort((a, b) => a.properties.ad.localeCompare(b.properties.ad, "tr"));
        secimDoldur("ilSecimi", `İl seçin (${sirali.length})`, sirali.map(f => ({ deger: f.properties.tapukimlikno, etiket: f.properties.ad })));
        adimDurumu(1, "bekliyor");
        if (iller.length === 1) {
            sec("ilSecimi").value = iller[0].properties.tapukimlikno;
            await ilSecildi(iller[0].properties.tapukimlikno);
        }
    }

    async function ilSecildi(ilRef) {
        if (!ilRef) return;
        idariSiniriCiz(iller.find(f => String(f.properties.tapukimlikno) === String(ilRef)), "#868e96");
        adimDurumu(1, sec("ilSecimi").dataset.ornek === "true" ? "ornek" : "tamam");
        await ilceleriGetir(ilRef);
    }

    // --- 2. İlçe ----------------------------------------------------------------------

    async function ilceleriGetir(ilRef) {
        adimDurumu(2, "calisiyor");
        const sonuc = await idariListeGetir({
            adim: 2, katman: "TKGM:ilceler", baslik: "İlçe listesi", notRol: "ilceNotu",
            filtre: `ilref=${ilRef}`, suzgec: f => String(f.properties.ilref) === String(ilRef)
        });
        if (!sonuc || !sonuc.ogeler.length) { adimDurumu(2, "hata"); return; }
        ilceler = sonuc.ogeler;
        sec("ilceSecimi").dataset.ornek = sonuc.ornekMi;
        const sirali = [...ilceler].sort((a, b) => a.properties.ad.localeCompare(b.properties.ad, "tr"));
        secimDoldur("ilceSecimi", `İlçe seçin (${sirali.length})`, sirali.map(f => ({ deger: f.properties.tapukimlikno, etiket: f.properties.ad })));
        adimDurumu(2, "bekliyor");
        if (ilceler.length === 1) {
            sec("ilceSecimi").value = ilceler[0].properties.tapukimlikno;
            await ilceSecildi(ilceler[0].properties.tapukimlikno);
        }
    }

    async function ilceSecildi(ilceRef) {
        if (!ilceRef) return;
        idariSiniriCiz(ilceler.find(f => String(f.properties.tapukimlikno) === String(ilceRef)), "#5c7cfa");
        adimDurumu(2, sec("ilceSecimi").dataset.ornek === "true" ? "ornek" : "tamam");
        await mahalleleriGetir(ilceRef);
    }

    // --- 3. Mahalle -------------------------------------------------------------------

    let mahalleler = [];

    async function mahalleleriGetir(ilceRef) {
        adimDurumu(3, "calisiyor");
        const filtre = ilceRef ? `&CQL_FILTER=ilceref=${ilceRef}` : "";
        const sonuc = await OwsLab.istekGonder(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:mahalleler&PROPERTYNAME=tapukimlikno,tapumahallead,ilceref,geom${filtre}`);
        mahalleler = sonuc.geojson?.features || [];
        gunlugeYaz(`3 · Mahalleler${ilceRef ? ` (ilceref=${ilceRef})` : ""} (WFS, sınırlarla)`, sonuc, `<span class="small text-muted">${mahalleler.length} mahalle</span>`);
        if (sonuc.hata || !mahalleler.length) {
            adimDurumu(3, "hata");
            OwsLab.bildir("Mahalle alınamadı. Günlükteki isteği laboratuvarda açıp inceleyin.", "uyari");
            return;
        }
        const sirali = [...mahalleler].sort((a, b) => a.properties.tapumahallead.localeCompare(b.properties.tapumahallead, "tr"));
        secimDoldur("mahalleSecimi", `Mahalle seçin (${sirali.length})`, sirali.map(f => ({ deger: f.properties.tapukimlikno, etiket: f.properties.tapumahallead })));
        adimDurumu(3, "bekliyor");
        if (mahalleler.length === 1) {
            sec("mahalleSecimi").value = mahalleler[0].properties.tapukimlikno;
            await mahalleSecildi(mahalleler[0].properties.tapukimlikno);
        }
    }

    async function mahalleSecildi(mahalleRef) {
        if (!mahalleRef) return;
        const f = mahalleler.find(m => String(m.properties.tapukimlikno) === String(mahalleRef));
        mahalleKatmani.clearLayers();
        adaKatmani.clearLayers();
        const katman = L.geoJSON(f, { style: { color: "#5f3dc4", weight: 3, fillOpacity: 0.04, dashArray: "6 4" }, interactive: false }).addTo(mahalleKatmani);
        harita.fitBounds(katman.getBounds());
        const p = f.properties;
        sec("mahalleBilgi").innerHTML = `<b>${htmlKacis(p.tapumahallead)}</b> · mahalle kimliği <code>${htmlKacis(p.tapukimlikno)}</code> · ilçe kimliği <code>${htmlKacis(p.ilceref)}</code>`;
        adimDurumu(3, "tamam");
        OwsLab.gorevTamamla("uyg-mahalle");
        await adalariGetir(p.tapukimlikno);
    }

    // --- 4. Ada -------------------------------------------------------------------------

    let mahalleFiltresi = "";

    // Parseller seçilen mahalleye tapumahalleref (= mahalleler.tapukimlikno) ile bağlanır. Bu şarttır: demo hesap
    // mahalle katmanında tek mahalle görse de parsel katmanında çevredeki birçok mahallenin parsellerini görür.
    // TKGM ağ geçidi bu filtreyle birlikte istenen PROPERTYNAME listesinde geom yoksa 0 kayıt döndürür; bu yüzden geom hep istenir.
    async function adalariGetir(mahalleRef) {
        adimDurumu(4, "calisiyor");
        mahalleFiltresi = ` AND tapumahalleref=${mahalleRef}`;
        const sonuc = await OwsLab.istekGonder(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&PROPERTYNAME=adano,geom&MAXFEATURES=1000&CQL_FILTER=durum=3${mahalleFiltresi}`);
        const adalar = sonuc.geojson
            ? [...new Set(sonuc.geojson.features.map(f => f.properties.adano).filter(a => a && a !== "0"))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
            : [];
        gunlugeYaz(`4a · Ada listesi (tapumahalleref=${mahalleRef})`, sonuc,
            `<span class="small text-muted">${sonuc.geojson?.features.length ?? 0} kayıttan ${adalar.length} farklı ada</span>`);

        secimDoldur("adaSecimi", `Ada seçin (${adalar.length})`, adalar.map(a => ({ deger: a, etiket: a })));
        sec("adaNotu").classList.toggle("d-none", !(sonuc.geojson && sonuc.geojson.features.length >= TKGM.kayitSiniri));
        adimDurumu(4, adalar.length ? "bekliyor" : "hata");
    }

    async function adaSecildi(ada) {
        if (!ada) return;
        adimDurumu(4, "calisiyor");
        const sonuc = await OwsLab.istekGonder(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&PROPERTYNAME=adano,parselno,tapualan,tapucinsaciklama,durum,geom&CQL_FILTER=adano='${ada}' AND durum=3${mahalleFiltresi}`);
        gunlugeYaz(`4b · ${ada} ada parselleri (geometrili)`, sonuc);
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
        adimDurumu(4, "tamam");
        if (sirali.length) OwsLab.gorevTamamla("uyg-ada");
    }

    async function parselSecildi(parselNo) {
        if (!parselNo) return;
        const ada = sec("adaSecimi").value;
        sec("parselSecimi").value = parselNo;
        adimDurumu(5, "calisiyor");

        const cql = `adano='${ada}' AND parselno='${parselNo}' AND durum=3${mahalleFiltresi}`;
        if (vurguKatmani) vurguKatmani.remove();
        if (OwsLab.canliAcik) vurguKatmani = L.tileLayer.wms(OwsLab.proxyKoku("wms"), {
            layers: "TKGM:parseller", styles: "", format: "image/png", transparent: true, version: "1.1.1",
            CQL_FILTER: cql, SLD_BODY: VURGU_SLD, maxZoom: 20
        }).addTo(harita);

        // Aynı vurgunun tek bir GetMap karşılığı günlükte gösterilir (karolar da bu parametrelerle istenir)
        const b = harita.getBounds();
        const getMap = `${TKGM.temelAdres}/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=TKGM:parseller&STYLES=&SRS=EPSG:4326&BBOX=${[b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => v.toFixed(6)).join(",")}&WIDTH=${harita.getSize().x}&HEIGHT=${harita.getSize().y}&FORMAT=image/png&TRANSPARENT=true&CQL_FILTER=${cql}&SLD_BODY=${VURGU_SLD}`;
        const sonuc = await OwsLab.istekGonder(getMap);
        if (sonuc.blobAdres) URL.revokeObjectURL(sonuc.blobAdres);
        gunlugeYaz(`5 · ${ada}/${parselNo} vurgusu (WMS GetMap + CQL_FILTER + SLD_BODY)`, sonuc);

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
        adimDurumu(5, sonuc.hata ? "hata" : "tamam");
        if (!sonuc.hata) OwsLab.gorevTamamla("uyg-parsel");
    }

    sec("baslat").addEventListener("click", illeriGetir);
    sec("ilSecimi").addEventListener("change", e => ilSecildi(e.target.value));
    sec("ilceSecimi").addEventListener("change", e => ilceSecildi(e.target.value));
    sec("mahalleSecimi").addEventListener("change", e => mahalleSecildi(e.target.value));
    sec("adaSecimi").addEventListener("change", e => adaSecildi(e.target.value));
    sec("parselSecimi").addEventListener("change", e => parselSecildi(e.target.value));
    new ResizeObserver(() => harita.invalidateSize()).observe(sec("harita"));
})();
