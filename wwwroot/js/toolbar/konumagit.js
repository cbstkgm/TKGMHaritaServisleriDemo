// --- KONUMA GIT ---

// WGS84 (EPSG:4326) -> Leaflet varsayılan
document.getElementById("btnGotoCografi").addEventListener("click", function() {
    var lat = parseFloat(document.getElementById("goto-lat").value);
    var lon = parseFloat(document.getElementById("goto-lon").value);

    if (!isNaN(lat) && !isNaN(lon)) {
        map.setView([lat, lon], 16); // zoom seviyesi 16
    } else {
        alert("Lütfen geçerli enlem ve boylam girin!");
    }
});

// Kartezyen (ITRF96) koordinatlar -> WGS84 için proj4 kullanıyoruz
// Örnek EPSG kodları: ITRF96 için EPSG:4937
// Leaflet EPSG:4326 kullanıyor, dönüşüm gerekli

// Proj tanımı (ITRF96 -> WGS84)
proj4.defs("ITRF96", "+proj=longlat +ellps=GRS80 +datum=WGS84 +no_defs");

document.getElementById("btnGotoKartezyen").addEventListener("click", function() {
    var x = parseFloat(document.getElementById("goto-x").value);
    var y = parseFloat(document.getElementById("goto-y").value);

    if (!isNaN(x) && !isNaN(y)) {
        // ITRF96 -> WGS84 dönüşümü
        var wgs = proj4("ITRF96", "EPSG:4326", [x, y]);
        var lon = wgs[0];
        var lat = wgs[1];

        map.setView([lat, lon], 16);
    } else {
        alert("Lütfen geçerli x ve y girin!");
    }
});
