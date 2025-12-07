// =========================================================
// BÖLME (SPLIT) İŞLEVİ (btnSplitLayer)
// =========================================================

let splitModeActive = false;
let splitPoints = []; // Bölme noktalarını tutacak array
let splitMarkers = []; // Geçici marker'ları tutacak array
let selectedEdges = []; // Seçilen kenarları tutacak array
let tempSplitLine = null; // Geçici bölme çizgisi

document.getElementById("btnSplitLayer").addEventListener("click", function () {
    console.log("=== SPLIT BUTONU TIKLANDI ===");

    // EĞER BUTON ZATEN AKTİF İSE: Split modunu kapat
    if (this.classList.contains("active")) {
        console.log("Split modu kapatılıyor...");
        disableSplitMode();
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
        alert("Bölmek için haritada en az bir geometri bulunmalıdır.");
        console.log("Haritada geometri bulunamadı.");
        return;
    }

    // 2. Split modunu başlat
    splitModeActive = true;
    this.classList.add("active");

    // İmleci değiştir
    if (map && map._container) {
        map._container.style.cursor = 'crosshair';
    }

    console.log("Split modu aktif. Bir geometrinin kenarına tıklayarak bölme noktası ekleyin.");
    console.log("İpucu: İki farklı kenara tıklayarak geometriyi bölün.");

    // 3. Haritadaki geometrilere click event ekle
    enableSplitClickHandlers();
});

/**
 * Split modu için click handler'ları etkinleştir
 */
function enableSplitClickHandlers() {
    let layerCount = 0;
    drawnItems.eachLayer(function (layer) {
        // Sadece Polygon ve Polyline için split işlemi
        if (layer instanceof L.Polygon || (layer instanceof L.Polyline && !(layer instanceof L.Polygon))) {

            // Katmanın tıklanabilir olduğundan emin ol
            layer.options.clickable = true;

            // Click handler'ı oluştur ve layer'a kaydet
            const clickHandler = function (e) {
                console.log("Layer click event tetiklendi!");
                if (!splitModeActive) {
                    console.log("Split modu aktif değil, işlem iptal ediliyor.");
                    return;
                }

                handleSplitClick(e, layer);
            };

            // Handler'ı layer'a kaydet (sonra kaldırabilmek için)
            layer._splitClickHandler = clickHandler;

            // Click event ekle
            layer.on('click', clickHandler);

            layerCount++;
        }
    });
    console.log(`${layerCount} katmana click handler eklendi.`);
}

/**
 * Split click işlemini yönetir
 */
function handleSplitClick(e, layer) {
    console.log("handleSplitClick çağrıldı");
    L.DomEvent.stopPropagation(e); // Harita click'ini engelle

    const clickedPoint = e.latlng;
    console.log("Tıklanan nokta:", clickedPoint);

    const isPolygon = layer instanceof L.Polygon;
    const latlngs = isPolygon ? layer.getLatLngs()[0] : layer.getLatLngs();
    console.log("Geometri tipi:", isPolygon ? "Polygon" : "Polyline", "Nokta sayısı:", latlngs.length);

    // En yakın kenarı bul
    const nearestEdge = findNearestEdge(clickedPoint, latlngs);

    if (!nearestEdge) {
        console.log("Kenara yeterince yakın değilsiniz.");
        alert("Lütfen geometrinin bir kenarına daha yakın tıklayın (max 50 pixel).");
        return;
    }

    // İlk nokta mı yoksa ikinci nokta mı?
    if (splitPoints.length === 0) {
        // İlk nokta
        splitPoints.push({
            point: nearestEdge.pointOnEdge,
            edgeIndex: nearestEdge.edgeIndex,
            layer: layer
        });
        selectedEdges.push(nearestEdge.edgeIndex);

        // Marker ekle
        const marker = L.circleMarker(nearestEdge.pointOnEdge, {
            radius: 6,
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.8,
            weight: 2
        }).addTo(map);

        marker.bindTooltip("Bölme Noktası 1", { permanent: true, direction: 'top' });
        splitMarkers.push(marker);

        console.log("İlk bölme noktası eklendi. Şimdi farklı bir kenara tıklayın.");

    } else if (splitPoints.length === 1) {
        // İkinci nokta - aynı kenara tıklanmış mı kontrol et
        if (nearestEdge.edgeIndex === selectedEdges[0]) {
            alert("Aynı kenara tıklayamazsınız! Lütfen farklı bir kenar seçin.");
            console.log("Hata: Aynı kenara tıklandı.");
            return;
        }

        // Aynı geometriye mi tıklandı kontrol et
        if (layer !== splitPoints[0].layer) {
            alert("Farklı bir geometriye tıkladınız! Lütfen aynı geometrinin farklı bir kenarına tıklayın.");
            console.log("Hata: Farklı geometriye tıklandı.");
            return;
        }

        splitPoints.push({
            point: nearestEdge.pointOnEdge,
            edgeIndex: nearestEdge.edgeIndex,
            layer: layer
        });
        selectedEdges.push(nearestEdge.edgeIndex);

        // Marker ekle
        const marker = L.circleMarker(nearestEdge.pointOnEdge, {
            radius: 6,
            color: '#0000ff',
            fillColor: '#0000ff',
            fillOpacity: 0.8,
            weight: 2
        }).addTo(map);

        marker.bindTooltip("Bölme Noktası 2", { permanent: true, direction: 'top' });
        splitMarkers.push(marker);

        // Geçici bölme çizgisi çiz
        tempSplitLine = L.polyline([splitPoints[0].point, splitPoints[1].point], {
            color: '#00ff00',
            weight: 3,
            dashArray: '10, 5'
        }).addTo(map);

        console.log("İkinci bölme noktası eklendi. Geometri bölünüyor...");

        // Geometriyi böl
        setTimeout(() => {
            performSplit(layer, isPolygon, latlngs);
        }, 500);
    }
}

/**
 * Tıklanan noktaya en yakın kenarı bulur
 */
function findNearestEdge(clickPoint, latlngs) {
    let minDistance = Infinity;
    let nearestEdge = null;
    const threshold = 50; // Pixel cinsinden maksimum mesafe

    console.log("findNearestEdge çağrıldı, latlngs sayısı:", latlngs.length);

    for (let i = 0; i < latlngs.length; i++) {
        const p1 = latlngs[i];
        const p2 = latlngs[(i + 1) % latlngs.length];

        // Kenar üzerindeki en yakın noktayı manuel hesapla
        const closestPoint = getClosestPointOnSegment(clickPoint, p1, p2);

        if (closestPoint) {
            const distance = map.latLngToLayerPoint(clickPoint).distanceTo(map.latLngToLayerPoint(closestPoint));

            console.log(`Kenar ${i}: mesafe = ${distance.toFixed(2)} px`);

            if (distance < minDistance && distance < threshold) {
                minDistance = distance;
                nearestEdge = {
                    edgeIndex: i,
                    pointOnEdge: closestPoint,
                    distance: distance
                };
            }
        }
    }

    if (nearestEdge) {
        console.log("En yakın kenar bulundu:", nearestEdge.edgeIndex, "mesafe:", nearestEdge.distance.toFixed(2));
    } else {
        console.log("Hiçbir kenar threshold içinde değil (max 50px)");
    }

    return nearestEdge;
}

/**
 * Bir doğru parçası üzerindeki en yakın noktayı bulur
 */
function getClosestPointOnSegment(point, segmentStart, segmentEnd) {
    const x = point.lng;
    const y = point.lat;
    const x1 = segmentStart.lng;
    const y1 = segmentStart.lat;
    const x2 = segmentEnd.lng;
    const y2 = segmentEnd.lat;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    return L.latLng(yy, xx);
}

/**
 * Geometriyi böler
 */
function performSplit(layer, isPolygon, latlngs) {
    const point1 = splitPoints[0];
    const point2 = splitPoints[1];

    console.log("performSplit çağrıldı");
    console.log("Point1 edgeIndex:", point1.edgeIndex);
    console.log("Point2 edgeIndex:", point2.edgeIndex);

    // Hangi nokta daha önce geliyor?
    let firstPoint, secondPoint, idx1, idx2;

    if (point1.edgeIndex < point2.edgeIndex) {
        firstPoint = point1;
        secondPoint = point2;
        idx1 = point1.edgeIndex;
        idx2 = point2.edgeIndex;
    } else {
        firstPoint = point2;
        secondPoint = point1;
        idx1 = point2.edgeIndex;
        idx2 = point1.edgeIndex;
    }

    console.log("Sıralanmış indeksler - idx1:", idx1, "idx2:", idx2);

    // Yeni geometrileri oluştur
    const part1Coords = [];
    const part2Coords = [];

    // Parça 1: firstPoint'ten başla, idx1+1'den idx2'ye kadar git, secondPoint ile bitir
    part1Coords.push(firstPoint.point);
    for (let i = idx1 + 1; i <= idx2; i++) {
        part1Coords.push(latlngs[i]);
    }
    part1Coords.push(secondPoint.point);

    // Parça 2: secondPoint'ten başla, idx2+1'den sona git, sonra baştan idx1'e git, firstPoint ile bitir
    part2Coords.push(secondPoint.point);
    for (let i = idx2 + 1; i < latlngs.length; i++) {
        part2Coords.push(latlngs[i]);
    }
    for (let i = 0; i <= idx1; i++) {
        part2Coords.push(latlngs[i]);
    }
    part2Coords.push(firstPoint.point);

    console.log("Part1 koordinat sayısı:", part1Coords.length);
    console.log("Part2 koordinat sayısı:", part2Coords.length);

    // Orijinal geometrinin özelliklerini al
    const originalName = (layer.feature && layer.feature.properties && layer.feature.properties.name) || "Geometri";
    const originalType = layer.feature && layer.feature.properties && layer.feature.properties.type;

    // Orijinal katmanı kaldır
    drawnItems.removeLayer(layer);

    // Yeni geometrileri oluştur
    let newLayer1, newLayer2;

    if (isPolygon) {
        // Polygon için - kapalı olmalı
        if (part1Coords.length >= 3) {
            newLayer1 = L.polygon(part1Coords, { color: 'red', fillOpacity: 0.5 });
            const measurements1 = calculateMeasurements(newLayer1);
            newLayer1.feature = {
                properties: {
                    name: `${originalName} - Parça 1`,
                    measurements: measurements1,
                    type: 'Polygon'
                }
            };
            bindPopupAndTooltip(newLayer1, measurements1, `${originalName} - Parça 1`);
            drawnItems.addLayer(newLayer1);
        }

        if (part2Coords.length >= 3) {
            newLayer2 = L.polygon(part2Coords, { color: 'blue', fillOpacity: 0.5 });
            const measurements2 = calculateMeasurements(newLayer2);
            newLayer2.feature = {
                properties: {
                    name: `${originalName} - Parça 2`,
                    measurements: measurements2,
                    type: 'Polygon'
                }
            };
            bindPopupAndTooltip(newLayer2, measurements2, `${originalName} - Parça 2`);
            drawnItems.addLayer(newLayer2);
        }
    } else {
        // Polyline için
        if (part1Coords.length >= 2) {
            newLayer1 = L.polyline(part1Coords, { color: 'red', weight: 3 });
            const measurements1 = calculateMeasurements(newLayer1);
            newLayer1.feature = {
                properties: {
                    name: `${originalName} - Parça 1`,
                    measurements: measurements1,
                    type: 'Polyline'
                }
            };
            bindPopupAndTooltip(newLayer1, measurements1, `${originalName} - Parça 1`);
            drawnItems.addLayer(newLayer1);
        }

        if (part2Coords.length >= 2) {
            newLayer2 = L.polyline(part2Coords, { color: 'blue', weight: 3 });
            const measurements2 = calculateMeasurements(newLayer2);
            newLayer2.feature = {
                properties: {
                    name: `${originalName} - Parça 2`,
                    measurements: measurements2,
                    type: 'Polyline'
                }
            };
            bindPopupAndTooltip(newLayer2, measurements2, `${originalName} - Parça 2`);
            drawnItems.addLayer(newLayer2);
        }
    }

    // Vertex marker'ları yenile
    if (typeof refreshAllVertexMarkers === 'function') {
        refreshAllVertexMarkers();
    }

    console.log(`Geometri başarıyla bölündü: ${originalName}`);
    alert(`"${originalName}" başarıyla iki parçaya bölündü!`);

    // Split modunu kapat
    disableSplitMode();
}

/**
 * Split modunu devre dışı bırakır
 */
function disableSplitMode() {
    splitModeActive = false;
    splitPoints = [];
    selectedEdges = [];

    // Geçici marker'ları temizle
    splitMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    splitMarkers = [];

    // Geçici çizgiyi temizle
    if (tempSplitLine) {
        map.removeLayer(tempSplitLine);
        tempSplitLine = null;
    }

    // Click event'lerini kaldır - sadece split için eklenenler
    drawnItems.eachLayer(function (layer) {
        if (layer._splitClickHandler) {
            layer.off('click', layer._splitClickHandler);
            delete layer._splitClickHandler;
        }
    });

    // İmleci normale döndür
    if (map && map._container) {
        map._container.style.cursor = 'grab';
    }

    // Butonu deaktif et
    document.getElementById("btnSplitLayer").classList.remove("active");

    console.log("Split modu kapatıldı.");
}
