// --- TOOLBAR JS (Paneller ve Çizim İşlevleri) ---

// 'map', 'drawnItems' değişkenlerinin map.js dosyasından global olarak geldiği varsayılmıştır.
// 'vertexMarkers' değişkeni de map.js'de tanımlı olmalıdır.

// Aktif çizim nesnesini (L.Draw.Polygon, L.Draw.Polyline vb.) tutacak global değişken.
let activeDrawHandler = null;


/**
 * Tüm çizim araçlarını devre dışı bırakan genel bir fonksiyon.
 * NOT: Vertex marker'ları artık temizlemiyor - kalıcı olarak kalıyorlar.
 */
function disableAllDrawTools() {
    // Tüm çizim butonlarındaki görsel aktifliği kaldır:
    document.getElementById("btnDrawPolygon").classList.remove("active");
    document.getElementById("btnDrawLine").classList.remove("active");
    document.getElementById("btnDrawPoint").classList.remove("active");
    document.getElementById("btnDrawCircle").classList.remove("active");
    document.getElementById("btnDragGeometry").classList.remove("active");
    document.getElementById("btnEditGeometry").classList.remove("active");
    document.getElementById("btnDeleteOne").classList.remove("active");
    document.getElementById("btnClearAll").classList.remove("active");
    document.getElementById("btnDrawText").classList.remove("active");
    document.getElementById("btnShowWKT").classList.remove("active");
    document.getElementById("btnSplitLayer").classList.remove("active");
    document.getElementById("btnUnionLayer").classList.remove("active");

    // YENİ: İmleci normale döndür (Taşıma/Silme modu sonrası)
    if (map && map._container) {
        map._container.style.cursor = 'grab'; // Veya varsayılan imleciniz ne ise
    }

    // REMOVED: Vertex marker'ları artık temizlemiyoruz - kalıcı olarak kalacaklar
    // Sadece çizim tamamlandığında refreshAllVertexMarkers() çağrılacak

    // Eğer bir çizim nesnesi aktifse, programatik olarak onu durdur (disable):
    if (activeDrawHandler) {
        activeDrawHandler.disable();
        activeDrawHandler = null;
    }

    // Ek: Taşıma modu aktifse, onu da durdur
    if (drawnItems) {
        drawnItems.eachLayer(function (layer) {
            // "editing" handler'ı varsa ve aktifse devre dışı bırak
            if (layer.editing && layer.editing.enabled()) {
                layer.editing.disable();
            }
        });
    }

    // Drag modunu kapat (eğer aktifse)
    if (typeof disableDragMode === 'function') {
        disableDragMode();
    }

    // YENİ: Silme modu kapatıldığında, tüm katmanlardaki geçici 'click' dinleyicilerini kaldır.
    drawnItems.eachLayer(function (layer) {
        layer.off('click');
    });
}

/**
 * Tüm çizilmiş geometriler için vertex marker'ları yeniler.
 * Bu fonksiyon çizim tamamlandığında veya geometri düzenlendiğinde çağrılır.
 */
function refreshAllVertexMarkers() {
    // Önce tüm mevcut vertex marker'ları temizle
    if (typeof vertexMarkers !== 'undefined') {
        vertexMarkers.clearLayers();
    }

    // Tüm çizilmiş geometriler için vertex marker'ları yeniden oluştur
    drawnItems.eachLayer(function (layer) {
        if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
            const isPolygon = (layer instanceof L.Polygon);
            const latlngs = isPolygon ? layer.getLatLngs()[0] : layer.getLatLngs();

            // Segment uzunluklarını göstermek için marker ekle (Sadece Polyline için)
            if (!isPolygon) {
                latlngs.forEach((latlng, index) => {
                    if (index > 0) {
                        const prevLatLng = latlngs[index - 1];
                        const segmentLength = prevLatLng.distanceTo(latlng);
                        const midPoint = L.latLng((prevLatLng.lat + latlng.lat) / 2, (prevLatLng.lng + latlng.lng) / 2);

                        L.marker(midPoint, {
                            icon: L.divIcon({
                                className: 'leaflet-segment-label',
                                iconSize: [80, 20],
                                html: `${segmentLength.toFixed(2)} m`
                            })
                        }).addTo(vertexMarkers);
                    }
                });
            }

            // Kırık nokta marker'ları (Her bir kırık nokta için)
            latlngs.forEach((latlng, index) => {
                const marker = L.marker(latlng, {
                    icon: L.divIcon({
                        className: 'leaflet-vertex-marker',
                        iconSize: [10, 10],
                        html: `<b>${index + 1}</b>`
                    })
                }).addTo(vertexMarkers);

                marker.bindTooltip(`Nokta ${index + 1}`, { permanent: false, direction: 'right' });
            });
        }
    });
}

// *** YARDIMCI FONKSİYON: ÖLÇÜM HESAPLAMA (Aynen Kalır) ***
function calculateMeasurements(layer) {
    let length = 0;
    let area = 0;

    if (layer instanceof L.Polygon) {
        if (L.GeometryUtil && L.GeometryUtil.geodesicArea) {
            area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        }

        const latlngs = layer.getLatLngs()[0];
        for (let i = 0; i < latlngs.length; i++) {
            const nextIndex = (i + 1) % latlngs.length;
            length += latlngs[i].distanceTo(latlngs[nextIndex]);
        }

    } else if (layer instanceof L.Polyline) {
        length = layer.getLatLngs().reduce((sum, current, index, array) => {
            if (index === 0) return sum;
            return sum + current.distanceTo(array[index - 1]);
        }, 0);
    }

    return { length, area };
}


// *** YARDIMCI FONKSİYON: POPUP VE MARKER EKLEME (GÜNCELLENDİ) ***
function bindPopupAndTooltip(layer, measurements, name) {
    const isPolygon = (layer instanceof L.Polygon);

    // Metinleri Hazırla
    const areaText = isPolygon ? `<b>Alan:</b> ${(measurements.area / 10000).toFixed(2)} ha (${(measurements.area).toFixed(2)} m²)<br>` : '';
    const lengthText = isPolygon ? `<b>Çevre:</b> ${measurements.length.toFixed(2)} m` : `<b>Uzunluk:</b> ${measurements.length.toFixed(2)} m`;
    const typeText = isPolygon ? 'Poligon' : 'Çizgi';

    // Pop-up içeriği (HTML)
    const popupContent = `
        <h3>${name} (${typeText})</h3>
        ${areaText}
        ${lengthText}
        <br><br>
        <small style="color:#999;">Ölçümler yaklaşıktır.</small>
    `;

    // Pop-up'ı katmana bağla (Açık kalmasını kaldırdık, kullanıcı tıklayınca açılır)
    layer.bindPopup(popupContent);

    // Marker'lar Sadece Çizim Modunda Eklenir (Bu kısım SADECE çizim bitince çalışmalı)
    // Bu fonksiyon CREATED event'i içinde çağrıldığı için çalışacaktır.
    if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
        const latlngs = isPolygon ? layer.getLatLngs()[0] : layer.getLatLngs();

        // Segment uzunluklarını göstermek için marker ekle (Sadece Polyline için)
        if (!isPolygon) {
            latlngs.forEach((latlng, index) => {
                if (index > 0) {
                    const prevLatLng = latlngs[index - 1];
                    const segmentLength = prevLatLng.distanceTo(latlng);
                    const midPoint = L.latLng((prevLatLng.lat + latlng.lat) / 2, (prevLatLng.lng + latlng.lng) / 2);

                    L.marker(midPoint, {
                        icon: L.divIcon({
                            className: 'leaflet-segment-label',
                            iconSize: [80, 20],
                            html: `${segmentLength.toFixed(2)} m`
                        })
                    }).addTo(vertexMarkers); // Eklenen markerlar vertexMarkers grubunda tutulur
                }
            });
        }

        // Kırık nokta marker'ları (Her bir kırık nokta için)
        latlngs.forEach((latlng, index) => {
            const marker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'leaflet-vertex-marker',
                    iconSize: [10, 10],
                    html: `<b>${index + 1}</b>`
                })
            }).addTo(vertexMarkers); // Eklenen markerlar vertexMarkers grubunda tutulur

            marker.bindTooltip(`Nokta ${index + 1}`, { permanent: false, direction: 'right' });
        });
    }
}


// =========================================================
// 3. POLİGON ÇİZİM İŞLEVİ (btnDrawPolygon) [GÜNCELLENDİ]
// =========================================================

document.getElementById("btnDrawPolygon").addEventListener("click", function () {

    if (this.classList.contains("active")) {
        disableAllDrawTools();
        return;
    }

    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");

    activeDrawHandler = new L.Draw.Polygon(map, {
        shapeOptions: { color: 'red', fillOpacity: 0.5 }
    });

    activeDrawHandler.enable();
    this.classList.add("active");

    map.once(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;

        const measurements = calculateMeasurements(layer);
        const geometryName = prompt("Lütfen çizilen alana bir ad verin:", "Poligon 1");

        if (!geometryName) {
            map.removeLayer(layer);
            disableAllDrawTools();
            return;
        }

        // Önemli: Geometriye ait özellikleri (adı ve ölçümleri) doğrudan Leaflet layer objesine kaydet
        layer.feature = layer.feature || {}; // GeoJSON özelliğini hazırla
        layer.feature.properties = {
            name: geometryName,
            measurements: measurements,
            type: 'Polygon'
        };

        // Pop-up'ı, marker'ları ve Tooltip'i bağla
        bindPopupAndTooltip(layer, measurements, geometryName);

        drawnItems.addLayer(layer);

        // Çizim bitti, vertex marker'ları yenile
        refreshAllVertexMarkers();

        activeDrawHandler = null;
        document.getElementById("btnDrawPolygon").classList.remove("active");
    });
});

// =========================================================
// 4. ÇİZGİ ÇİZİM İŞLEVİ (btnDrawLine) [GÜNCELLENDİ]
// =========================================================

document.getElementById("btnDrawLine").addEventListener("click", function () {

    if (this.classList.contains("active")) {
        disableAllDrawTools();
        return;
    }

    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");

    activeDrawHandler = new L.Draw.Polyline(map, {
        shapeOptions: { color: 'blue', weight: 3 }
    });

    activeDrawHandler.enable();
    this.classList.add("active");

    map.once(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;

        const measurements = calculateMeasurements(layer);
        const geometryName = prompt("Lütfen çizilen çizgiye bir ad verin:", "Çizgi 1");

        if (!geometryName) {
            map.removeLayer(layer);
            disableAllDrawTools();
            return;
        }

        // Önemli: Geometriye ait özellikleri (adı ve ölçümleri) doğrudan Leaflet layer objesine kaydet
        layer.feature = layer.feature || {}; // GeoJSON özelliğini hazırla
        layer.feature.properties = {
            name: geometryName,
            measurements: measurements,
            type: 'Polyline'
        };

        // Pop-up'ı, marker'ları ve Tooltip'i bağla
        bindPopupAndTooltip(layer, measurements, geometryName);

        drawnItems.addLayer(layer);

        // Çizim bitti, vertex marker'ları yenile
        refreshAllVertexMarkers();

        activeDrawHandler = null;
        document.getElementById("btnDrawLine").classList.remove("active");
    });
});

// ... (Diğer kodlar: activeDrawHandler, disableAllDrawTools, calculateMeasurements, bindPopupAndTooltip) ...

// =========================================================
// 5. NOKTA ÇİZİM İŞLEVİ (btnDrawPoint)
// =========================================================

document.getElementById("btnDrawPoint").addEventListener("click", function () {

    // EĞER BUTON ZATEN AKTİF İSE: Çizimi durdur ve çık
    if (this.classList.contains("active")) {
        disableAllDrawTools();
        return;
    }

    // 1. Önceki tüm araçları ve panelleri kapat
    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");


    // 2. Marker (Nokta) çizim aracını başlat ve global değişkene ata
    // NOT: Nokta çiziminde ölçüme gerek yoktur.
    activeDrawHandler = new L.Draw.Marker(map, {
        icon: L.icon({ // Noktanın stilini burada özelleştirebilirsiniz
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
        })
    });

    activeDrawHandler.enable();
    this.classList.add("active");

    // 3. Olay dinleyicileri

    map.once(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;

        // Kullanıcıdan Ad İste
        const geometryName = prompt("Lütfen noktaya bir ad verin:", "Yeni Nokta");

        if (!geometryName) {
            map.removeLayer(layer);
            disableAllDrawTools();
            return;
        }

        // Ölçüm bilgisi Point için basit kalır (Sadece koordinat)
        const latlng = layer.getLatLng();
        const measurements = {
            lat: latlng.lat.toFixed(6),
            lng: latlng.lng.toFixed(6)
        };

        // Geometriye ait özellikleri kaydet
        layer.feature = layer.feature || {};
        layer.feature.properties = {
            name: geometryName,
            measurements: measurements,
            type: 'Point'
        };

        // Pop-up'ı bağla
        // Point için özel bir pop-up içeriği oluşturalım:
        const popupContent = `
            <h3>${geometryName} (Nokta)</h3>
            <b>Enlem (Lat):</b> ${measurements.lat}<br>
            <b>Boylam (Lng):</b> ${measurements.lng}
        `;
        layer.bindPopup(popupContent);

        drawnItems.addLayer(layer);

        console.log(`Nokta Çizildi: ${geometryName}`, latlng);

        activeDrawHandler = null;
        document.getElementById("btnDrawPoint").classList.remove("active");
    });
});




// =========================================================
// 6. DAİRE ÇİZİM İŞLEVİ (btnDrawCircle)
// =========================================================

document.getElementById("btnDrawCircle").addEventListener("click", function () {

    // EĞER BUTON ZATEN AKTİF İSE: Çizimi durdur ve çık
    if (this.classList.contains("active")) {
        disableAllDrawTools();
        return;
    }

    // 1. Önceki tüm araçları ve panelleri kapat
    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");


    // 2. Circle (Daire) çizim aracını başlat ve global değişkene ata
    activeDrawHandler = new L.Draw.Circle(map, {
        shapeOptions: {
            color: '#f39c12', // Turuncu renk
            fillOpacity: 0.5
        },
        showRadius: true // Çizim sırasında yarıçapı göster
    });

    activeDrawHandler.enable();
    this.classList.add("active");

    // 3. Olay dinleyicileri

    map.once(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;

        // Kullanıcıdan Ad İste
        const geometryName = prompt("Lütfen daireye bir ad verin:", "Yeni Daire");

        if (!geometryName) {
            map.removeLayer(layer);
            disableAllDrawTools();
            return;
        }

        // Daireye Özel Ölçümler
        // Not: Leaflet.GeometryUtil dairesel alan hesaplamaz, bu yüzden manuel hesaplama yapılır.
        const radiusMeters = layer.getRadius();
        const areaSquareMeters = Math.PI * Math.pow(radiusMeters, 2);
        const centerLatLng = layer.getLatLng();

        const measurements = {
            centerLat: centerLatLng.lat.toFixed(6),
            centerLng: centerLatLng.lng.toFixed(6),
            radius: radiusMeters.toFixed(2), // Metre cinsinden
            area: areaSquareMeters.toFixed(2) // Metrekare cinsinden
        };

        // Geometriye ait özellikleri kaydet
        layer.feature = layer.feature || {};
        layer.feature.properties = {
            name: geometryName,
            measurements: measurements,
            type: 'Circle'
        };

        // Pop-up içeriği oluşturma
        const popupContent = `
            <h3>${geometryName} (Daire)</h3>
            <b>Yarıçap:</b> ${measurements.radius} m<br>
            <b>Alan:</b> ${(measurements.area / 10000).toFixed(2)} ha (${measurements.area} m²)<br>
            <br>
            <b>Merkez (Lat/Lng):</b> ${measurements.centerLat}, ${measurements.centerLng}
        `;

        layer.bindPopup(popupContent).openPopup();
        drawnItems.addLayer(layer);

        console.log(`Daire Çizildi: ${geometryName}`, measurements);

        activeDrawHandler = null;
        document.getElementById("btnDrawCircle").classList.remove("active");
    });
});

// =========================================================
// 7. TAŞIMA/SÜRÜKLEME İŞLEVİ (btnDragGeometry)
// =========================================================
// Bu fonksiyon artık dragGeometry.js dosyasında tanımlanmıştır.
// Eski editing tabanlı drag kodu kaldırıldı.

// =========================================================
// 8. TEK SİLME İŞLEVİ (btnDeleteOne) - GÜNCELLENDİ
// =========================================================

document.getElementById("btnDeleteOne").addEventListener("click", function () {

    // EĞER BUTON ZATEN AKTİF İSE: Silme modu zaten kapatıldı, çık.
    if (this.classList.contains("active")) {
        disableAllDrawTools();
        return;
    }

    // 1. Önceki tüm araçları ve panelleri kapat/durdur
    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");


    // Silme modunun başladığını görselleştir
    this.classList.add("active");
    if (map && map._container) {
        map._container.style.cursor = 'crosshair';
    }

    console.log("Tek Silme modu aktif. Silmek istediğiniz geometriye tıklayın.");

    // YENİ YAKLAŞIM: Haritadaki her katmana, sadece bir kez çalışacak 'click' dinleyicisi ekle.
    // Bu, harita tıklaması yerine geometri tıklamasını dinleyecektir.
    drawnItems.eachLayer(function (layer) {

        // Katmanların tıklanabilir olduğundan emin olun
        layer.options.clickable = true;

        // **Layer'ın kendi click olayını dinle (once - tek seferlik)**
        layer.once('click', function (e) {

            // Tıklanan katmanı bulduk (e.target)
            const clickedLayer = e.target;

            // Geometri adını al
            const geometryName = (clickedLayer.feature && clickedLayer.feature.properties.name) ? clickedLayer.feature.properties.name : "Bu geometriyi";

            // Güvenlik sorusu sor
            if (confirm(`${geometryName} silmek istediğinizden emin misiniz?`)) {
                drawnItems.removeLayer(clickedLayer);
                console.log(`Geometri silindi: ${geometryName}`);

                // Vertex marker'ları yenile (silinen geometrinin marker'ları kaldırılmalı)
                refreshAllVertexMarkers();
            }

            // İşlem bittiğinde silme modundan çık ve temizle
            disableAllDrawTools();
        });
    });
});

// =========================================================
// 9. HEPSİNİ TEMİZLEME İŞLEVİ (btnClearAll)
// =========================================================

document.getElementById("btnClearAll").addEventListener("click", function () {

    // 1. Önceki tüm araçları ve panelleri kapat/durdur
    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");

    // Güvenlik sorusu
    if (confirm("Haritadaki T.Ü.M. çizimleri (Poligonlar, Çizgiler, Noktalar vb.) silmek istediğinizden emin misiniz?")) {
        // drawnItems LayerGroup'unun içindeki tüm katmanları kaldır
        drawnItems.clearLayers();

        // Tüm vertex marker'ları temizle
        if (typeof vertexMarkers !== 'undefined') {
            vertexMarkers.clearLayers();
        }

        // Butonu görsel olarak aktif yap (kısa süreliğine)
        this.classList.add("active");
        setTimeout(() => this.classList.remove("active"), 500);

        console.log("Haritadaki tüm çizimler temizlendi.");
    }
});


// =========================================================
// 10. YAZI/ETİKET ÇİZİM İŞLEVİ (btnDrawText) - GÜNCELLENMİŞ
// =========================================================

document.getElementById("btnDrawText").addEventListener("click", function () {

    // ... (Kapatma ve aktiflik kontrolleri) ...
    if (this.classList.contains("active")) {
        disableAllDrawTools();
        return;
    }
    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");

    activeDrawHandler = new L.Draw.Marker(map, {
        icon: L.divIcon({
            className: 'leaflet-text-marker-temp',
            iconSize: [25, 25],
            html: '<i class="fa fa-text-width"></i>'
        })
    });

    activeDrawHandler.enable();
    this.classList.add("active");

    map.once(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;

        const textContent = prompt("Lütfen haritaya eklenecek metni girin:", "Önemli Not");

        if (!textContent || textContent.trim() === "") {
            map.removeLayer(layer);
            disableAllDrawTools();
            return;
        }

        const geometryName = prompt("Lütfen bu yazıya bir başlık verin:", "Yazı Etiketi");


        // Yeni, kalıcı DivIcon'u oluştur
        const permanentIcon = L.divIcon({
            className: 'leaflet-text-marker',
            // iconSize'ı ayarlamazsak Leaflet otomatik olarak içeriğe göre boyutlandırmaya çalışır
            // Metin içeriği için özel iconSize vermemek daha esnektir.
            html: `<span>${textContent}</span>`
        });

        // Layer'ın eski ikonunu yeni, kalıcı metin ikonuyla değiştir
        layer.setIcon(permanentIcon);

        // ÖNEMLİ GÜNCELLEME: İkonun merkez noktasını ayarla.
        // Bu, etiket metninin tıklanan noktada görünmesini sağlar.
        // İkon boyutu içeriğe göre değişeceğinden, iconAnchor'ı dinamik olarak hesaplamak zordur.
        // Bu yüzden genellikle [0, 0] bırakıp CSS'deki text-align veya transform kullanılır.
        // Ancak daha güvenilir olması için, ikonun anchor noktasını sıfırlayalım:
        // layer.options.icon.options.iconAnchor = [0, 0]; // (Bu satır genellikle gereksizdir, ancak sorunu çözebilir)


        // Geometriye ait özellikleri kaydet
        layer.feature = layer.feature || {};
        layer.feature.properties = {
            name: geometryName,
            text: textContent,
            type: 'Text'
        };

        // Pop-up içeriğini bağla
        const popupContent = `
            <h3>${geometryName || 'Yazı Etiketi'}</h3>
            <p>Metin: <b>${textContent}</b></p>
            <small>Konum: ${layer.getLatLng().lat.toFixed(6)}, ${layer.getLatLng().lng.toFixed(6)}</small>
        `;
        layer.bindPopup(popupContent);

        // Marker'ın tıklanabilirlik ayarını kontrol et (Özellikle silme/düzenleme için)
        layer.options.clickable = true;

        console.log(`Yazı Eklendi: ${geometryName}`, textContent);

        activeDrawHandler = null;
        document.getElementById("btnDrawText").classList.remove("active");
    });
});

// =========================================================
// 11. OGC PANELİ İŞLEVİ (btnOGC) & 12. KATMANLAR PANELİ (btnLayers)
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    console.log("Toolbar JS: Initializing event listeners...");

    // --- OGC BUTTON ---
    var btnOGC = document.getElementById("btnOGC");
    if (btnOGC) {
        btnOGC.addEventListener("click", function () {
            console.log("btnOGC click detected.");
            var panel = document.getElementById("right-ogc-panel");
            var isActive = this.classList.contains("active");

            // 1. Harita araçlarını sıfırla
            if (typeof disableAllDrawTools === 'function') {
                disableAllDrawTools();
            }

            // 2. Diğer panelleri kapat
            var leftPanel = document.getElementById("left-layer-panel");
            var btnLayers = document.getElementById("btnLayers");

            if (leftPanel) leftPanel.classList.remove("show");
            if (btnLayers) btnLayers.classList.remove("active");

            // 3. Kendi panelini durumuna göre aç veya kapat
            if (isActive) {
                // Zaten açıktı, kapatıyoruz
                if (panel) panel.classList.remove("show");
                this.classList.remove("active");
                console.log("OGC Panel closed.");
            } else {
                // Kapalıydı, açıyoruz
                if (panel) panel.classList.add("show");
                this.classList.add("active");
                console.log("OGC Panel opened.");
            }
        });
    } else {
        console.warn("Toolbar JS: btnOGC not found in DOM.");
    }

    // --- LAYERS BUTTON ---
    var btnLayers = document.getElementById("btnLayers");
    if (btnLayers) {
        btnLayers.addEventListener("click", function () {
            console.log("btnLayers click detected.");
            var panel = document.getElementById("left-layer-panel");
            var isActive = this.classList.contains("active");

            // 1. Harita araçlarını sıfırla
            if (typeof disableAllDrawTools === 'function') {
                disableAllDrawTools();
            }

            // 2. Diğer panelleri kapat
            var rightPanel = document.getElementById("right-ogc-panel");
            var btnOGC = document.getElementById("btnOGC");

            if (rightPanel) rightPanel.classList.remove("show");
            if (btnOGC) btnOGC.classList.remove("active");

            // 3. Kendi panelini durumuna göre aç veya kapat
            if (isActive) {
                if (panel) panel.classList.remove("show");
                this.classList.remove("active");
            } else {
                if (panel) panel.classList.add("show");
                this.classList.add("active");
            }
        });
    } else {
        console.warn("Toolbar JS: btnLayers not found in DOM.");
    }
});