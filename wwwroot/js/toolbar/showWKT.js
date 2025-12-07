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
 * WKT metnini modal pencerede gösterir (Cyberpunk Style)
 */
function showWKTModal(wktText, count) {
    // Modal HTML'i oluştur
    const modalHTML = `
        <div id="wktModal" class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <!-- Modal Container (Resizable) -->
            <div id="wktModalContainer" class="relative flex flex-col bg-cyber-dark border border-cyber-blue shadow-neon-blue rounded-lg overflow-hidden transition-all transform scale-100 resize-both overflow-auto min-w-[600px] min-h-[400px]" 
                 style="width: 80vw; height: 80vh; max-width: 95vw; max-height: 95vh;">
                
                <!-- Header -->
                <div class="flex justify-between items-center px-6 py-4 border-b border-cyber-blue/30 bg-cyber-panel/50">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                            <i class="fa-solid fa-code text-cyber-blue text-xl"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-white tracking-wider font-mono">
                                WKT DATA <span class="text-cyber-pink block text-xs tracking-[0.2em]">GEOMETRY VISUALIZER_V1.0</span>
                            </h2>
                        </div>
                    </div>
                    
                    <button id="closeWKTModal" class="group relative w-10 h-10 flex items-center justify-center rounded-full border border-gray-600 hover:border-cyber-pink hover:shadow-neon-pink transition-all duration-300">
                        <span class="text-gray-400 text-2xl group-hover:text-cyber-pink transition-colors">×</span>
                    </button>
                </div>
                
                <!-- Info Bar -->
                <div class="px-6 py-2 bg-cyber-blue/5 border-b border-cyber-blue/10 flex items-center gap-2">
                    <i class="fa-solid fa-database text-cyber-yellow text-sm"></i>
                    <span class="text-gray-300 font-mono text-sm">DETECTED OBJECTS: <span class="text-cyber-yellow font-bold">${count}</span></span>
                    <span class="text-gray-500 text-xs ml-auto font-mono">SYSTEM: WGS84 (EPSG:4326)</span>
                </div>

                <!-- Content Area -->
                <div class="flex-1 p-6 bg-cyber-black/50 overflow-hidden flex flex-col relative min-h-0">
                    <!-- Grid Background Effect -->
                    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" 
                         style="background-image: linear-gradient(#00f0ff 1px, transparent 1px), linear-gradient(90deg, #00f0ff 1px, transparent 1px); background-size: 20px 20px;">
                    </div>

                    <label class="text-cyber-blue text-xs font-bold mb-2 font-mono tracking-widest flex items-center gap-2 flex-shrink-0">
                        <span class="w-2 h-2 bg-cyber-blue rounded-full animate-pulse"></span> RAW DATA OUTPUT
                    </label>
                    
                    <textarea id="wktTextArea" readonly class="flex-1 w-full bg-white border border-cyber-blue/20 font-mono text-sm p-4 rounded focus:outline-none focus:border-cyber-blue/50 focus:shadow-neon-blue transition-all resize-none shadow-inner overflow-y-auto text-black" spellcheck="false" style="min-height: 200px;">${wktText}</textarea>
                </div>

                <!-- Footer / Actions -->
                <div class="px-6 py-5 bg-cyber-panel border-t border-cyber-blue/30 flex justify-between items-center z-10">
                    <div class="text-gray-500 text-xs font-mono">
                        <span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>READY
                    </div>

                    <div class="flex gap-4">
                        <button id="copyWKTBtn" class="group relative px-6 py-2.5 bg-transparent border border-cyber-blue text-cyber-blue font-bold font-mono text-sm tracking-wider hover:bg-cyber-blue hover:text-black transition-all duration-300 shadow-[0_0_10px_rgba(0,240,255,0.2)] hover:shadow-neon-blue rounded overflow-hidden">
                            <span class="relative z-10 flex items-center gap-2">
                                <i class="fa-solid fa-copy group-hover:animate-bounce"></i> COPY DATA
                            </span>
                        </button>

                        <button id="downloadWKTBtn" class="group relative px-6 py-2.5 bg-cyber-purple/10 border border-cyber-purple text-cyber-purple font-bold font-mono text-sm tracking-wider hover:bg-cyber-purple hover:text-white transition-all duration-300 shadow-[0_0_10px_rgba(189,0,255,0.2)] hover:shadow-neon-pink rounded overflow-hidden">
                            <span class="relative z-10 flex items-center gap-2">
                                <i class="fa-solid fa-download group-hover:animate-bounce"></i> EXPORT .WKT
                            </span>
                        </button>
                    </div>
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

        // Sadece WKT verilerini al
        const wktOnly = fullText
            .split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return trimmed && !trimmed.startsWith('--');
            })
            .join('\n');

        // Panoya kopyala
        navigator.clipboard.writeText(wktOnly).then(() => {
            const btn = document.getElementById('copyWKTBtn');
            const originalContent = btn.innerHTML;

            btn.innerHTML = '<span class="relative z-10 flex items-center gap-2"><i class="fa-solid fa-check"></i> COPIED!</span>';
            btn.classList.add('bg-green-500', 'text-white', 'border-green-500', 'shadow-[0_0_15px_rgba(34,197,94,0.6)]');
            btn.classList.remove('text-cyber-blue', 'border-cyber-blue', 'bg-transparent');

            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.classList.remove('bg-green-500', 'text-white', 'border-green-500', 'shadow-[0_0_15px_rgba(34,197,94,0.6)]');
                btn.classList.add('text-cyber-blue', 'border-cyber-blue', 'bg-transparent');
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
