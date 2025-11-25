// --- MAP INIT ---
var map = L.map('map').setView([39.0, 35.0], 6);

// Base Layer (OpenStreetMap)
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
osm.addTo(map);

// Draw Layer Group
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Draw Control
var drawControl = new L.Control.Draw({
    edit: {featureGroup: drawnItems}
});