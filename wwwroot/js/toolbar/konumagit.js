// --- KONUMA GIT ---

// WGS84 (EPSG:4326) -> Leaflet varsayılan
document.getElementById("btnGotoCografi").addEventListener("click", function () {
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

// --- KARTEZYEN KONUMA GIT ---

// ITRF96'ya dayalı 3 Derecelik TM Projeksiyonu (Merkez Meridyen 33° Doğu)
// Ankara için uygun bir projeksiyon tanımıdır.
proj4.defs("ITRF96-TM3", "+proj=tmerc +lat_0=0 +lon_0=33 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

document.getElementById("btnGotoKartezyen").addEventListener("click", function () {
    var x = parseFloat(document.getElementById("goto-x").value);
    var y = parseFloat(document.getElementById("goto-y").value);

    // Anıtkabir'in ITRF96 3 Derecelik TM (Yaklaşık) Koordinatları
    // X (Doğrusal): 509170
    // Y (Kuzey): 4386820

    if (!isNaN(x) && !isNaN(y)) {
        // ITRF96 3 Derecelik TM -> WGS84 dönüşümü
        // "ITRF96-TM3" (Tanımladığımız) -> "EPSG:4326" (Leaflet varsayılanı)
        var wgs = proj4("ITRF96-TM3", "EPSG:4326", [x, y]);
        var lon = wgs[0]; // proj4 önce boylam (longitude) verir
        var lat = wgs[1]; // sonra enlem (latitude) verir

        map.setView([lat, lon], 16); // zoom seviyesi 16
    } else {
        alert("Lütfen geçerli X ve Y koordinatlarını girin!");
    }
});
