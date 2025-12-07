// =========================================================
// ÖLÇEKLEME (SCALE) İŞLEVİ (btnScaleLayer)
// =========================================================

let scaleModeActive = false;
let scaleHandles = []; // Ölçekleme tutamakları
let selectedScaleLayer = null; // Seçili katman
let scaleHandle = null; // Ölçekleme handle'ı
let originalCenter = null; // Orijinal merkez noktası
let originalCoords = null; // Orijinal koordinatlar
let scaleLabel = null; // Ölçek göstergesi
let isScaling = false; // Ölçekleme yapılıyor mu?

document.getElementById("btnScaleLayer").addEventListener("click", function () {
    console.log("=== SCALE BUTONU TIKLANDI ===");

    // EĞER BUTON ZATEN AKTİF İSE: Scale modunu kapat
    if (this.classList.contains("active")) {
        console.log("Scale modu kapatılıyor...");
        disableScaleMode();
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
        alert("Ölçeklemek için haritada en az bir geometri bulunmalıdır.");
        console.log("Haritada geometri bulunamadı.");
        return;
    }

    // 2. Scale modunu başlat
    scaleModeActive = true;
    this.classList.add("active");

    // İmleci değiştir
    if (map && map._container) {
        map._container.style.cursor = 'crosshair';
    }

    console.log("Scale modu aktif. Ölçeklemek istediğiniz geometriye tıklayın.");

    // 3. Geometrilere click handler ekle
    enableScaleClickHandlers();
});

/**
 * Scale için click handler'ları etkinleştir
 */
function enableScaleClickHandlers() {
    console.log("Scale click handler'lar ekleniyor...");

    let layerCount = 0;
    drawnItems.eachLayer(function (layer) {
        // Sadece Polygon ve Polyline için scale işlemi
        if (layer instanceof L.Polygon || (layer instanceof L.Polyline && !(layer instanceof L.Polygon))) {

            layer.options.clickable = true;

            const clickHandler = function (e) {
                L.DomEvent.stopPropagation(e);

                if (!scaleModeActive) return;
                if (isScaling) return; // Zaten ölçekleme yapılıyorsa yeni seçim yapma

                handleScaleLayerClick(e, layer);
            };

            layer._scaleClickHandler = clickHandler;
            layer.on('click', clickHandler);

            layerCount++;
        }
    });

    console.log(`${layerCount} katmana scale click handler eklendi.`);
}

/**
 * Geometriye tıklandığında scale handle oluştur
 */
function handleScaleLayerClick(e, layer) {
    console.log("Geometri seçildi, scale handle oluşturuluyor...");

    // Önceki handle'ı temizle
    if (scaleHandle) {
        map.removeLayer(scaleHandle);
        scaleHandle = null;
    }

    selectedScaleLayer = layer;

    // Geometrinin merkezini bul
    const center = getGeometryCenter(layer);
    originalCenter = center;

    // Orijinal koordinatları sakla
    if (layer instanceof L.Polygon) {
        originalCoords = layer.getLatLngs()[0].map(ll => L.latLng(ll.lat, ll.lng));
    } else if (layer instanceof L.Polyline) {
        originalCoords = layer.getLatLngs().map(ll => L.latLng(ll.lat, ll.lng));
    }

    // Geometriyi vurgula
    highlightScaleLayer(layer);

    // Scale handle oluştur
    scaleHandle = L.marker(center, {
        icon: L.divIcon({
            className: 'scale-handle-icon',
            iconSize: [40, 40],
            html: '<i class="fa-solid fa-expand" style="font-size: 24px; color: #e74c3c;"></i>'
        }),
        draggable: true,
        zIndexOffset: 1000
    }).addTo(map);

    scaleHandle.bindTooltip("Ölçeklemek için sürükleyin", {
        permanent: false,
        direction: 'top'
    });

    // Drag event'leri
    scaleHandle.on('dragstart', handleScaleDragStart);
    scaleHandle.on('drag', handleScaleDrag);
    scaleHandle.on('dragend', handleScaleDragEnd);

    console.log("Scale handle oluşturuldu.");
}

/**
 * Ölçekleme başlangıcı
 */
function handleScaleDragStart(e) {
    console.log("Ölçekleme başladı");
    isScaling = true;

    // Ölçek label'ı oluştur
    scaleLabel = L.tooltip({
        permanent: true,
        direction: 'right',
        className: 'scale-label-tooltip',
        offset: [15, 0]
    });
    scaleLabel.setLatLng(e.target.getLatLng());
    scaleLabel.setContent("Ölçek: 1.00x");
    scaleLabel.addTo(map);
}

/**
 * Ölçekleme sırasında
 */
function handleScaleDrag(e) {
    if (!selectedScaleLayer || !originalCenter || !originalCoords) return;

    const handlePos = e.target.getLatLng();

    // Merkez ile handle arasındaki mesafeyi hesapla
    const originalDistance = map.distance(originalCenter, originalCoords[0]);
    const currentDistance = map.distance(originalCenter, handlePos);

    // Ölçek faktörünü hesapla
    const scaleFactor = currentDistance / originalDistance;

    // Minimum ve maksimum ölçek sınırları
    const clampedScale = Math.max(0.1, Math.min(10, scaleFactor));

    // Geometriyi ölçekle
    scaleGeometry(selectedScaleLayer, originalCenter, originalCoords, clampedScale);

    // Label'ı güncelle
    if (scaleLabel) {
        scaleLabel.setLatLng(handlePos);
        scaleLabel.setContent(`Ölçek: ${clampedScale.toFixed(2)}x`);
    }
}

/**
 * Ölçekleme bitişi
 */
function handleScaleDragEnd(e) {
    console.log("Ölçekleme bitti");
    isScaling = false;

    // Label'ı kaldır
    if (scaleLabel) {
        map.removeLayer(scaleLabel);
        scaleLabel = null;
    }

    // Geometrinin stilini sıfırla
    if (selectedScaleLayer) {
        resetScaleLayerStyle(selectedScaleLayer);

        // Ölçümleri güncelle
        updateGeometryMeasurements(selectedScaleLayer);

        // Vertex marker'ları yenile
        if (typeof refreshAllVertexMarkers === 'function') {
            refreshAllVertexMarkers();
        }
    }

    // Handle'ı kaldır
    if (scaleHandle) {
        map.removeLayer(scaleHandle);
        scaleHandle = null;
    }

    // Değişkenleri sıfırla
    selectedScaleLayer = null;
    originalCenter = null;
    originalCoords = null;
}

/**
 * Geometriyi ölçekle
 */
function scaleGeometry(layer, center, originalCoords, scaleFactor) {
    const newCoords = originalCoords.map(coord => {
        // Merkeze göre göreceli pozisyon
        const latDiff = coord.lat - center.lat;
        const lngDiff = coord.lng - center.lng;

        // Ölçeklenmiş pozisyon
        return L.latLng(
            center.lat + (latDiff * scaleFactor),
            center.lng + (lngDiff * scaleFactor)
        );
    });

    // Geometriyi güncelle
    if (layer instanceof L.Polygon) {
        layer.setLatLngs([newCoords]);
    } else if (layer instanceof L.Polyline) {
        layer.setLatLngs(newCoords);
    }
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
 * Geometriyi vurgula
 */
function highlightScaleLayer(layer) {
    if (layer instanceof L.Polygon) {
        layer.setStyle({
            color: '#e74c3c',
            weight: 4,
            fillOpacity: 0.3
        });
    } else if (layer instanceof L.Polyline) {
        layer.setStyle({
            color: '#e74c3c',
            weight: 5
        });
    }
}

/**
 * Geometri stilini sıfırla
 */
function resetScaleLayerStyle(layer) {
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

        console.log(`Geometri ölçümleri güncellendi: ${geometryName}`, measurements);
    }
}

/**
 * Scale modunu devre dışı bırakır
 */
function disableScaleMode() {
    scaleModeActive = false;
    isScaling = false;

    // Handle'ı kaldır
    if (scaleHandle) {
        map.removeLayer(scaleHandle);
        scaleHandle = null;
    }

    // Label'ı kaldır
    if (scaleLabel) {
        map.removeLayer(scaleLabel);
        scaleLabel = null;
    }

    // Seçili katmanın stilini sıfırla
    if (selectedScaleLayer) {
        resetScaleLayerStyle(selectedScaleLayer);
        selectedScaleLayer = null;
    }

    // Click handler'ları kaldır
    drawnItems.eachLayer(function (layer) {
        if (layer._scaleClickHandler) {
            layer.off('click', layer._scaleClickHandler);
            delete layer._scaleClickHandler;
        }
    });

    // İmleci normale döndür
    if (map && map._container) {
        map._container.style.cursor = 'grab';
    }

    // Butonu deaktif et
    document.getElementById("btnScaleLayer").classList.remove("active");

    // Değişkenleri sıfırla
    originalCenter = null;
    originalCoords = null;

    console.log("Scale modu kapatıldı.");
}
