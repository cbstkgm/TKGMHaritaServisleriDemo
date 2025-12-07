// =========================================================
// TAŞIMA (DRAG) İŞLEVİ (btnDragGeometry)
// =========================================================

let dragModeActive = false;
let dragHandles = []; // Taşıma tutamakları (merkez noktalar)
let currentDragLayer = null; // Şu anda taşınan katman
let dragHandle = null; // Aktif drag handle

document.getElementById("btnDragGeometry").addEventListener("click", function () {
    console.log("=== DRAG BUTONU TIKLANDI ===");

    // EĞER BUTON ZATEN AKTİF İSE: Drag modunu kapat
    if (this.classList.contains("active")) {
        console.log("Drag modu kapatılıyor...");
        disableDragMode();
        return;
    }

    // 1. Önceki tüm araçları ve panelleri kapat/durdur
    if (typeof disableAllDrawTools === 'function') {
        disableAllDrawTools();
    }

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");

    // Geometri kontrolü
    let geometryCount = 0;
    drawnItems.eachLayer(function () {
        geometryCount++;
    });

    if (geometryCount === 0) {
        alert("Taşımak için haritada en az bir geometri bulunmalıdır.");
        console.log("Haritada geometri bulunamadı.");
        return;
    }

    // 2. Drag modunu başlat
    dragModeActive = true;
    this.classList.add("active");

    // İmleci değiştir
    if (map && map._container) {
        map._container.style.cursor = 'move';
    }

    console.log("Drag modu aktif. Geometrilerin merkez noktalarına tıklayarak taşıyabilirsiniz.");

    // 3. Tüm geometrilere drag handle ekle
    createDragHandles();
});

/**
 * Tüm geometriler için drag handle'ları oluştur
 */
function createDragHandles() {
    console.log("Drag handle'lar oluşturuluyor...");

    drawnItems.eachLayer(function (layer) {
        // Her geometri tipi için merkez noktayı bul
        const center = getGeometryCenter(layer);

        if (center) {
            // Drag handle marker'ı oluştur
            const handle = L.marker(center, {
                icon: L.divIcon({
                    className: 'drag-handle-icon',
                    iconSize: [30, 30],
                    html: '<i class="fa-solid fa-arrows-up-down-left-right" style="font-size: 20px; color: #f1c40f;"></i>'
                }),
                draggable: true,
                zIndexOffset: 1000
            }).addTo(map);

            // Tooltip ekle
            handle.bindTooltip("Taşımak için sürükleyin", {
                permanent: false,
                direction: 'top'
            });

            // Layer referansını handle'a kaydet
            handle._associatedLayer = layer;

            // Drag event'leri
            handle.on('dragstart', function (e) {
                handleDragStart(e, layer);
            });

            handle.on('drag', function (e) {
                handleDrag(e, layer);
            });

            handle.on('dragend', function (e) {
                handleDragEnd(e, layer);
            });

            dragHandles.push(handle);
            console.log("Drag handle eklendi:", layer);
        }
    });

    console.log(`${dragHandles.length} drag handle oluşturuldu.`);
}

/**
 * Geometrinin merkez noktasını hesapla
 */
function getGeometryCenter(layer) {
    if (layer instanceof L.Polygon) {
        const bounds = layer.getBounds();
        return bounds.getCenter();
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        const latlngs = layer.getLatLngs();
        const midIndex = Math.floor(latlngs.length / 2);
        return latlngs[midIndex];
    } else if (layer instanceof L.Circle) {
        return layer.getLatLng();
    } else if (layer instanceof L.Marker) {
        return layer.getLatLng();
    }
    return null;
}

/**
 * Drag başlangıcı
 */
function handleDragStart(e, layer) {
    console.log("Drag başladı");
    currentDragLayer = layer;
    dragHandle = e.target;

    // Geometriyi vurgula
    if (layer instanceof L.Polygon) {
        layer.setStyle({
            color: '#f39c12',
            weight: 4,
            fillOpacity: 0.3
        });
    } else if (layer instanceof L.Polyline) {
        layer.setStyle({
            color: '#f39c12',
            weight: 5
        });
    }
}

/**
 * Drag sırasında
 */
function handleDrag(e, layer) {
    const newCenter = e.target.getLatLng();
    const oldCenter = getGeometryCenter(layer);

    if (!oldCenter) return;

    // Offset hesapla
    const latOffset = newCenter.lat - oldCenter.lat;
    const lngOffset = newCenter.lng - oldCenter.lng;

    // Geometriyi taşı
    moveGeometry(layer, latOffset, lngOffset);
}

/**
 * Drag bitişi
 */
function handleDragEnd(e, layer) {
    console.log("Drag bitti");

    // Geometrinin stilini sıfırla
    resetGeometryStyle(layer);

    // Ölçümleri güncelle
    updateGeometryMeasurements(layer);

    // Vertex marker'ları güncelle
    if (typeof refreshAllVertexMarkers === 'function') {
        refreshAllVertexMarkers();
    }

    currentDragLayer = null;
    dragHandle = null;
}

/**
 * Geometriyi belirtilen offset kadar taşı
 */
function moveGeometry(layer, latOffset, lngOffset) {
    if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0];
        const newLatLngs = latlngs.map(latlng =>
            L.latLng(latlng.lat + latOffset, latlng.lng + lngOffset)
        );
        layer.setLatLngs([newLatLngs]);

    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        const latlngs = layer.getLatLngs();
        const newLatLngs = latlngs.map(latlng =>
            L.latLng(latlng.lat + latOffset, latlng.lng + lngOffset)
        );
        layer.setLatLngs(newLatLngs);

    } else if (layer instanceof L.Circle) {
        const center = layer.getLatLng();
        layer.setLatLng(L.latLng(center.lat + latOffset, center.lng + lngOffset));

    } else if (layer instanceof L.Marker) {
        const pos = layer.getLatLng();
        layer.setLatLng(L.latLng(pos.lat + latOffset, pos.lng + lngOffset));
    }
}

/**
 * Geometri stilini sıfırla
 */
function resetGeometryStyle(layer) {
    if (layer instanceof L.Polygon) {
        layer.setStyle({
            color: 'red',
            weight: 2,
            fillOpacity: 0.5
        });
    } else if (layer instanceof L.Polyline) {
        layer.setStyle({
            color: 'blue',
            weight: 3
        });
    }
}

/**
 * Geometri ölçümlerini güncelle
 */
function updateGeometryMeasurements(layer) {
    if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
        const measurements = calculateMeasurements(layer);
        const geometryName = (layer.feature && layer.feature.properties && layer.feature.properties.name) || "Geometri";

        // Feature properties'i güncelle
        if (!layer.feature) layer.feature = {};
        if (!layer.feature.properties) layer.feature.properties = {};
        layer.feature.properties.measurements = measurements;

        // Pop-up'ı güncelle
        const isPolygon = (layer instanceof L.Polygon);
        const areaText = isPolygon ? `<b>Alan:</b> ${(measurements.area / 10000).toFixed(2)} ha (${(measurements.area).toFixed(2)} m²)<br>` : '';
        const lengthText = isPolygon ? `<b>Çevre:</b> ${measurements.length.toFixed(2)} m` : `<b>Uzunluk:</b> ${measurements.length.toFixed(2)} m`;
        const typeText = isPolygon ? 'Poligon' : 'Çizgi';
        const popupContent = `
            <h3>${geometryName} (${typeText})</h3>
            ${areaText}
            ${lengthText}
            <br><br>
            <small style="color:#999;">Ölçümler yaklaşıktır.</small>
        `;
        layer.bindPopup(popupContent);

        console.log(`Geometri güncellendi: ${geometryName}`, measurements);
    } else if (layer instanceof L.Circle) {
        const center = layer.getLatLng();
        const radius = layer.getRadius();
        const area = Math.PI * Math.pow(radius, 2);
        const geometryName = (layer.feature && layer.feature.properties && layer.feature.properties.name) || "Daire";

        const measurements = {
            centerLat: center.lat.toFixed(6),
            centerLng: center.lng.toFixed(6),
            radius: radius.toFixed(2),
            area: area.toFixed(2)
        };

        if (!layer.feature) layer.feature = {};
        if (!layer.feature.properties) layer.feature.properties = {};
        layer.feature.properties.measurements = measurements;

        const popupContent = `
            <h3>${geometryName} (Daire)</h3>
            <b>Yarıçap:</b> ${measurements.radius} m<br>
            <b>Alan:</b> ${(measurements.area / 10000).toFixed(2)} ha (${measurements.area} m²)<br>
            <br>
            <b>Merkez (Lat/Lng):</b> ${measurements.centerLat}, ${measurements.centerLng}
        `;
        layer.bindPopup(popupContent);

    } else if (layer instanceof L.Marker) {
        const latlng = layer.getLatLng();
        const geometryName = (layer.feature && layer.feature.properties && layer.feature.properties.name) || "Nokta";

        const measurements = {
            lat: latlng.lat.toFixed(6),
            lng: latlng.lng.toFixed(6)
        };

        if (!layer.feature) layer.feature = {};
        if (!layer.feature.properties) layer.feature.properties = {};
        layer.feature.properties.measurements = measurements;

        const popupContent = `
            <h3>${geometryName} (Nokta)</h3>
            <b>Enlem (Lat):</b> ${measurements.lat}<br>
            <b>Boylam (Lng):</b> ${measurements.lng}
        `;
        layer.bindPopup(popupContent);
    }
}

/**
 * Drag modunu devre dışı bırakır
 */
function disableDragMode() {
    dragModeActive = false;

    // Tüm drag handle'ları kaldır
    dragHandles.forEach(handle => {
        map.removeLayer(handle);
    });
    dragHandles = [];

    currentDragLayer = null;
    dragHandle = null;

    // İmleci normale döndür
    if (map && map._container) {
        map._container.style.cursor = 'grab';
    }

    // Butonu deaktif et
    document.getElementById("btnDragGeometry").classList.remove("active");

    console.log("Drag modu kapatıldı.");
}
