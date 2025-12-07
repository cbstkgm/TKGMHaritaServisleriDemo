// --- MAP INIT ---
// Haritayı başlatır ve başlangıç koordinatlarını/zoom seviyesini ayarlar
var map = L.map('map', { zoomControl: false }).setView([39.0, 35.0], 6);

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

// Draw Control (Çizim Kontrol Paneli) - Varsayılan paneli GİZLİYORUZ (Kendi toolbar'ımızı kullanıyoruz)
// drawControl değişkeni global scope'ta kalsın diye tanımlıyoruz ama haritaya eklemiyoruz.
// Eğer haritaya eklersek (map.addControl), sol üstte varsayılan kutucuklar çıkar.
var drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: {
        polygon: false,
        polyline: false,
        marker: false,
        rectangle: false,
        circle: false,
        circlemarker: false
    }
});
// map.addControl(drawControl); // BU SATIR İPTAL - Haritaya eklemiyoruz.