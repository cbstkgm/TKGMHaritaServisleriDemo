// =========================================================
// DÜZENLEME İŞLEVİ (btnEditGeometry)
// =========================================================

document.getElementById("btnEditGeometry").addEventListener("click", function () {

    // EĞER BUTON ZATEN AKTİF İSE: Düzenleme modunu durdur, değişiklikleri kaydet ve çık
    if (this.classList.contains("active")) {
        console.log("Düzenleme modu kapatılıyor, değişiklikler kaydediliyor...");

        // Tüm düzenlenen katmanlar için değişiklikleri kaydet
        drawnItems.eachLayer(function (layer) {
            if (layer.editing && layer.editing.enabled()) {
                // Düzenleme modunu kapat
                layer.editing.disable();

                // Ölçümleri yeniden hesapla ve güncelle
                if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
                    const newMeasurements = calculateMeasurements(layer);
                    const geometryName = (layer.feature && layer.feature.properties && layer.feature.properties.name) || "İsimsiz Geometri";

                    // Feature properties'i güncelle
                    if (!layer.feature) layer.feature = {};
                    if (!layer.feature.properties) layer.feature.properties = {};
                    layer.feature.properties.measurements = newMeasurements;

                    // Pop-up'ı güncelle
                    const isPolygon = (layer instanceof L.Polygon);
                    const areaText = isPolygon ? `<b>Alan:</b> ${(newMeasurements.area / 10000).toFixed(2)} ha (${(newMeasurements.area).toFixed(2)} m²)<br>` : '';
                    const lengthText = isPolygon ? `<b>Çevre:</b> ${newMeasurements.length.toFixed(2)} m` : `<b>Uzunluk:</b> ${newMeasurements.length.toFixed(2)} m`;
                    const typeText = isPolygon ? 'Poligon' : 'Çizgi';
                    const popupContent = `
                        <h3>${geometryName} (${typeText})</h3>
                        ${areaText}
                        ${lengthText}
                        <br><br>
                        <small style="color:#999;">Ölçümler yaklaşıktır.</small>
                    `;
                    layer.bindPopup(popupContent);

                    console.log(`Geometri güncellendi: ${geometryName}`, newMeasurements);
                }
            }
        });

        // Vertex marker'ları yenile (düzenlenmiş pozisyonlarla)
        refreshAllVertexMarkers();

        this.classList.remove("active");
        console.log("Düzenleme modu kapatıldı. Değişiklikler kaydedildi.");
        return;
    }

    // 1. Önceki tüm araçları ve panelleri kapat/durdur
    disableAllDrawTools();

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");


    // 2. Düzenleme Modunu Başlat (drawnItems içindeki tüm katmanlar için)

    let layersToEdit = 0;

    // drawnItems içindeki her katman için düzenleme modunu etkinleştir
    drawnItems.eachLayer(function (layer) {
        if (layer.editing) {
            // Enable editing mode - this allows dragging vertices and moving the entire geometry
            layer.editing.enable();
            layersToEdit++;
        }
    });

    if (layersToEdit > 0) {
        // Butonu görsel olarak aktif yap
        this.classList.add("active");
        console.log(`Düzenleme modu aktif. ${layersToEdit} katman düzenlenebilir.`);
        console.log("İpucu: Geometrilerin köşe noktalarını sürükleyerek şekillerini değiştirebilirsiniz.");
        console.log("Düzenlemeyi bitirmek için Edit butonuna tekrar tıklayın.");
    } else {
        console.log("Haritada düzenlenebilir katman bulunmamaktadır.");
        return;
    }
});
