// ============================================================================
// owsLab laboratuvarı: düzenlenebilir istek adresi, parametre anatomisi,
// harita (tıklama = GetFeatureInfo, çizim = INTERSECTS) ve yanıt çözümleyici.
// Sayfadaki her [data-laboratuvar] öğesi için bir örnek oluşturulur.
// ============================================================================

const Laboratuvar = (() => {
    "use strict";

    const { TKGM, KATMANLAR, PARAMETRELER, SUTUNLAR, htmlKacis } = OwsLab;
    const W = `${TKGM.temelAdres}/wms?`;
    const F = `${TKGM.temelAdres}/wfs?`;

    /** Laboratuvardaki "Hazır istekler" menüsü. */
    const SABLONLAR = [
        { grup: "WMS", ad: "GetCapabilities", url: `${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities` },
        { grup: "WMS", ad: "GetMap — parseller", url: `${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=TKGM:parseller&STYLES=&SRS=EPSG:4326&BBOX=${TKGM.ornekBbox}&WIDTH=800&HEIGHT=640&FORMAT=image/png&TRANSPARENT=true` },
        { grup: "WMS", ad: "GetMap — mahalle sınırı", url: `${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=TKGM:mahalleler&STYLES=&SRS=EPSG:4326&BBOX=35.790,40.640,35.835,40.668&WIDTH=800&HEIGHT=500&FORMAT=image/png&TRANSPARENT=true` },
        { grup: "WMS", ad: "GetFeatureInfo (haritaya tıklayın)", url: null, gfi: true },
        { grup: "WMS", ad: "GetLegendGraphic", url: `${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=TKGM:parseller&FORMAT=image/png` },
        { grup: "WMS", ad: "DescribeLayer", url: `${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=DescribeLayer&LAYERS=TKGM:parseller` },
        { grup: "WMS", ad: "GetStyles (SLD)", url: `${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetStyles&LAYERS=TKGM:parseller` },
        { grup: "WFS", ad: "GetCapabilities", url: `${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetCapabilities` },
        { grup: "WFS", ad: "DescribeFeatureType — parseller", url: `${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=DescribeFeatureType&TYPENAME=TKGM:parseller` },
        { grup: "WFS", ad: "GetFeature — 20 güncel parsel", url: `${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&MAXFEATURES=20&PROPERTYNAME=adano,parselno,tapualan,tapucinsaciklama,durum,geom&CQL_FILTER=durum=3` },
        { grup: "WFS", ad: "GetFeature — mahalle", url: `${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:mahalleler` },
        { grup: "WFS", ad: "GetFeature — 983 ada", url: `${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&PROPERTYNAME=adano,parselno,tapualan,tapucinsaciklama,durum,geom&CQL_FILTER=adano='983' AND durum=3` },
        { grup: "WFS", ad: "GetFeature — KML çıktısı", url: `${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&MAXFEATURES=10&PROPERTYNAME=adano,parselno,geom&OUTPUTFORMAT=KML` }
    ];

    const ONCELIKLI_SUTUNLAR = ["adano", "parselno", "tapualan", "kadastroalan", "tapucinsaciklama", "durum", "onaydurum", "tapumahallead", "tapumahalleref", "tapukimlikno", "ilceref", "sistemkayittarihi"];

    const STIL_SONUC = { color: "#d9480f", weight: 2, fillColor: "#ff922b", fillOpacity: 0.18 };
    const STIL_SECILI = { color: "#1864ab", weight: 3, fillColor: "#4dabf7", fillOpacity: 0.35 };

    const ornekler = [];

    class LaboratuvarOrnegi {
        constructor(kok) {
            this.kok = kok;
            this.sec = rol => kok.querySelector(`[data-rol="${rol}"]`);
            this.urlAlani = this.sec("url");
            this.servis = "wms";
            this.parametreler = [];
            this.sonSonuc = null;
            this.secilenKodDili = "curl";
            this.sonucKatmani = null;
            this.goruntuKatmani = null;
            this.tiklamaIsareti = null;

            this.haritayiKur();
            this.olaylariBagla();
            this.sablonMenusunuDoldur();

            const baslangic = kok.dataset.baslangic || SABLONLAR[0].url;
            this.yukle(baslangic, { calistir: kok.dataset.otomatik === "true" });
        }

        // --- Harita ---------------------------------------------------------------

        haritayiKur() {
            this.harita = L.map(this.sec("harita"), { zoomSnap: 0.5, maxZoom: 20 }).setView(TKGM.merkez, TKGM.baslangicZoom);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 20, maxNativeZoom: 19,
                attribution: "&copy; OpenStreetMap katkıcıları | Kadastro: TKGM"
            }).addTo(this.harita);

            // Öğrencinin nerede olduğunu görmesi için soluk bir referans parsel katmanı (kendi proxy'miz üzerinden).
            this.referansKatman = L.tileLayer.wms("/OwsProxy/wms", {
                layers: "TKGM:parseller", styles: "", format: "image/png", transparent: true, version: "1.1.1", opacity: 0.45, maxZoom: 20
            });
            if (this.kok.dataset.referans !== "false") this.referansKatman.addTo(this.harita);

            this.sonucKatmani = L.featureGroup().addTo(this.harita);
            this.cizimKatmani = L.featureGroup().addTo(this.harita);

            const cizimKontrolu = new L.Control.Draw({
                position: "topleft",
                draw: {
                    polyline: false, circle: false, circlemarker: false, marker: false,
                    polygon: { shapeOptions: { color: "#7048e8", weight: 2 } },
                    rectangle: { shapeOptions: { color: "#7048e8", weight: 2 } }
                },
                edit: { featureGroup: this.cizimKatmani, edit: false }
            });
            this.harita.addControl(cizimKontrolu);
            this.cizimAktif = false;
            this.harita.on("draw:drawstart", () => { this.cizimAktif = true; });
            this.harita.on("draw:drawstop", () => { setTimeout(() => { this.cizimAktif = false; }, 50); });
            this.harita.on(L.Draw.Event.CREATED, e => this.cizimTamamlandi(e.layer));

            this.harita.on("click", e => this.haritayaTiklandi(e));
            this.harita.on("mousemove", e => {
                const kutu = this.sec("koordinat");
                if (kutu) kutu.textContent = `boylam ${e.latlng.lng.toFixed(5)} · enlem ${e.latlng.lat.toFixed(5)} · zoom ${this.harita.getZoom()}`;
            });

            // Laboratuvar gizli bir sekmede/akordiyonda açılırsa harita boyutunu yenile
            new ResizeObserver(() => this.harita.invalidateSize()).observe(this.sec("harita"));
        }

        haritayaTiklandi(e) {
            if (this.cizimAktif) return;
            const request = (OwsLab.parametreAl(this.parametreler, "REQUEST") || "").toLowerCase();
            if (request === "getfeatureinfo") {
                this.gfiParametreleriniDoldur(e.containerPoint);
                this.gonder();
                return;
            }
            const icerik = document.createElement("div");
            icerik.className = "lab-popup";
            icerik.innerHTML = `
                <div class="small text-muted mb-1">Tıkladığınız nokta</div>
                <code>boylam ${e.latlng.lng.toFixed(6)}<br>enlem ${e.latlng.lat.toFixed(6)}</code>
                <button type="button" class="btn btn-sm btn-primary w-100 mt-2">Bu noktayı GetFeatureInfo ile sorgula</button>`;
            icerik.querySelector("button").addEventListener("click", () => {
                this.harita.closePopup();
                this.gfiSablonunuKur("TKGM:parseller");
                this.gfiParametreleriniDoldur(e.containerPoint);
                this.gonder();
            });
            L.popup().setLatLng(e.latlng).setContent(icerik).openOn(this.harita);
        }

        cizimTamamlandi(katman) {
            this.cizimKatmani.clearLayers();
            this.cizimKatmani.addLayer(katman);
            const halka = katman.getLatLngs()[0].map(ll => `${ll.lng.toFixed(6)} ${ll.lat.toFixed(6)}`);
            halka.push(halka[0]);
            const wkt = `POLYGON((${halka.join(", ")}))`;

            const icerik = document.createElement("div");
            icerik.className = "lab-popup";
            icerik.innerHTML = `
                <div class="small fw-semibold mb-1">Çizdiğiniz alanın WKT karşılığı</div>
                <code class="d-block small text-break" style="max-height:90px;overflow:auto">${htmlKacis(wkt)}</code>
                <button type="button" class="btn btn-sm btn-primary w-100 mt-2">Bu alanla kesişen parselleri getir</button>`;
            icerik.querySelector("button").addEventListener("click", () => {
                this.harita.closePopup();
                this.yukle(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=TKGM:parseller&PROPERTYNAME=adano,parselno,tapualan,tapucinsaciklama,durum,geom&CQL_FILTER=INTERSECTS(geom, ${wkt}) AND durum=3`);
            });
            katman.bindPopup(icerik, { maxWidth: 320 }).openPopup();
        }

        /** Haritanın o anki görünümünden GetFeatureInfo için BBOX/WIDTH/HEIGHT/X/Y hesaplar. */
        gfiParametreleriniDoldur(nokta) {
            const boyut = this.harita.getSize();
            const surum = OwsLab.parametreAl(this.parametreler, "VERSION") || "1.1.1";
            this.parametreAyarla("BBOX", this.gorunumBbox(surum));
            this.parametreAyarla("WIDTH", String(boyut.x));
            this.parametreAyarla("HEIGHT", String(boyut.y));
            if (surum.startsWith("1.3")) {
                this.parametreAyarla("I", String(Math.round(nokta.x)));
                this.parametreAyarla("J", String(Math.round(nokta.y)));
            } else {
                this.parametreAyarla("X", String(Math.round(nokta.x)));
                this.parametreAyarla("Y", String(Math.round(nokta.y)));
            }
            this.urlYaz();

            if (this.tiklamaIsareti) this.tiklamaIsareti.remove();
            this.tiklamaIsareti = L.circleMarker(this.harita.containerPointToLatLng(nokta), { radius: 7, color: "#1864ab", weight: 3, fillOpacity: 0.2 })
                .bindTooltip(`X=${Math.round(nokta.x)}, Y=${Math.round(nokta.y)} (piksel)`, { permanent: true, direction: "right", offset: [8, 0] })
                .addTo(this.harita);
        }

        gfiSablonunuKur(katman) {
            const boyut = this.harita.getSize();
            this.yukle(`${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=${katman}&QUERY_LAYERS=${katman}&STYLES=&SRS=EPSG:4326&BBOX=${this.gorunumBbox("1.1.1")}&WIDTH=${boyut.x}&HEIGHT=${boyut.y}&X=${Math.round(boyut.x / 2)}&Y=${Math.round(boyut.y / 2)}&INFO_FORMAT=application/json&FEATURE_COUNT=1`, { calistir: false });
        }

        /** Görünümün BBOX'u. WMS 1.3.0 + EPSG:4326'da eksen sırası enlem,boylam olur. */
        gorunumBbox(surum = "1.1.1", crs = null) {
            const s = this.harita.getBounds();
            const hedefCrs = (crs || OwsLab.parametreAl(this.parametreler, "CRS") || OwsLab.parametreAl(this.parametreler, "SRS") || "EPSG:4326").toUpperCase();
            if (hedefCrs === "EPSG:3857" || hedefCrs === "EPSG:900913") {
                const g = L.CRS.EPSG3857.project(s.getSouthWest());
                const k = L.CRS.EPSG3857.project(s.getNorthEast());
                return [g.x, g.y, k.x, k.y].map(v => v.toFixed(2)).join(",");
            }
            const y = v => v.toFixed(6);
            return surum.startsWith("1.3")
                ? [s.getSouth(), s.getWest(), s.getNorth(), s.getEast()].map(y).join(",")
                : [s.getWest(), s.getSouth(), s.getEast(), s.getNorth()].map(y).join(",");
        }

        haritadanDoldur() {
            const request = (OwsLab.parametreAl(this.parametreler, "REQUEST") || "").toLowerCase();
            const surum = OwsLab.parametreAl(this.parametreler, "VERSION") || "1.1.1";
            const boyut = this.harita.getSize();
            if (this.servis === "wms" && (request === "getmap" || request === "getfeatureinfo")) {
                this.parametreAyarla("BBOX", this.gorunumBbox(surum));
                this.parametreAyarla("WIDTH", String(boyut.x));
                this.parametreAyarla("HEIGHT", String(boyut.y));
                OwsLab.bildir("BBOX, WIDTH ve HEIGHT haritanın şu anki görünümünden dolduruldu.");
            } else if (this.servis === "wfs" && request === "getfeature") {
                const s = this.harita.getBounds();
                const bbox = [s.getWest(), s.getSouth(), s.getEast(), s.getNorth()].map(v => v.toFixed(6)).join(",");
                const cql = OwsLab.parametreAl(this.parametreler, "CQL_FILTER");
                if (cql) {
                    const temiz = cql.replace(/\s*AND\s+BBOX\(geom,[^)]*\)/i, "").replace(/^BBOX\(geom,[^)]*\)\s*AND\s*/i, "");
                    this.parametreAyarla("CQL_FILTER", `${temiz} AND BBOX(geom,${bbox})`);
                    OwsLab.bildir("CQL_FILTER varken BBOX parametresi yok sayılır; bu yüzden alan, filtrenin içine BBOX(geom, …) olarak eklendi.");
                } else {
                    this.parametreAyarla("BBOX", bbox);
                    OwsLab.bildir("BBOX parametresi haritanın görünümünden dolduruldu.");
                }
            } else {
                OwsLab.bildir("Haritadan doldurma GetMap, GetFeatureInfo ve WFS GetFeature isteklerinde kullanılır.", "uyari");
                return;
            }
            this.urlYaz();
        }

        // --- Olaylar ----------------------------------------------------------------

        olaylariBagla() {
            let zamanlayici = null;
            this.urlAlani.addEventListener("input", () => {
                clearTimeout(zamanlayici);
                zamanlayici = setTimeout(() => this.urlOku(), 250);
            });
            this.urlAlani.addEventListener("keydown", e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.urlOku();
                    this.gonder();
                }
            });

            this.kok.addEventListener("click", e => {
                const dugme = e.target.closest("[data-eylem]");
                if (!dugme || !this.kok.contains(dugme)) return;
                const eylem = dugme.dataset.eylem;
                if (eylem === "gonder") { this.urlOku(); this.gonder(); }
                else if (eylem === "kopyala") this.urlKopyala();
                else if (eylem === "haritadan") this.haritadanDoldur();
                else if (eylem === "parametreEkle") this.parametreEkle();
                else if (eylem === "parametreSil") this.parametreSil(parseInt(dugme.dataset.indeks, 10));
                else if (eylem === "sekme") this.sekmeSec(dugme.dataset.sekme);
                else if (eylem === "kodDili") { this.secilenKodDili = dugme.dataset.dil; this.kodPaneliniCiz(); }
                else if (eylem === "kodKopyala") this.kodKopyala();
                else if (eylem === "temizle") this.haritayiTemizle();
            });

            const referansKutusu = this.sec("referans");
            if (referansKutusu) {
                referansKutusu.checked = this.kok.dataset.referans !== "false";
                referansKutusu.addEventListener("change", () => {
                    if (referansKutusu.checked) this.referansKatman.addTo(this.harita);
                    else this.referansKatman.remove();
                });
            }

            this.sec("parametreTablosu").addEventListener("input", e => {
                const satir = e.target.closest("tr[data-indeks]");
                if (!satir) return;
                const i = parseInt(satir.dataset.indeks, 10);
                const ad = satir.querySelector("[data-alan='ad']").value;
                const deger = satir.querySelector("[data-alan='deger']").value;
                this.parametreler[i] = [ad, deger];
                const aciklama = satir.querySelector(".param-aciklama");
                if (aciklama) aciklama.textContent = this.parametreAciklamasi(ad);
                this.urlYaz(false);
            });
        }

        sablonMenusunuDoldur() {
            const menu = this.sec("sablonlar");
            if (!menu) return;
            let sonGrup = null;
            SABLONLAR.forEach((s, i) => {
                if (s.grup !== sonGrup) {
                    menu.insertAdjacentHTML("beforeend", `<li><h6 class="dropdown-header">${s.grup}</h6></li>`);
                    sonGrup = s.grup;
                }
                menu.insertAdjacentHTML("beforeend", `<li><button type="button" class="dropdown-item small" data-sablon="${i}">${htmlKacis(s.ad)}</button></li>`);
            });
            menu.addEventListener("click", e => {
                const oge = e.target.closest("[data-sablon]");
                if (!oge) return;
                const s = SABLONLAR[parseInt(oge.dataset.sablon, 10)];
                if (s.gfi) {
                    this.gfiSablonunuKur("TKGM:parseller");
                    OwsLab.bildir("GetFeatureInfo hazır. Şimdi haritada bir parselin üzerine tıklayın.");
                } else {
                    this.yukle(s.url);
                }
            });
        }

        // --- URL ve parametreler ----------------------------------------------------------

        /** Dışarıdan (ders içeriğinden) bir istek yükler. */
        yukle(url, { calistir = true } = {}) {
            this.urlAlani.value = url;
            this.urlOku();
            if (calistir) this.gonder();
            else this.sekmeSec("parametre");
            if (window.innerWidth < 992) this.kok.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        urlOku() {
            const ayrisan = OwsLab.istekAyristir(this.urlAlani.value);
            this.servis = ayrisan.servis || "wms";
            this.parametreler = ayrisan.parametreler;
            this.servisRozetiniGuncelle(ayrisan.servis);
            this.parametreTablosunuCiz();
        }

        urlYaz(tabloyuYenidenCiz = true) {
            this.urlAlani.value = OwsLab.istekOlustur(this.servis, this.parametreler, true);
            if (tabloyuYenidenCiz) this.parametreTablosunuCiz();
            const tkgmLink = this.sec("tkgmLink");
            if (tkgmLink) tkgmLink.href = this.kodlanmisAdres();
        }

        parametreAyarla(ad, deger) {
            const i = this.parametreler.findIndex(([a]) => a.toUpperCase() === ad.toUpperCase());
            if (i >= 0) this.parametreler[i] = [this.parametreler[i][0], deger];
            else this.parametreler.push([ad, deger]);
        }

        parametreEkle() {
            this.parametreler.push(["", ""]);
            this.parametreTablosunuCiz();
            const satirlar = this.sec("parametreTablosu").querySelectorAll("tr[data-indeks] [data-alan='ad']");
            satirlar[satirlar.length - 1]?.focus();
        }

        parametreSil(i) {
            this.parametreler.splice(i, 1);
            this.urlYaz();
        }

        parametreAciklamasi(ad) {
            const tanim = PARAMETRELER[(ad || "").toUpperCase()];
            return tanim ? tanim.aciklama : (ad ? "Bu parametre OGC standardında tanımlı değil ya da TKGM için anlamsız; sunucu yok sayabilir." : "");
        }

        servisRozetiniGuncelle(servis) {
            const rozet = this.sec("servisRozeti");
            if (!rozet) return;
            rozet.textContent = servis ? servis.toUpperCase() : "?";
            rozet.className = `lab-servis-rozeti servis-${servis || "yok"}`;
            const tkgmLink = this.sec("tkgmLink");
            if (tkgmLink) tkgmLink.href = this.kodlanmisAdres();
        }

        parametreTablosunuCiz() {
            const govde = this.sec("parametreTablosu");
            const sayac = this.sec("parametreSayisi");
            if (sayac) sayac.textContent = this.parametreler.length;
                        govde.innerHTML = this.parametreler.map(([ad, deger], i) => {
                const tanim = PARAMETRELER[(ad || "").toUpperCase()];
                const listeKimligi = `oneri-${i}-${Math.random().toString(36).slice(2, 7)}`;
                const oneriler = tanim && tanim.oneriler.length
                    ? `<datalist id="${listeKimligi}">${tanim.oneriler.map(o => `<option value="${htmlKacis(o)}">`).join("")}</datalist>`
                    : "";
                const uzunMu = (deger || "").length > 60;
                const degerAlani = uzunMu
                    ? `<textarea class="form-control form-control-sm font-monospace" data-alan="deger" rows="3" spellcheck="false">${htmlKacis(deger)}</textarea>`
                    : `<input class="form-control form-control-sm font-monospace" data-alan="deger" value="${htmlKacis(deger)}" ${oneriler ? `list="${listeKimligi}"` : ""} spellcheck="false">`;
                return `<tr data-indeks="${i}">
                    <td class="param-ad"><input class="form-control form-control-sm font-monospace fw-semibold" data-alan="ad" value="${htmlKacis(ad)}" list="owslabParametreAdlari" spellcheck="false"></td>
                    <td>${degerAlani}${oneriler}<div class="param-aciklama">${htmlKacis(this.parametreAciklamasi(ad))}</div></td>
                    <td class="param-sil"><button type="button" class="btn btn-sm btn-link text-danger p-0" data-eylem="parametreSil" data-indeks="${i}" title="Parametreyi kaldır"><i class="fa-solid fa-xmark"></i></button></td>
                </tr>`;
            }).join("") || `<tr><td colspan="3" class="text-muted small p-2">Bu adreste hiç parametre yok. Sunucu ne istediğinizi bilemez.</td></tr>`;
        }

        /** Kutudaki okunur adresi, sunucuya gidecek doğru kodlanmış adrese çevirir (ör. # → %23, boşluk → %20). */
        kodlanmisAdres() {
            const metin = this.urlAlani.value.trim();
            const ayrisan = OwsLab.istekAyristir(metin);
            return ayrisan.servis ? OwsLab.istekOlustur(ayrisan.servis, ayrisan.parametreler).replace(/\?$/, ayrisan.parametreler.length ? "" : "?") : metin;
        }

        async urlKopyala() {
            if (await OwsLab.panoyaKopyala(this.kodlanmisAdres())) OwsLab.bildir("İstek adresi (URL kodlanmış haliyle) panoya kopyalandı.");
        }

        // --- İstek gönderme ------------------------------------------------------------

        async gonder() {
            const adres = this.kodlanmisAdres();
            this.yukleniyor(true);
            const sonuc = await OwsLab.istekGonder(adres);
            this.yukleniyor(false);

            if (this.sonSonuc && this.sonSonuc.blobAdres) URL.revokeObjectURL(this.sonSonuc.blobAdres);
            this.sonSonuc = sonuc;
            this.sonucuGoster(sonuc);
            document.dispatchEvent(new CustomEvent("owslab:yanit", { detail: { sonuc, laboratuvar: this } }));
        }

        yukleniyor(durum) {
            this.sec("yukleniyor").classList.toggle("d-none", !durum);
            this.kok.querySelectorAll("[data-eylem='gonder']").forEach(d => { d.disabled = durum; });
        }

        haritayiTemizle() {
            this.sonucKatmani.clearLayers();
            this.cizimKatmani.clearLayers();
            if (this.goruntuKatmani) { this.goruntuKatmani.remove(); this.goruntuKatmani = null; }
            if (this.tiklamaIsareti) { this.tiklamaIsareti.remove(); this.tiklamaIsareti = null; }
        }

        // --- Yanıtı gösterme ------------------------------------------------------------------

        sonucuGoster(s) {
            this.durumCubugunuCiz(s);
            this.haritayaYerlestir(s);
            this.sec("panel-ozet").innerHTML = this.ozetHtml(s);
            this.ozetOlaylariniBagla();
            this.hamPaneliniCiz(s);
            this.tabloPaneliniCiz(s);
            this.kodPaneliniCiz();
            this.sekmeSec("ozet");
        }

        durumCubugunuCiz(s) {
            const basarili = !s.hata && s.durum >= 200 && s.durum < 300;
            const nesneSayisi = s.geojson ? `<span class="durum-cip"><i class="fa-solid fa-shapes"></i> ${s.geojson.features.length} nesne</span>` : "";
            this.sec("durum").innerHTML = `
                <span class="durum-cip ${basarili ? "basarili" : "hatali"}">HTTP ${s.durum || "—"}</span>
                <span class="durum-cip"><i class="fa-regular fa-clock"></i> ${s.onbellek ? "önbellekten" : `${s.sureMs} ms`}</span>
                <span class="durum-cip"><i class="fa-solid fa-weight-hanging"></i> ${OwsLab.boyutYaz(s.boyut)}</span>
                <span class="durum-cip font-monospace" title="Content-Type">${htmlKacis(s.icerikTipi || "—")}</span>
                ${nesneSayisi}`;
        }

        haritayaYerlestir(s) {
            this.sonucKatmani.clearLayers();
            if (this.goruntuKatmani) { this.goruntuKatmani.remove(); this.goruntuKatmani = null; }
            const request = (s.p.REQUEST || "").toLowerCase();

            if (s.tur === "resim" && request === "getmap") {
                const sinirlar = this.bboxSinirlari(s.p);
                if (sinirlar) {
                    this.goruntuKatmani = L.imageOverlay(s.blobAdres, sinirlar, { opacity: 0.95, interactive: false }).addTo(this.harita);
                    L.rectangle(sinirlar, { color: "#495057", weight: 1, dashArray: "4 4", fill: false, interactive: false }).addTo(this.sonucKatmani);
                    if (!this.harita.getBounds().intersects(sinirlar)) this.harita.fitBounds(sinirlar);
                }
            }

            if (s.geojson && s.geojson.features.some(f => f.geometry)) {
                this.geoKatman = L.geoJSON(s.geojson, {
                    style: () => STIL_SONUC,
                    pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 6, ...STIL_SONUC, fillOpacity: 0.7 }),
                    onEachFeature: (f, katman) => {
                        const p = f.properties || {};
                        const etiket = p.adano ? `${p.adano} ada / ${p.parselno} parsel` : (p.tapumahallead || p.ad || f.id || "nesne");
                        katman.bindTooltip(htmlKacis(etiket), { sticky: true });
                        katman.on("click", e => { L.DomEvent.stopPropagation(e); this.nesneSec(f.id); });
                    }
                }).addTo(this.sonucKatmani);
                const sinirlar = this.geoKatman.getBounds();
                if (sinirlar.isValid()) this.harita.fitBounds(sinirlar, { maxZoom: 18, padding: [20, 20] });
            }
        }

        bboxSinirlari(p) {
            if (!p.BBOX) return null;
            const d = p.BBOX.split(",").map(Number);
            if (d.length !== 4 || d.some(isNaN)) return null;
            const crs = (p.CRS || p.SRS || "EPSG:4326").toUpperCase();
            if (crs === "EPSG:3857" || crs === "EPSG:900913") {
                const g = L.CRS.EPSG3857.unproject(L.point(d[0], d[1]));
                const k = L.CRS.EPSG3857.unproject(L.point(d[2], d[3]));
                return L.latLngBounds(g, k);
            }
            if ((p.VERSION || "").startsWith("1.3") && crs === "EPSG:4326") {
                return L.latLngBounds([d[0], d[1]], [d[2], d[3]]);
            }
            return L.latLngBounds([d[1], d[0]], [d[3], d[2]]);
        }

        nesneSec(kimlik) {
            if (!this.geoKatman) return;
            this.geoKatman.eachLayer(k => {
                const secili = k.feature && k.feature.id === kimlik;
                if (k.setStyle) k.setStyle(secili ? STIL_SECILI : STIL_SONUC);
                if (secili) {
                    if (k.getBounds) this.harita.fitBounds(k.getBounds(), { maxZoom: 19, padding: [40, 40] });
                    if (k.bringToFront) k.bringToFront();
                }
            });
            this.sec("panel-tablo").querySelectorAll("tr[data-kimlik]").forEach(tr => tr.classList.toggle("secili", tr.dataset.kimlik === kimlik));
        }

        ozetHtml(s) {
            if (s.hata) return this.hataHtml(s);
            const request = (s.p.REQUEST || "").toLowerCase();
            const kok = s.xml ? s.xml.documentElement.localName : "";

            if (s.tur === "resim") {
                const yerlesti = request === "getmap" && this.goruntuKatmani;
                return `<div class="ozet-blok">
                    <div class="ozet-baslik"><i class="fa-regular fa-image"></i> Sunucu bir görüntü döndürdü</div>
                    <div class="goruntu-onizleme"><img src="${s.blobAdres}" alt="TKGM yanıt görüntüsü"></div>
                    <p class="small mb-0">${yerlesti
                        ? "Bu PNG, istekteki BBOX koordinatlarına göre haritaya yerleştirildi (kesikli çerçeve). WMS sunucusu vektör değil, hazır çizilmiş bir resim gönderir: piksellere tıklayıp öznitelik okuyamazsınız; bunun için GetFeatureInfo gerekir."
                        : request === "getlegendgraphic" ? "Lejant, katmanın stilindeki her kuralı (Rule) bir simgeyle gösterir. Stil değişirse lejant da değişir." : "Görüntü yanıtı."}</p>
                    ${this.bosGoruntuUyarisi(s)}
                </div>`;
            }
            if (s.tur === "pdf") {
                return `<div class="ozet-blok"><div class="ozet-baslik"><i class="fa-regular fa-file-pdf"></i> PDF yanıtı</div>
                    <p class="small">FORMAT=application/pdf ile harita bir PDF sayfası olarak üretildi.</p>
                    <a class="btn btn-sm btn-outline-primary" href="${s.blobAdres}" target="_blank" rel="noopener">PDF'i aç</a></div>`;
            }
            if (kok === "WMT_MS_Capabilities" || kok === "WMS_Capabilities") return this.wmsYetenekHtml(s.xml);
            if (kok === "WFS_Capabilities") return this.wfsYetenekHtml(s.xml);
            if (kok === "schema") return this.semaHtml(s);
            if (kok === "WMS_DescribeLayerResponse") return this.describeLayerHtml(s.xml);
            if (kok === "StyledLayerDescriptor") return this.sldHtml(s.xml);
            if (s.geojson) return this.nesneOzetiHtml(s);
            if (s.tur === "html") {
                return `<div class="ozet-blok"><div class="ozet-baslik"><i class="fa-solid fa-code"></i> HTML yanıtı</div>
                    ${/json/i.test(s.p.INFO_FORMAT || "") && (s.p.VERSION || "").startsWith("1.3") ? `<div class="not-kutusu uyari small">JSON istediniz ama HTML geldi: TKGM, WMS 1.3.0 GetFeatureInfo'da INFO_FORMAT'ı yok sayar. JSON için VERSION=1.1.1 kullanın.</div>` : ""}
                    <p class="small">INFO_FORMAT=text/html insanlara gösterilmek üzere hazırlanmış bir tablo döndürür. Program içinde kullanmak için application/json daha uygundur. Güvenlik için betikleri kapalı bir çerçevede gösteriliyor:</p>
                    <iframe class="html-onizleme" sandbox="" srcdoc="${htmlKacis(s.metin)}"></iframe></div>`;
            }
            return `<div class="ozet-blok"><div class="ozet-baslik">Yanıt alındı</div><p class="small mb-0">Ayrıntılar için "Ham yanıt" sekmesine bakın.</p></div>`;
        }

        bosGoruntuUyarisi(s) {
            const katman = s.p.LAYERS || "";
            const bilgi = KATMANLAR[katman];
            if (bilgi && !bilgi.veriVar) {
                return `<div class="not-kutusu uyari mt-2"><i class="fa-solid fa-circle-info"></i> <b>${htmlKacis(katman)}</b> demo hesabın yetkisi dışında. Sunucu hata vermez, boş (saydam) bir görüntü döndürür. Bu, OGC servislerinde yetkinin nasıl uygulandığını gösterir: "erişim yok" yerine "veri yok".</div>`;
            }
            return "";
        }

        hataHtml(s) {
            const h = s.hata;
            return `<div class="ozet-blok hata-blok">
                <div class="ozet-baslik text-danger"><i class="fa-solid fa-triangle-exclamation"></i> ${htmlKacis(h.baslik)}</div>
                <p class="small">${htmlKacis(h.aciklama)}</p>
                <div class="not-kutusu basari small"><b>Nasıl düzeltilir?</b> ${htmlKacis(h.cozum)}</div>
                ${h.tkgmMesaji ? `<div class="small mt-2"><span class="text-muted">TKGM'nin mesajı:</span> <code>${htmlKacis(h.tkgmMesaji)}</code></div>` : ""}
                ${h.hataKodu ? `<div class="small"><span class="text-muted">TKGM hata kodu:</span> <code>${htmlKacis(h.hataKodu)}</code> <span class="text-muted">— TKGM'ye bildirirken bu kodu verin.</span></div>` : ""}
                <div class="small text-muted mt-2">Not: TKGM hatayı HTTP ${s.durum} ve <code>ows:ExceptionReport</code> XML belgesiyle bildirir. İstemci kodunuz yalnızca durum koduna değil, gövdedeki ExceptionReport'a da bakmalıdır.</div>
            </div>`;
        }

        wmsYetenekHtml(xml) {
            const yanitSurumu = xml.documentElement.getAttribute("version");
            const istenen = OwsLab.parametreAl(this.parametreler, "VERSION");
            const katmanlar = Array.from(xml.getElementsByTagName("Layer")).filter(l => l.querySelector(":scope > Name"));
            const satirlar = katmanlar.map(l => {
                const ad = l.querySelector(":scope > Name").textContent;
                const sorgulanabilir = l.getAttribute("queryable") === "1";
                const stiller = Array.from(l.querySelectorAll(":scope > Style > Name")).map(n => n.textContent);
                const bilgi = KATMANLAR[ad];
                return `<tr>
                    <td><code>${htmlKacis(ad)}</code>${bilgi ? `<div class="small text-muted">${htmlKacis(bilgi.not)}</div>` : ""}</td>
                    <td class="text-center">${sorgulanabilir ? '<i class="fa-solid fa-check text-success" title="GetFeatureInfo desteklenir"></i>' : "—"}</td>
                    <td class="small">${stiller.map(st => `<code>${htmlKacis(st)}</code>`).join(" ") || "—"}</td>
                    <td class="text-nowrap">
                        <button class="btn btn-xs btn-outline-primary" data-yukle="${htmlKacis(`${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${ad}&STYLES=&SRS=EPSG:4326&BBOX=${TKGM.ornekBbox}&WIDTH=800&HEIGHT=640&FORMAT=image/png&TRANSPARENT=true`)}">GetMap</button>
                        <button class="btn btn-xs btn-outline-secondary" data-yukle="${htmlKacis(`${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=${ad}&FORMAT=image/png`)}">Lejant</button>
                    </td></tr>`;
            }).join("");
            const getMapFormatlari = Array.from(xml.querySelectorAll("GetMap > Format")).map(f => f.textContent);
            const gfiFormatlari = Array.from(xml.querySelectorAll("GetFeatureInfo > Format")).map(f => f.textContent);
            const srsSayisi = new Set(Array.from(xml.getElementsByTagName("SRS")).concat(Array.from(xml.getElementsByTagName("CRS"))).map(s => s.textContent)).size;
            const baslik = xml.querySelector("Service > Title")?.textContent || "";
            return `<div class="ozet-blok">
                <div class="ozet-baslik"><i class="fa-solid fa-id-card"></i> ${htmlKacis(baslik)} <span class="badge text-bg-light">sürüm ${htmlKacis(yanitSurumu)}</span></div>
                ${istenen && istenen !== yanitSurumu ? `<div class="not-kutusu uyari small mb-2">VERSION=${htmlKacis(istenen)} istediniz ama sunucu ${htmlKacis(yanitSurumu)} belgesi döndürdü. Sunucunun desteklediği sürümü her zaman Capabilities yanıtındaki <code>version</code> niteliğinden okuyun.</div>` : ""}
                <h6 class="ozet-alt-baslik">Katmanlar (${katmanlar.length})</h6>
                <div class="table-responsive"><table class="table table-sm ozet-tablo"><thead><tr><th>Name</th><th title="queryable">Sorgu</th><th>Stiller</th><th></th></tr></thead><tbody>${satirlar}</tbody></table></div>
                <div class="row g-2 small">
                    <div class="col-sm-6"><b>GetMap formatları:</b> ${getMapFormatlari.length} adet<br><span class="text-muted">${getMapFormatlari.slice(0, 8).map(htmlKacis).join(", ")}…</span></div>
                    <div class="col-sm-6"><b>Koordinat sistemleri:</b> ${srsSayisi} adet ilan ediliyor<br><span class="text-muted">Uygulamada EPSG:4326 ve EPSG:3857 yeterlidir.</span></div>
                    <div class="col-12"><b>GetFeatureInfo formatları:</b> <span class="text-muted">${gfiFormatlari.map(htmlKacis).join(", ")}</span><br><span class="text-muted">Dikkat: ilan edilenlerden yalnızca <code>application/json</code> ve <code>text/html</code> demo hesapta çalışır.</span></div>
                </div></div>`;
        }

        wfsYetenekHtml(xml) {
            const turler = Array.from(xml.getElementsByTagName("FeatureType"));
            const satirlar = turler.map(t => {
                const ad = t.querySelector("Name").textContent;
                const bbox = t.querySelector("LatLongBoundingBox");
                const bilgi = KATMANLAR[ad];
                return `<tr>
                    <td><code>${htmlKacis(ad)}</code>${bilgi ? `<div class="small text-muted">${htmlKacis(bilgi.not)}</div>` : ""}</td>
                    <td class="small text-muted">${bbox ? `${bbox.getAttribute("minx")}, ${bbox.getAttribute("miny")} → ${bbox.getAttribute("maxx")}, ${bbox.getAttribute("maxy")}` : ""}</td>
                    <td class="text-nowrap">
                        <button class="btn btn-xs btn-outline-primary" data-yukle="${htmlKacis(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=DescribeFeatureType&TYPENAME=${ad}`)}">Şema</button>
                        <button class="btn btn-xs btn-outline-secondary" data-yukle="${htmlKacis(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=${ad}&MAXFEATURES=10`)}">10 kayıt</button>
                    </td></tr>`;
            }).join("");
            const filtreBolumu = xml.getElementsByTagNameNS("*", "Filter_Capabilities")[0];
            const mekansal = filtreBolumu ? Array.from(filtreBolumu.getElementsByTagNameNS("*", "Spatial_Operators")[0]?.children || []).map(c => c.localName) : [];
            const karsilastirma = filtreBolumu ? Array.from(filtreBolumu.getElementsByTagNameNS("*", "Comparison_Operators")[0]?.children || []).map(c => c.localName) : [];
            const formatlar = Array.from(xml.getElementsByTagName("ResultFormat")[0]?.children || []).map(c => c.localName);
            const acik = new Set(["GML2", "GML3", "KML"]);
            return `<div class="ozet-blok">
                <div class="ozet-baslik"><i class="fa-solid fa-id-card"></i> TKGM WFS <span class="badge text-bg-light">sürüm ${htmlKacis(xml.documentElement.getAttribute("version"))}</span></div>
                <h6 class="ozet-alt-baslik">Feature type'lar (${turler.length})</h6>
                <div class="table-responsive"><table class="table table-sm ozet-tablo"><thead><tr><th>Name</th><th>LatLongBoundingBox</th><th></th></tr></thead><tbody>${satirlar}</tbody></table></div>
                <div class="small"><b>Çıktı formatları:</b> ${formatlar.map(f => `<span class="format-cip ${acik.has(f) ? "acik" : "kapali"}" title="${acik.has(f) ? "Demo hesapta çalışır" : "İlan ediliyor ama demo hesapta hata verir"}">${f}</span>`).join(" ")}</div>
                <div class="small mt-2"><b>Mekânsal operatörler:</b> ${mekansal.map(m => `<code>${m}</code>`).join(" ")}</div>
                <div class="small mt-1"><b>Karşılaştırma:</b> ${karsilastirma.map(m => `<code>${m}</code>`).join(" ")}</div>
                <div class="not-kutusu bilgi small mt-2">Capabilities belgesi "sunucunun yapabildiklerini" listeler, "sizin yapmanıza izin verilenleri" değil. Kırmızı formatlar ilan edildiği halde demo hesapta kapalıdır.</div>
            </div>`;
        }

        semaHtml(s) {
            const elemanlar = Array.from(s.xml.getElementsByTagNameNS("*", "element")).filter(e => e.closest && e.parentElement.localName === "sequence");
            const katman = s.p.TYPENAME || "";
            const satirlar = elemanlar.map(e => {
                const ad = e.getAttribute("name");
                const tip = (e.getAttribute("type") || "").replace(/^xsd:/, "").replace(/^gml:/, "gml:");
                const metinMi = tip === "string";
                const ornekFiltre = ad === "geom" ? null : (metinMi ? `${ad}='değer'` : `${ad}=0`);
                return `<tr>
                    <td><code>${htmlKacis(ad)}</code></td>
                    <td><span class="tip-cip tip-${tip.includes("gml") ? "geo" : metinMi ? "metin" : "sayi"}">${htmlKacis(tip)}</span></td>
                    <td class="small">${htmlKacis(SUTUNLAR[ad] || "")}</td>
                    <td>${ornekFiltre ? `<button class="btn btn-xs btn-outline-primary" data-filtre-sutun="${htmlKacis(ad)}" data-filtre-metin="${metinMi}" title="Bu sütunla bir GetFeature filtresi hazırla"><i class="fa-solid fa-filter"></i></button>` : ""}</td>
                </tr>`;
            }).join("");
            return `<div class="ozet-blok">
                <div class="ozet-baslik"><i class="fa-solid fa-table-columns"></i> ${htmlKacis(katman)} şeması — ${elemanlar.length} sütun</div>
                <p class="small">Sütun tipleri filtre yazımını belirler: <span class="tip-cip tip-metin">string</span> değerler tırnak içinde (<code>adano='983'</code>), <span class="tip-cip tip-sayi">sayı</span> değerler tırnaksız (<code>tapualan&gt;1000</code>) yazılır.</p>
                <div class="table-responsive"><table class="table table-sm ozet-tablo"><thead><tr><th>Sütun</th><th>Tip</th><th>Açıklama</th><th></th></tr></thead><tbody>${satirlar}</tbody></table></div>
            </div>`;
        }

        describeLayerHtml(xml) {
            const aciklama = xml.getElementsByTagName("LayerDescription")[0];
            const ad = aciklama?.getAttribute("name") || "";
            const sorgu = xml.getElementsByTagName("Query")[0]?.getAttribute("typeName") || ad;
            return `<div class="ozet-blok">
                <div class="ozet-baslik"><i class="fa-solid fa-link"></i> WMS katmanı ↔ WFS karşılığı</div>
                <p class="small">DescribeLayer, bir WMS katmanının arkasındaki vektör veriye hangi WFS adresi ve feature type ile ulaşılacağını söyler:</p>
                <table class="table table-sm ozet-tablo"><tbody>
                    <tr><th>WMS katmanı</th><td><code>${htmlKacis(ad)}</code></td></tr>
                    <tr><th>owsType</th><td><code>${htmlKacis(aciklama?.getAttribute("owsType") || "")}</code></td></tr>
                    <tr><th>owsURL</th><td><code>${htmlKacis(aciklama?.getAttribute("owsURL") || "")}</code></td></tr>
                    <tr><th>typeName</th><td><code>${htmlKacis(sorgu)}</code></td></tr>
                </tbody></table>
                <button class="btn btn-sm btn-outline-primary" data-yukle="${htmlKacis(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=DescribeFeatureType&TYPENAME=${sorgu}`)}">WFS şemasına geç</button>
            </div>`;
        }

        sldHtml(xml) {
            const stiller = Array.from(xml.getElementsByTagNameNS("*", "UserStyle")).map(st => {
                const ad = st.getElementsByTagNameNS("*", "Name")[0]?.textContent || "";
                const kurallar = Array.from(st.getElementsByTagNameNS("*", "Rule")).map(r => r.getElementsByTagNameNS("*", "Name")[0]?.textContent || "(adsız)");
                const filtreli = st.getElementsByTagNameNS("*", "Filter").length;
                return `<tr><td><code>${htmlKacis(ad)}</code></td><td class="small">${kurallar.length} kural${filtreli ? `, ${filtreli} filtre` : ""}<div class="text-muted">${kurallar.slice(0, 4).map(htmlKacis).join(" · ")}${kurallar.length > 4 ? " …" : ""}</div></td>
                    <td><button class="btn btn-xs btn-outline-primary" data-yukle="${htmlKacis(`${W}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=TKGM:parseller&STYLES=${ad}&SRS=EPSG:4326&BBOX=${TKGM.ornekBbox}&WIDTH=800&HEIGHT=640&FORMAT=image/png&TRANSPARENT=true`)}">Bu stille çiz</button></td></tr>`;
            }).join("");
            return `<div class="ozet-blok">
                <div class="ozet-baslik"><i class="fa-solid fa-palette"></i> SLD stil belgesi</div>
                <p class="small">Her <code>UserStyle</code> bir STYLES değeridir. Kurallar (<code>Rule</code>) ölçeğe (<code>MaxScaleDenominator</code>) ve filtrelere göre farklı renkler uygular; lejanttaki satırlar bu kurallardır.</p>
                <div class="table-responsive"><table class="table table-sm ozet-tablo"><thead><tr><th>Stil</th><th>Kurallar</th><th></th></tr></thead><tbody>${stiller}</tbody></table></div>
            </div>`;
        }

        nesneOzetiHtml(s) {
            const sayi = s.geojson.features.length;
            const katman = s.p.TYPENAME || s.p.QUERY_LAYERS || "";
            const notlar = [];
            const request = (s.p.REQUEST || "").toLowerCase();

            if (sayi === 0) {
                const bilgi = KATMANLAR[katman];
                notlar.push(bilgi && !bilgi.veriVar
                    ? `<div class="not-kutusu uyari"><b>0 kayıt — ama hata yok.</b> ${htmlKacis(katman)} demo hesabın yetkisi dışında. Sunucu yetkisiz veriyi hata yerine <em>boş FeatureCollection</em> ile gizler. Gerçek projelerde "veri yok" ile "yetki yok" arasındaki bu farkı kullanıcıya doğru anlatmak gerekir.</div>`
                    : request === "getfeatureinfo"
                        ? `<div class="not-kutusu bilgi">Tıkladığınız pikselde bu katmana ait nesne yok. Bir parselin içine tıklayın.</div>`
                        : `<div class="not-kutusu bilgi">Filtreye uyan kayıt yok. Metin değerleri tırnak içinde mi? Doğru sütun adını mı kullandınız?</div>`);
            }
            if (sayi >= TKGM.kayitSiniri) {
                notlar.push(`<div class="not-kutusu uyari"><b>Tam ${TKGM.kayitSiniri} kayıt döndü.</b> Bu, TKGM'nin tek istekte verdiği üst sınırdır; gerçek sonuç daha fazla olabilir. Filtreyi daraltın veya alanı küçültün.</div>`);
            }
            if (/parseller/.test(katman) && sayi > 0) {
                const durumlar = new Set(s.geojson.features.map(f => f.properties.durum).filter(Boolean));
                if (durumlar.size > 1) {
                    notlar.push(`<div class="not-kutusu bilgi">Sonuçta birden fazla <code>durum</code> değeri var (${[...durumlar].join(", ")}). Aynı parselin eski ve güncel kayıtları birlikte gelir; yalnızca güncel parseller için filtreye <code>durum=3</code> ekleyin.</div>`);
                }
            }
            if (s.tur === "json" && /html/.test(s.icerikTipi)) {
                notlar.push(`<div class="not-kutusu uyari small">Gövde JSON olduğu halde TKGM <code>Content-Type: ${htmlKacis(s.icerikTipi)}</code> başlığı gönderdi. İstemci kodunuzda içerik tipine değil, istediğiniz INFO_FORMAT'a güvenin (ör. <code>JSON.parse(await yanit.text())</code>).</div>`);
            }
            if (request === "getfeatureinfo" && sayi > 0) {
                notlar.push(`<div class="not-kutusu bilgi small">GetFeatureInfo yanıtında geometri yoktur, yalnızca öznitelikler gelir. Geometri gerekiyorsa aynı kaydı WFS GetFeature ile isteyin.</div>`);
            }
            if (/kml/i.test(s.p.OUTPUTFORMAT || "")) {
                notlar.push(`<div class="not-kutusu bilgi small">KML yanıtı Google Earth'te doğrudan açılabilir. Öznitelikler <code>ExtendedData/SimpleData</code> içinde gelir.</div>`);
            }

            const ilk = s.geojson.features[0];
            const ilkTablo = ilk ? `<h6 class="ozet-alt-baslik">İlk kayıt</h6>
                <div class="table-responsive"><table class="table table-sm ozet-tablo dikey"><tbody>${Object.entries(ilk.properties).map(([k, v]) =>
                    `<tr><th><code>${htmlKacis(k)}</code></th><td>${htmlKacis(v ?? "null")}${SUTUNLAR[k] ? `<div class="small text-muted">${htmlKacis(SUTUNLAR[k])}</div>` : ""}</td></tr>`).join("")}</tbody></table></div>` : "";

            return `<div class="ozet-blok">
                <div class="ozet-baslik"><i class="fa-solid fa-shapes"></i> ${sayi} nesne${katman ? ` · <code>${htmlKacis(katman)}</code>` : ""}</div>
                ${s.xml && s.tur === "xml" && sayi > 0 ? `<p class="small text-muted mb-2">Yanıt ${s.xml.documentElement.localName === "kml" ? "KML" : "GML"} olarak geldi; laboratuvar bunu tarayıcıda GeoJSON'a çevirip haritaya çizdi.</p>` : ""}
                ${notlar.join("")}
                ${ilkTablo}
            </div>`;
        }

        ozetOlaylariniBagla() {
            const panel = this.sec("panel-ozet");
            panel.querySelectorAll("[data-yukle]").forEach(d => d.addEventListener("click", () => this.yukle(d.dataset.yukle)));
            panel.querySelectorAll("[data-filtre-sutun]").forEach(d => d.addEventListener("click", () => {
                const sutun = d.dataset.filtreSutun;
                const ornekDeger = { adano: "983", parselno: "2", tapumahalleref: "126978", durum: "3" }[sutun];
                const deger = d.dataset.filtreMetin === "true" ? `'${ornekDeger || "değer"}'` : (ornekDeger || "0");
                const katman = this.sonSonuc?.p.TYPENAME || "TKGM:parseller";
                this.yukle(`${F}SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=${katman}&MAXFEATURES=50&CQL_FILTER=${sutun}=${deger}`, { calistir: false });
                OwsLab.bildir(`<b>${sutun}</b> ile bir filtre hazırlandı. Değeri düzenleyip "Gönder"e basın.`);
            }));
        }

        hamPaneliniCiz(s) {
            const panel = this.sec("panel-ham");
            if (s.tur === "resim" || s.tur === "pdf") {
                panel.innerHTML = `<p class="small text-muted p-2 mb-0">İkili (binary) yanıt: ${OwsLab.boyutYaz(s.boyut)} ${htmlKacis(s.icerikTipi)}. Metin olarak gösterilemez.</p>`;
                return;
            }
            let metin = s.metin || "";
            let kesildi = false;
            if (s.tur === "xml" || s.hata) {
                const sonuc = OwsLab.xmlGirintile(metin);
                metin = sonuc.metin;
                kesildi = sonuc.kesildi;
            } else if (s.tur === "json") {
                metin = JSON.stringify(s.json, null, 2);
            }
            panel.innerHTML = `${kesildi ? `<div class="small text-muted px-2 pt-2">Yanıt çok büyük; ilk ${OwsLab.boyutYaz(metin.length)} gösteriliyor.</div>` : ""}<pre class="kod-blok ham">${s.tur === "xml" || s.hata ? OwsLab.xmlVurgula(metin) : htmlKacis(metin)}</pre>`;
        }

        tabloPaneliniCiz(s) {
            const panel = this.sec("panel-tablo");
            const sekme = this.kok.querySelector("[data-sekme='tablo']");
            if (!s.geojson || s.geojson.features.length === 0) {
                panel.innerHTML = `<p class="small text-muted p-2 mb-0">Tablo yalnızca nesne (feature) döndüren yanıtlarda dolar: WFS GetFeature ve GetFeatureInfo.</p>`;
                if (sekme) sekme.querySelector(".sekme-sayi").textContent = "";
                return;
            }
            const tumSutunlar = [...new Set(s.geojson.features.flatMap(f => Object.keys(f.properties)))];
            const sutunlar = [...ONCELIKLI_SUTUNLAR.filter(c => tumSutunlar.includes(c)), ...tumSutunlar.filter(c => !ONCELIKLI_SUTUNLAR.includes(c))].slice(0, 10);
            const gosterilen = s.geojson.features.slice(0, 300);
            panel.innerHTML = `<div class="table-responsive tablo-kaydirma"><table class="table table-sm table-hover ozet-tablo nesne-tablosu">
                <thead><tr>${sutunlar.map(c => `<th>${htmlKacis(c)}</th>`).join("")}</tr></thead>
                <tbody>${gosterilen.map(f => `<tr data-kimlik="${htmlKacis(f.id)}">${sutunlar.map(c => `<td>${htmlKacis(f.properties[c] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>
            </table></div>
            ${s.geojson.features.length > gosterilen.length ? `<div class="small text-muted p-2">İlk ${gosterilen.length} kayıt gösteriliyor.</div>` : ""}
            ${tumSutunlar.length > sutunlar.length ? `<div class="small text-muted px-2 pb-2">${tumSutunlar.length - sutunlar.length} sütun daha var. PROPERTYNAME ile yalnızca ihtiyacınız olanları isteyin.</div>` : ""}`;
            panel.querySelectorAll("tr[data-kimlik]").forEach(tr => tr.addEventListener("click", () => this.nesneSec(tr.dataset.kimlik)));
            if (sekme) sekme.querySelector(".sekme-sayi").textContent = s.geojson.features.length;
        }

        kodPaneliniCiz() {
            const panel = this.sec("panel-kod");
            const adres = this.kodlanmisAdres();
            panel.innerHTML = `
                <div class="kod-dilleri">${OwsLab.KOD_DILLERI.map(d => `<button type="button" class="kod-dili ${d.kod === this.secilenKodDili ? "aktif" : ""}" data-eylem="kodDili" data-dil="${d.kod}">${d.ad}</button>`).join("")}
                    <button type="button" class="btn btn-sm btn-outline-secondary ms-auto" data-eylem="kodKopyala"><i class="fa-regular fa-copy"></i> Kopyala</button></div>
                <pre class="kod-blok"><code>${htmlKacis(OwsLab.kodUret(adres, this.secilenKodDili))}</code></pre>`;
        }

        async kodKopyala() {
            const metin = OwsLab.kodUret(this.kodlanmisAdres(), this.secilenKodDili);
            if (await OwsLab.panoyaKopyala(metin)) {
                OwsLab.bildir("Kod panoya kopyalandı.");
                OwsLab.gorevTamamla("kod-kopyala");
            }
        }

        sekmeSec(sekme) {
            this.kok.querySelectorAll("[data-eylem='sekme']").forEach(d => d.classList.toggle("aktif", d.dataset.sekme === sekme));
            ["parametre", "ozet", "ham", "tablo", "kod"].forEach(ad => this.sec(`panel-${ad}`).classList.toggle("d-none", ad !== sekme));
            if (sekme === "kod") this.kodPaneliniCiz();
        }
    }

    function baslat() {
        document.querySelectorAll("[data-laboratuvar]").forEach(kok => ornekler.push(new LaboratuvarOrnegi(kok)));

        // Ders metnindeki [data-istek] düğmeleri sayfadaki ilk laboratuvara istek yükler
        document.addEventListener("click", e => {
            const dugme = e.target.closest("[data-istek]");
            if (!dugme || !ornekler.length) return;
            e.preventDefault();
            const lab = ornekler[0];
            if (dugme.dataset.istek === "gfi") {
                lab.gfiSablonunuKur(dugme.dataset.katman || "TKGM:parseller");
                OwsLab.bildir("GetFeatureInfo isteği hazır. Haritada bir noktaya tıklayın.");
                return;
            }
            lab.yukle(dugme.dataset.istek, { calistir: dugme.dataset.calistir !== "false" });
        });
    }

    document.addEventListener("DOMContentLoaded", baslat);

    return { ornekler, SABLONLAR };
})();
