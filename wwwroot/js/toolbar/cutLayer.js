// =========================================================
// KESME (CUT) İŞLEVİ (btnCutLayer)
// =========================================================

let cutModeActive = false;
let selectedCutLayer = null; // Kesilecek geometri
let cutLinePoints = []; // Kesme çizgisi noktaları
let cutLineLayer = null; // Geçici kesme çizgisi
let cutLineMarkers = []; // Kesme çizgisi noktalarının marker'ları
let activeInstructionCard = null; // Bilgi kartı referansı

document.getElementById("btnCutLayer").addEventListener("click", function () {
    console.log("=== CUT BUTONU TIKLANDI ===");

    // EĞER BUTON ZATEN AKTİF İSE: Cut modunu kapat
    if (this.classList.contains("active")) {
        console.log("Cut modu kapatılıyor...");
        disableCutMode();
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
    drawnItems.eachLayer(function (layer) {
        if (layer instanceof L.Polygon) {
            geometryCount++;
        }
    });

    if (geometryCount === 0) {
        alert("Kesmek için haritada en az bir polygon bulunmalıdır.");
        console.log("Haritada polygon bulunamadı.");
        return;
    }

    // 2. Cut modunu başlat
    cutModeActive = true;
    this.classList.add("active");

    // İmleci değiştir
    if (map && map._container) {
        map._container.style.cursor = 'crosshair';
    }

    console.log("Cut modu aktif. Önce kesmek istediğiniz polygon'a tıklayın.");

    // 3. Polygon'lara click handler ekle
    enableCutClickHandlers();

    // BİLGİ KARTI GÖSTER (ADIM 1)
    showInstructionCard('<i class="fa-solid fa-square-check"></i> <b>1. ADIM:</b> Lütfen kesmek istediğiniz poligonu seçin.');
});

/**
 * Cut için click handler'ları etkinleştir
 */
function enableCutClickHandlers() {
    console.log("Cut click handler'lar ekleniyor...");

    let layerCount = 0;
    drawnItems.eachLayer(function (layer) {
        // Sadece Polygon için cut işlemi
        if (layer instanceof L.Polygon) {

            layer.options.clickable = true;

            const clickHandler = function (e) {
                L.DomEvent.stopPropagation(e);

                if (!cutModeActive) return;
                if (selectedCutLayer) return; // Zaten seçilmiş

                handleCutLayerSelection(e, layer);
            };

            layer._cutClickHandler = clickHandler;
            layer.on('click', clickHandler);

            layerCount++;
        }
    });

    console.log(`${layerCount} polygon'a cut click handler eklendi.`);
}

/**
 * Polygon seçildiğinde kesme çizgisi çizmeye başla
 */
function handleCutLayerSelection(e, layer) {
    console.log("Polygon seçildi, kesme çizgisi çizmeye başlayın...");

    selectedCutLayer = layer;

    // Polygon'u vurgula
    layer.setStyle({
        color: '#e67e22',
        weight: 4,
        fillOpacity: 0.3
    });

    // Polygon click handler'larını kaldır (artık seçim yapılamaz)
    drawnItems.eachLayer(function (l) {
        if (l._cutClickHandler) {
            l.off('click', l._cutClickHandler);
        }
    });

    // Harita click handler'ı ekle (kesme çizgisi için)
    map.on('click', handleCutLineClick);
    map.on('contextmenu', finalizeCutLine);

    console.log("Kesme çizgisi çizmek için haritaya tıklayın. Sağ tıklama ile bitirin.");

    // BİLGİ KARTI GÜNCELLE (ADIM 2)
    showInstructionCard('<i class="fa-solid fa-pen-nib"></i> <b>2. ADIM:</b> Kesme çizgisini çizin. <br><small>(Nokta koymak için sol tık, bitirmek için sağ tık)</small>');
}

/**
 * Kesme çizgisi noktası ekle
 */
function handleCutLineClick(e) {
    if (!selectedCutLayer) return;

    const latlng = e.latlng;
    cutLinePoints.push(latlng);

    console.log(`Kesme çizgisi noktası eklendi: ${cutLinePoints.length}`);

    // Marker ekle
    const marker = L.circleMarker(latlng, {
        radius: 5,
        color: '#e74c3c',
        fillColor: '#e74c3c',
        fillOpacity: 1,
        weight: 2
    }).addTo(map);

    cutLineMarkers.push(marker);

    // Çizgiyi güncelle
    updateCutLine();
}

/**
 * Kesme çizgisini güncelle
 */
function updateCutLine() {
    // Eski çizgiyi kaldır
    if (cutLineLayer) {
        map.removeLayer(cutLineLayer);
    }

    // Yeni çizgi çiz
    if (cutLinePoints.length >= 2) {
        cutLineLayer = L.polyline(cutLinePoints, {
            color: '#e74c3c',
            weight: 3,
            dashArray: '10, 10'
        }).addTo(map);
    }
}

/**
 * Kesme çizgisini tamamla ve kesme işlemini gerçekleştir
 */
function finalizeCutLine(e) {
    L.DomEvent.preventDefault(e);
    L.DomEvent.stopPropagation(e);

    if (!selectedCutLayer || cutLinePoints.length < 2) {
        alert("Kesme çizgisi için en az 2 nokta gereklidir!");
        return;
    }

    console.log("Kesme çizgisi tamamlandı, kesme işlemi yapılıyor...");

    // Harita event'lerini kaldır
    map.off('click', handleCutLineClick);
    map.off('contextmenu', finalizeCutLine);

    // Kesme işlemini gerçekleştir
    performCut();
}

/**
 * Kesme işlemini gerçekleştir (Turf.js kullanarak)
 */
function performCut() {
    try {
        // Polygon'u GeoJSON'a çevir
        const polygonGeoJSON = selectedCutLayer.toGeoJSON();
        const polygonFeature = {
            type: 'Feature',
            properties: polygonGeoJSON.properties || {},
            geometry: polygonGeoJSON.geometry || polygonGeoJSON
        };

        console.log("Polygon Feature:", polygonFeature);

        // Kesme çizgisini polygon'a çevir (buffer ile)
        // Çizginin başlangıç ve bitiş noktalarını polygon sınırlarının dışına uzat
        const extendedPoints = extendCutLine(cutLinePoints, selectedCutLayer);

        // Kesme çizgisinden bir polygon oluştur (buffer kullanarak)
        const cutLineGeoJSON = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: extendedPoints.map(p => [p.lng, p.lat])
            }
        };

        console.log("Cut Line Feature:", cutLineGeoJSON);

        // Çizgiye buffer ekle (çok ince bir polygon oluştur)
        const bufferedLine = turf.buffer(cutLineGeoJSON, 0.001, { units: 'kilometers' });

        console.log("Buffered Line:", bufferedLine);

        // Polygon'dan buffer'ı çıkar (difference)
        const result = turf.difference(polygonFeature, bufferedLine);

        console.log("Cut Result:", result);

        if (!result) {
            alert("Kesme işlemi başarısız oldu. Kesme çizgisi polygon'u kesmiyor olabilir.");
            disableCutMode();
            return;
        }

        // Orijinal polygon'u kaldır
        const originalName = (selectedCutLayer.feature && selectedCutLayer.feature.properties && selectedCutLayer.feature.properties.name) || "Polygon";
        drawnItems.removeLayer(selectedCutLayer);

        // Yeni geometriyi ekle - önce Leaflet layer'ına çevir
        if (result.geometry.type === 'Polygon') {
            // Tek polygon
            const coords = result.geometry.coordinates[0].map(c => [c[1], c[0]]); // [lng, lat] -> [lat, lng]
            const newPolygon = L.polygon(coords, {
                color: 'red',
                weight: 2,
                fillOpacity: 0.5
            });

            const measurements = calculateMeasurements(newPolygon);

            newPolygon.feature = {
                properties: {
                    name: originalName + " (Kesilmiş)",
                    measurements: measurements,
                    type: 'Polygon'
                }
            };

            bindPopupAndTooltip(newPolygon, measurements, originalName + " (Kesilmiş)");
            drawnItems.addLayer(newPolygon);

        } else if (result.geometry.type === 'MultiPolygon') {
            // Birden fazla polygon
            result.geometry.coordinates.forEach((polygonCoords, index) => {
                const coords = polygonCoords[0].map(c => [c[1], c[0]]); // [lng, lat] -> [lat, lng]
                const newPolygon = L.polygon(coords, {
                    color: 'red',
                    weight: 2,
                    fillOpacity: 0.5
                });

                const measurements = calculateMeasurements(newPolygon);

                newPolygon.feature = {
                    properties: {
                        name: `${originalName} (Kesilmiş ${index + 1})`,
                        measurements: measurements,
                        type: 'Polygon'
                    }
                };

                bindPopupAndTooltip(newPolygon, measurements, `${originalName} (Kesilmiş ${index + 1})`);
                drawnItems.addLayer(newPolygon);
            });
        }

        // Vertex marker'ları yenile
        if (typeof refreshAllVertexMarkers === 'function') {
            refreshAllVertexMarkers();
        }

        console.log("Kesme işlemi tamamlandı!");
        alert("Polygon başarıyla kesildi!");

        // Cut modunu kapat
        disableCutMode();

    } catch (error) {
        console.error("Cut işlemi hatası:", error);
        alert("Kesme işlemi sırasında bir hata oluştu: " + error.message);
        disableCutMode();
    }
}

/**
 * Kesme çizgisini uzat (polygon sınırlarının dışına)
 */
function extendCutLine(points, polygon) {
    if (points.length < 2) return points;

    const bounds = polygon.getBounds();
    const padding = 0.01; // Derece cinsinden padding

    // İlk ve son noktayı al
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    // İlk noktayı geriye doğru uzat
    const firstExtended = extendPoint(points[1], firstPoint, bounds, padding);

    // Son noktayı ileriye doğru uzat
    const lastExtended = extendPoint(points[points.length - 2], lastPoint, bounds, padding);

    // Uzatılmış noktalarla yeni array oluştur
    return [firstExtended, ...points, lastExtended];
}

/**
 * Bir noktayı belirli yönde uzat
 */
function extendPoint(fromPoint, toPoint, bounds, padding) {
    const latDiff = toPoint.lat - fromPoint.lat;
    const lngDiff = toPoint.lng - fromPoint.lng;

    // Yönü normalize et
    const length = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    const normalizedLat = latDiff / length;
    const normalizedLng = lngDiff / length;

    // Bounds'un dışına çıkacak kadar uzat
    const extendDistance = Math.max(
        Math.abs(bounds.getNorth() - bounds.getSouth()),
        Math.abs(bounds.getEast() - bounds.getWest())
    ) + padding;

    return L.latLng(
        toPoint.lat + (normalizedLat * extendDistance),
        toPoint.lng + (normalizedLng * extendDistance)
    );
}

/**
 * Cut modunu devre dışı bırakır
 */
function disableCutMode() {
    cutModeActive = false;

    // Seçili katmanın stilini sıfırla
    if (selectedCutLayer) {
        selectedCutLayer.setStyle({
            color: 'red',
            weight: 2,
            fillOpacity: 0.5
        });
        selectedCutLayer = null;
    }

    // Kesme çizgisi noktalarını temizle
    cutLinePoints = [];

    // Marker'ları kaldır
    cutLineMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    cutLineMarkers = [];

    // Kesme çizgisini kaldır
    if (cutLineLayer) {
        map.removeLayer(cutLineLayer);
        cutLineLayer = null;
    }

    // Click handler'ları kaldır
    drawnItems.eachLayer(function (layer) {
        if (layer._cutClickHandler) {
            layer.off('click', layer._cutClickHandler);
            delete layer._cutClickHandler;
        }
    });

    // Harita event'lerini kaldır
    map.off('click', handleCutLineClick);
    map.off('contextmenu', finalizeCutLine);

    // İmleci normale döndür
    if (map && map._container) {
        map._container.style.cursor = 'grab';
    }

    // Butonu deaktif et
    document.getElementById("btnCutLayer").classList.remove("active");

    // Bilgi kartını kaldır
    removeInstructionCard();

    console.log("Cut modu kapatıldı.");
}

/**
 * Kullanıcıya işlem adımlarını gösteren kart oluşturur
 */
function showInstructionCard(htmlContent) {
    // Varsa eskisini kaldır
    removeInstructionCard();

    const card = document.createElement("div");
    card.className = "instruction-card";
    card.innerHTML = htmlContent;

    document.body.appendChild(card);
    activeInstructionCard = card;
}

/**
 * Bilgi kartını dom'dan siler
 */
function removeInstructionCard() {
    if (activeInstructionCard) {
        if (activeInstructionCard.parentNode) {
            activeInstructionCard.parentNode.removeChild(activeInstructionCard);
        }
        activeInstructionCard = null;
    }
}
