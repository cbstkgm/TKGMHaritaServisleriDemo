// =========================================================
// WKT GÖSTER İŞLEVİ (btnShowWKT)
// =========================================================

document.getElementById("btnShowWKT").addEventListener("click", function () {

    // Önceki tüm araçları kapat
    if (typeof disableAllDrawTools === 'function') {
        disableAllDrawTools();
    }

    // Panelleri kapat
    document.getElementById("left-layer-panel").classList.remove("show");
    document.getElementById("btnLayers").classList.remove("active");
    document.getElementById("right-ogc-panel").classList.remove("show");
    document.getElementById("btnOGC").classList.remove("active");

    console.log("WKT Göster butonu tıklandı.");

    // Çizilmiş geometri sayısını kontrol et
    let geometryCount = 0;
    drawnItems.eachLayer(function () {
        geometryCount++;
    });

    if (geometryCount === 0) {
        alert("Haritada gösterilecek geometri bulunmamaktadır. Lütfen önce bir geometri çizin.");
        console.log("Haritada geometri bulunamadı.");
        return;
    }

    // WKT metinlerini topla
    let wktTexts = [];
    let geometryIndex = 1;

    drawnItems.eachLayer(function (layer) {
        const geometryName = (layer.feature && layer.feature.properties && layer.feature.properties.name)
            ? layer.feature.properties.name
            : `Geometri ${geometryIndex}`;

        let wkt = "";

        try {
            // Polygon için WKT
            if (layer instanceof L.Polygon) {
                const latlngs = layer.getLatLngs()[0];
                const coords = latlngs.map(latlng => `${latlng.lng.toFixed(6)} ${latlng.lat.toFixed(6)}`).join(', ');
                // Polygon WKT formatı kapalı olmalı (ilk ve son nokta aynı)
                const firstCoord = `${latlngs[0].lng.toFixed(6)} ${latlngs[0].lat.toFixed(6)}`;
                wkt = `POLYGON((${coords}, ${firstCoord}))`;
            }
            // Polyline (LineString) için WKT
            else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                const latlngs = layer.getLatLngs();
                const coords = latlngs.map(latlng => `${latlng.lng.toFixed(6)} ${latlng.lat.toFixed(6)}`).join(', ');
                wkt = `LINESTRING(${coords})`;
            }
            // Circle için WKT (Point olarak merkez + yarıçap bilgisi)
            else if (layer instanceof L.Circle) {
                const center = layer.getLatLng();
                const radius = layer.getRadius();
                wkt = `POINT(${center.lng.toFixed(6)} ${center.lat.toFixed(6)})`;
                wkt += `\n   -- Daire Merkezi, Yarıçap: ${radius.toFixed(2)} metre`;
            }
            // Marker (Point) için WKT
            else if (layer instanceof L.Marker) {
                const latlng = layer.getLatLng();
                wkt = `POINT(${latlng.lng.toFixed(6)} ${latlng.lat.toFixed(6)})`;
            }

            if (wkt) {
                wktTexts.push(`-- ${geometryName}\n${wkt}`);
                geometryIndex++;
            }
        } catch (error) {
            console.error(`WKT oluşturma hatası (${geometryName}):`, error);
            wktTexts.push(`-- ${geometryName}\n-- HATA: WKT oluşturulamadı`);
            geometryIndex++;
        }
    });

    // WKT metinlerini birleştir
    const allWKT = wktTexts.join('\n\n');

    // Modal veya alert ile göster
    showWKTModal(allWKT, geometryCount);
});

/**
 * WKT metnini modal pencerede gösterir
 */
function showWKTModal(wktText, count) {
    // Modal HTML'i oluştur
    const modalHTML = `
        <div id="wktModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 800px;
                width: 90%;
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
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
                        <i class="fa-solid fa-file-code" style="color: #4CAF50; margin-right: 8px;"></i>
                        WKT Formatı (WGS84)
                    </h2>
                    <button id="closeWKTModal" style="
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #999;
                        padding: 0;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#f0f0f0'; this.style.color='#333';" 
                       onmouseout="this.style.background='none'; this.style.color='#999';">
                        ×
                    </button>
                </div>
                
                <div style="margin-bottom: 12px; color: #666; font-size: 14px;">
                    <i class="fa-solid fa-info-circle" style="color: #2196F3; margin-right: 6px;"></i>
                    Toplam <strong>${count}</strong> geometri bulundu. Koordinatlar WGS84 (EPSG:4326) formatındadır.
                </div>

                <textarea id="wktTextArea" readonly style="
                    flex: 1;
                    width: 100%;
                    padding: 16px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    resize: none;
                    background-color: #f8f9fa;
                    color: #333;
                    line-height: 1.6;
                    overflow-y: auto;
                ">${wktText}</textarea>

                <div style="
                    display: flex;
                    gap: 12px;
                    margin-top: 16px;
                    justify-content: flex-end;
                ">
                    <button id="copyWKTBtn" style="
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
                        <i class="fa-solid fa-copy"></i>
                        Kopyala
                    </button>
                    <button id="downloadWKTBtn" style="
                        background: #2196F3;
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
                    " onmouseover="this.style.background='#1976D2';" 
                       onmouseout="this.style.background='#2196F3';">
                        <i class="fa-solid fa-download"></i>
                        İndir (.wkt)
                    </button>
                </div>
            </div>
        </div>
    `;

    // Modal'ı DOM'a ekle
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event listener'ları ekle
    document.getElementById('closeWKTModal').addEventListener('click', closeWKTModal);
    document.getElementById('wktModal').addEventListener('click', function (e) {
        if (e.target.id === 'wktModal') {
            closeWKTModal();
        }
    });

    // Kopyala butonu
    document.getElementById('copyWKTBtn').addEventListener('click', function () {
        const textarea = document.getElementById('wktTextArea');
        const fullText = textarea.value;

        // Sadece WKT verilerini al (-- ile başlayan satırları ve boş satırları çıkar)
        const wktOnly = fullText
            .split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return trimmed && !trimmed.startsWith('--');
            })
            .join('\n');

        // Panoya kopyala
        navigator.clipboard.writeText(wktOnly).then(() => {
            // Başarı mesajı
            const btn = this;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı!';
            btn.style.background = '#4CAF50';

            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);

            console.log('Sadece WKT metni panoya kopyalandı:', wktOnly);
        }).catch(err => {
            console.error('Kopyalama hatası:', err);
            alert('Kopyalama başarısız oldu.');
        });
    });

    // İndir butonu
    document.getElementById('downloadWKTBtn').addEventListener('click', function () {
        const blob = new Blob([wktText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geometries_${new Date().getTime()}.wkt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('WKT dosyası indirildi.');
    });

    // ESC tuşu ile kapat
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeWKTModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

/**
 * WKT modalını kapatır
 */
function closeWKTModal() {
    const modal = document.getElementById('wktModal');
    if (modal) {
        modal.remove();
    }
}
