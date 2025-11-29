// --- MAP INIT ---
// Haritayı başlatır ve başlangıç koordinatlarını/zoom seviyesini ayarlar
var map = L.map('map').setView([39.0, 35.0], 6);

// Base Layer (OpenStreetMap)
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
osm.addTo(map);

// Draw Layer Group
// Çizilen tüm geometrilerin tutulacağı katman grubunu oluşturur ve haritaya ekler.
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// !!! YENİ EKLENEN KISIM !!!
// Vertex Marker Layer Group (Kırık noktalarına eklenen marker/balastırları tutar)
// Bu grup, toolbar.js'deki marker'ları yönetmek ve çizim bittiğinde temizlemek için kullanılır.
var vertexMarkers = new L.LayerGroup();
map.addLayer(vertexMarkers);

// Draw Control (Çizim Kontrol Paneli)
// Draw Control (Çizim Kontrol Paneli)
var drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    // !!! Varsayılan Draw paneli butonlarını gizle !!!
    draw: {
        polygon: false, // Manuel başlattığımız için gizle
        polyline: false, // Manuel başlattığımız için gizle
        marker: false,
        rectangle: false,
        circle: false,
        circlemarker: false
    }
});

map.addControl(drawControl);

// !!! ÖNEMLİ: Draw Kontrolcüsünü Haritaya Ekleyin !!!
map.addControl(drawControl);