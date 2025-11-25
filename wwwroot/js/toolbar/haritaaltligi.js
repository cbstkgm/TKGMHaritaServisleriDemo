
// -----------------------------------------------------------------

// --- HARİTA ALTLARI ---
var baseLayers = {
    "osm": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    "googleSat": L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {subdomains:['mt0','mt1','mt2','mt3']}),
    "googleHybrid": L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {subdomains:['mt0','mt1','mt2','mt3']}),
    "leafletSat": L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_sat/{z}/{x}/{y}{r}.jpg')
};

// Başlangıçta OpenStreetMap ekli
baseLayers["osm"].addTo(map);

// Radio switchler ile altlık değiştirme
document.querySelectorAll('input[name="basemap"]').forEach(function(radio) {
    radio.addEventListener("change", function() {
        // Önce mevcut altlığı kaldır
        Object.values(baseLayers).forEach(layer => map.hasLayer(layer) ? map.removeLayer(layer) : null);

        // Seçilen altlığı ekle
        var selected = this.value;
        baseLayers[selected].addTo(map);
    });
});


// --- HARİTA ETİKETLERİ ---

// Google etiket katmanı
var googleLabelLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
    subdomains:['mt0','mt1','mt2','mt3']
});

// OSM etiket katmanı
var osmLabelLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'); // Burada etiketi sadece osm base gibi alıyoruz, gerçek etiket katmanı ihtiyaca göre değişir

// Checkbox eventleri
document.getElementById("google-label").addEventListener("change", function() {
    if(this.checked) {
        googleLabelLayer.addTo(map);
    } else {
        map.removeLayer(googleLabelLayer);
    }
});

document.getElementById("osm-label").addEventListener("change", function() {
    if(this.checked) {
        osmLabelLayer.addTo(map);
    } else {
        map.removeLayer(osmLabelLayer);
    }
});

// ----------------------------------------------------------------

// --- TKGM PARSELLER (WMS) ---


var tkgmParcelsLayer = L.tileLayer.wms("https://cbsservis.tkgm.gov.tr/tkgm.ows/wms?", {
    layers: 'TKGM:parseller', // TKGM katman adı
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    attribution: "TKGM"
});
console.log("katman eklendi1");
alert("katman eklendi2");
document.getElementById("tkgm-parcels").addEventListener("change", function() {
    console.log("katman eklendi");
    if(this.checked) {
        tkgmParcelsLayer.addTo(map);
    } else {
        map.removeLayer(tkgmParcelsLayer);
    }
});

