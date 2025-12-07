// =========================================================
// BİRLEŞTİRME (UNION) İŞLEVİ (btnUnionLayer)
// =========================================================

let unionModeActive = false;
let selectedLayers = []; // Seçilen katmanları tutacak array
let selectedLayerMarkers = []; // Seçilen katmanların marker'larını tutacak array
let unionPreviewLayer = null; // Önizleme katmanı

document.getElementById("btnUnionLayer").addEventListener("click", function () {
    console.log("=== UNION BUTONU TIKLANDI ===");

    // EĞER BUTON ZATEN AKTİF İSE: Union modunu kapat
    if (this.classList.contains("active")) {
        console.log("Union modu kapatılıyor...");
        disableUnionMode();
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
        if (layer instanceof L.Polygon || (layer instanceof L.Polyline && !(layer instanceof L.Polygon))) {
            geometryCount++;
        }
    });

    if (geometryCount < 2) {
        alert("Birleştirmek için haritada en az iki geometri bulunmalıdır.");
        console.log("Yetersiz geometri sayısı.");
        return;
    }

    // 2. Union modunu başlat
    unionModeActive = true;
    this.classList.add("active");

    // İmleci değiştir
    if (map && map._container) {
        map._container.style.cursor = 'crosshair';
    }

    console.log("Union modu aktif. Birleştirmek istediğiniz geometrilere tıklayın.");
    console.log("İpucu: Sağ tıklama ile seçimi tamamlayın.");

    // 3. Haritadaki geometrilere click event ekle
    enableUnionClickHandlers();

    // 4. Sağ tıklama ile bitirme
    enableUnionContextMenu();
});

/**
 * Union modu için click handler'ları etkinleştir
 */
function enableUnionClickHandlers() {
    let layerCount = 0;
    drawnItems.eachLayer(function (layer) {
        // Sadece Polygon ve Polyline için union işlemi
        if (layer instanceof L.Polygon || (layer instanceof L.Polyline && !(layer instanceof L.Polygon))) {

            // Katmanın tıklanabilir olduğundan emin ol
            layer.options.clickable = true;

            // Click handler'ı oluştur ve layer'a kaydet
            const clickHandler = function (e) {
                L.DomEvent.stopPropagation(e);
                console.log("Layer click event tetiklendi!");

                if (!unionModeActive) {
                    console.log("Union modu aktif değil, işlem iptal ediliyor.");
                    return;
                }

                handleUnionLayerClick(e, layer);
            };

            // Handler'ı layer'a kaydet (sonra kaldırabilmek için)
            layer._unionClickHandler = clickHandler;

            // Click event ekle
            layer.on('click', clickHandler);

            layerCount++;
        }
    });
    console.log(`${layerCount} katmana union click handler eklendi.`);
}

/**
 * Sağ tıklama menüsünü etkinleştir
 */
function enableUnionContextMenu() {
    const contextMenuHandler = function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);

        if (!unionModeActive) return;

        console.log("Sağ tıklama - seçim tamamlanıyor");

        if (selectedLayers.length < 2) {
            alert("En az iki geometri seçmelisiniz!");
            return;
        }

        // Önizleme modalını göster
        showUnionPreviewModal();
    };

    map._unionContextMenuHandler = contextMenuHandler;
    map.on('contextmenu', contextMenuHandler);
}

/**
 * Union için layer click işlemini yönetir
 */
function handleUnionLayerClick(e, layer) {
    console.log("handleUnionLayerClick çağrıldı");

    // Zaten seçili mi kontrol et
    const layerIndex = selectedLayers.indexOf(layer);

    if (layerIndex > -1) {
        // Zaten seçili, seçimi kaldır
        selectedLayers.splice(layerIndex, 1);

        // Marker'ı kaldır
        if (selectedLayerMarkers[layerIndex]) {
            map.removeLayer(selectedLayerMarkers[layerIndex]);
            selectedLayerMarkers.splice(layerIndex, 1);
        }

        // Orijinal stile dön
        resetLayerStyle(layer);

        console.log("Geometri seçimden çıkarıldı. Toplam seçili:", selectedLayers.length);
    } else {
        // Yeni seçim
        selectedLayers.push(layer);

        // Geometriyi vurgula
        highlightLayer(layer);

        // Merkez noktasına numara marker'ı ekle
        const center = getLayerCenter(layer);
        const marker = L.circleMarker(center, {
            radius: 15,
            color: '#00ff00',
            fillColor: '#00ff00',
            fillOpacity: 0.8,
            weight: 3
        }).addTo(map);

        marker.bindTooltip(`${selectedLayers.length}`, {
            permanent: true,
            direction: 'center',
            className: 'union-number-tooltip'
        });

        selectedLayerMarkers.push(marker);

        console.log("Geometri seçildi. Toplam seçili:", selectedLayers.length);
    }
}

/**
 * Layer'ı vurgula
 */
function highlightLayer(layer) {
    if (layer instanceof L.Polygon) {
        layer.setStyle({
            color: '#00ff00',
            weight: 4,
            fillOpacity: 0.3
        });
    } else if (layer instanceof L.Polyline) {
        layer.setStyle({
            color: '#00ff00',
            weight: 5
        });
    }
}

/**
 * Layer stilini sıfırla
 */
function resetLayerStyle(layer) {
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
 * Layer'ın merkez noktasını bul
 */
function getLayerCenter(layer) {
    if (layer instanceof L.Polygon) {
        const bounds = layer.getBounds();
        return bounds.getCenter();
    } else if (layer instanceof L.Polyline) {
        const latlngs = layer.getLatLngs();
        const midIndex = Math.floor(latlngs.length / 2);
        return latlngs[midIndex];
    }
    return layer.getLatLng();
}

/**
 * Union önizleme modalını göster
 */
function showUnionPreviewModal() {
    console.log("Union önizleme modalı açılıyor...");

    // Seçili geometrileri birleştir
    try {
        const unionResult = performUnion(selectedLayers);

        // performUnion artık her zaman bir sonuç döndürür (union veya FeatureCollection)

        // Önizleme katmanını oluştur
        unionPreviewLayer = L.geoJSON(unionResult, {
            style: {
                color: '#ff00ff',
                weight: 3,
                fillOpacity: 0.4
            }
        });

        // Modal HTML'i oluştur
        const modalHTML = `
            <div id="unionModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 600px;
                    width: 90%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 16px;
                        padding-bottom: 12px;
                        border-bottom: 2px solid #e0e0e0;
                    ">
                        <h2 style="margin: 0; color: #333; font-size: 24px;">
                            <i class="fa-solid fa-link" style="color: #4CAF50; margin-right: 8px;"></i>
                            Geometri Birleştirme Önizlemesi
                        </h2>
                    </div>
                    
                    <div style="margin-bottom: 20px; color: #666; font-size: 14px;">
                        <i class="fa-solid fa-info-circle" style="color: #2196F3; margin-right: 6px;"></i>
                        <strong>${selectedLayers.length}</strong> geometri birleştirilecek.
                        <br><br>
                        Haritada <span style="color: #ff00ff; font-weight: bold;">mor renkli</span> önizleme gösterilmektedir.
                        <br>
                        Birleştirme işlemini onaylıyor musunuz?
                    </div>

                    <div style="
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                    ">
                        <button id="cancelUnionBtn" style="
                            background: #f44336;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='#d32f2f';" 
                           onmouseout="this.style.background='#f44336';">
                            <i class="fa-solid fa-times"></i>
                            İptal
                        </button>
                        <button id="confirmUnionBtn" style="
                            background: #4CAF50;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='#45a049';" 
                           onmouseout="this.style.background='#4CAF50';">
                            <i class="fa-solid fa-check"></i>
                            Onayla ve Birleştir
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Modal'ı DOM'a ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Önizleme katmanını haritaya ekle
        unionPreviewLayer.addTo(map);

        // Event listener'ları ekle
        document.getElementById('cancelUnionBtn').addEventListener('click', closeUnionModal);
        document.getElementById('confirmUnionBtn').addEventListener('click', confirmUnion);

    } catch (error) {
        console.error("Union hatası:", error);
        alert("Birleştirme işlemi sırasında bir hata oluştu: " + error.message);
    }
}

/**
 * Geometrileri birleştir (Turf.js kullanarak)
 */
function performUnion(layers) {
    console.log("performUnion çağrıldı, layer sayısı:", layers.length);

    if (layers.length < 2) return null;

    try {
        // Tüm geometrileri polygon olarak kontrol et
        const allPolygons = layers.every(layer => layer instanceof L.Polygon);

        if (allPolygons) {
            // Polygon'lar için union dene
            try {
                // İlk geometriyi Feature olarak hazırla
                let geoJSON1 = layers[0].toGeoJSON();
                let unionGeometry = {
                    type: 'Feature',
                    properties: geoJSON1.properties || {},
                    geometry: geoJSON1.geometry || geoJSON1
                };
                console.log("İlk geometri (Feature):", unionGeometry);

                for (let i = 1; i < layers.length; i++) {
                    // Sonraki geometriyi Feature olarak hazırla
                    let geoJSONNext = layers[i].toGeoJSON();
                    let nextGeometry = {
                        type: 'Feature',
                        properties: geoJSONNext.properties || {},
                        geometry: geoJSONNext.geometry || geoJSONNext
                    };
                    console.log(`Geometri ${i + 1} (Feature):`, nextGeometry);

                    const result = turf.union(unionGeometry, nextGeometry);

                    if (result) {
                        unionGeometry = result;
                        console.log("Union başarılı, devam ediliyor...");
                    } else {
                        // Union başarısız, FeatureCollection oluştur
                        console.log("Union başarısız, FeatureCollection oluşturuluyor...");
                        return createFeatureCollection(layers);
                    }
                }

                console.log("Tüm union işlemleri başarılı:", unionGeometry);
                return unionGeometry;

            } catch (unionError) {
                console.log("Union hatası, FeatureCollection'a geçiliyor:", unionError);
                return createFeatureCollection(layers);
            }
        } else {
            // Karışık geometriler veya Polyline'lar için FeatureCollection oluştur
            console.log("Karışık geometriler, FeatureCollection oluşturuluyor...");
            return createFeatureCollection(layers);
        }

    } catch (error) {
        console.error("performUnion hatası:", error);
        return createFeatureCollection(layers);
    }
}

/**
 * Geometrilerden FeatureCollection oluşturur
 */
function createFeatureCollection(layers) {
    console.log("createFeatureCollection çağrıldı");

    const features = layers.map(layer => {
        const geoJSON = layer.toGeoJSON();
        console.log("Layer GeoJSON:", geoJSON);

        // Proper Feature objesi oluştur
        return {
            type: 'Feature',
            properties: geoJSON.properties || {},
            geometry: geoJSON.geometry || geoJSON
        };
    });

    const featureCollection = {
        type: "FeatureCollection",
        features: features
    };

    console.log("FeatureCollection oluşturuldu:", featureCollection);
    return featureCollection;
}

/**
 * Union modalını kapat
 */
function closeUnionModal() {
    const modal = document.getElementById('unionModal');
    if (modal) {
        modal.remove();
    }

    // Önizleme katmanını kaldır
    if (unionPreviewLayer) {
        map.removeLayer(unionPreviewLayer);
        unionPreviewLayer = null;
    }

    console.log("Union modalı kapatıldı.");
}

/**
 * Union işlemini onayla ve tamamla
 */
function confirmUnion() {
    console.log("Union onaylandı, işlem tamamlanıyor...");

    // Modalı kapat
    closeUnionModal();

    // Önizleme katmanını kaldır
    if (unionPreviewLayer) {
        map.removeLayer(unionPreviewLayer);
    }

    // Gerçek birleştirme işlemini yap
    const unionResult = performUnion(selectedLayers);

    if (!unionResult) {
        alert("Birleştirme işlemi başarısız oldu.");
        disableUnionMode();
        return;
    }

    // Seçili katmanları kaldır
    selectedLayers.forEach(layer => {
        drawnItems.removeLayer(layer);
    });

    // Yeni birleştirilmiş geometriyi ekle
    const newLayer = L.geoJSON(unionResult, {
        style: {
            color: 'purple',
            weight: 3,
            fillOpacity: 0.5
        }
    });

    // Geometri özelliklerini ayarla
    newLayer.eachLayer(function (layer) {
        const measurements = calculateMeasurements(layer);
        const geometryName = prompt("Birleştirilmiş geometriye bir ad verin:", "Birleştirilmiş Geometri");

        if (!geometryName) {
            map.removeLayer(newLayer);
            disableUnionMode();
            return;
        }

        layer.feature = layer.feature || {};
        layer.feature.properties = {
            name: geometryName,
            measurements: measurements,
            type: layer instanceof L.Polygon ? 'Polygon' : 'Polyline'
        };

        bindPopupAndTooltip(layer, measurements, geometryName);
        drawnItems.addLayer(layer);
    });

    // Vertex marker'ları yenile
    if (typeof refreshAllVertexMarkers === 'function') {
        refreshAllVertexMarkers();
    }

    console.log("Union işlemi tamamlandı!");
    alert("Geometriler başarıyla birleştirildi!");

    // Union modunu kapat
    disableUnionMode();
}

/**
 * Union modunu devre dışı bırakır
 */
function disableUnionMode() {
    unionModeActive = false;
    selectedLayers = [];

    // Seçim marker'larını temizle
    selectedLayerMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    selectedLayerMarkers = [];

    // Önizleme katmanını kaldır
    if (unionPreviewLayer) {
        map.removeLayer(unionPreviewLayer);
        unionPreviewLayer = null;
    }

    // Tüm katmanların stillerini sıfırla
    drawnItems.eachLayer(function (layer) {
        if (layer._unionClickHandler) {
            layer.off('click', layer._unionClickHandler);
            delete layer._unionClickHandler;
        }
        resetLayerStyle(layer);
    });

    // Context menu handler'ını kaldır
    if (map._unionContextMenuHandler) {
        map.off('contextmenu', map._unionContextMenuHandler);
        delete map._unionContextMenuHandler;
    }

    // İmleci normale döndür
    if (map && map._container) {
        map._container.style.cursor = 'grab';
    }

    // Butonu deaktif et
    document.getElementById("btnUnionLayer").classList.remove("active");

    console.log("Union modu kapatıldı.");
}
