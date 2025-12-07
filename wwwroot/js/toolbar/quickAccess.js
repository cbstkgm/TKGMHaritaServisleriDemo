// =========================================================
// HIZLI ERİŞİM PANELİ (Quick Access Bar)
// =========================================================

const AVAILABLE_TOOLS = [
    { id: 'btnDrawPoint', icon: 'fa-location-dot', title: 'Nokta Ekle' },
    { id: 'btnDrawLine', icon: 'fa-share-nodes', title: 'Çizgi Çiz' },
    { id: 'btnDrawPolygon', icon: 'fa-draw-polygon', title: 'Polygon Çiz' },
    { id: 'btnDrawCircle', icon: 'fa-circle', title: 'Daire Çiz' },
    { id: 'btnDrawText', icon: 'fa-font', title: 'Metin Ekle' },
    { id: 'btnDragGeometry', icon: 'fa-up-down-left-right', title: 'Taşı (Drag)' },
    { id: 'btnEditGeometry', icon: 'fa-pen-to-square', title: 'Düzenle (Edit)' },
    { id: 'btnScaleLayer', icon: 'fa-maximize', title: 'Ölçekle (Scale)' },
    { id: 'btnCutLayer', icon: 'fa-scissors', title: 'Kes (Cut)' },
    { id: 'btnSplitLayer', icon: 'fa-arrows-split-up-and-left', title: 'Böl (Split)' },
    { id: 'btnUnionLayer', icon: 'fa-object-group', title: 'Birleştir (Union)' },
    { id: 'btnDeleteOne', icon: 'fa-trash', title: 'Sil' },
    { id: 'btnClearAll', icon: 'fa-trash-can', title: 'Hepsini Temizle' },
    { id: 'btnShowWKT', icon: 'fa-code', title: 'WKT Göster' },
    { id: 'btnLayers', icon: 'fa-layer-group', title: 'Katmanlar' },
    { id: 'btnOGC', icon: 'fa-globe', title: 'OGC Servisleri' }
];

// Varsayılan boş liste veya localStorage'dan oku
let quickTools = JSON.parse(localStorage.getItem('quickAccessTools')) || [];

document.addEventListener('DOMContentLoaded', function () {
    initQuickAccessBar();
});

function initQuickAccessBar() {
    // HTML yapısını oluştur (Eğer yoksa)
    if (!document.getElementById('quick-access-bar')) {
        const barHTML = `
            <div id="quick-access-bar" class="fixed left-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2 p-2 bg-cyber-dark/90 backdrop-blur-md border border-cyber-blue/30 rounded-xl shadow-neon-blue transition-all duration-300">
                <div id="quick-tools-container" class="flex flex-col gap-2">
                    <!-- Dinamik butonlar buraya gelecek -->
                </div>
                
                <div class="h-[1px] bg-cyber-blue/30 my-1 w-full"></div>
                
                <button id="btnQuickSettings" class="w-10 h-10 flex items-center justify-center rounded-lg text-cyber-blue hover:bg-cyber-blue hover:text-black transition-all duration-200" title="Hızlı Erişimi Düzenle">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', barHTML); // appendChild yerine
    }

    renderQuickTools();

    // Ayarlar butonuna tıklama
    document.getElementById('btnQuickSettings').addEventListener('click', showQuickAccessModal);
}

function renderQuickTools() {
    const container = document.getElementById('quick-tools-container');
    container.innerHTML = '';

    quickTools.forEach(toolId => {
        const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
        if (toolDef) {
            const btn = document.createElement('button');
            btn.className = 'w-10 h-10 flex items-center justify-center rounded-lg text-gray-300 hover:text-cyber-neon hover:bg-cyber-blue/20 hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all duration-200 relative group';
            btn.innerHTML = `
                <i class="fa-solid ${toolDef.icon} text-lg"></i>
                <!-- Tooltip -->
                <span class="absolute left-full ml-3 px-2 py-1 bg-cyber-dark border border-cyber-blue text-cyber-blue text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-50">
                    ${toolDef.title}
                </span>
            `;

            // Tıklama olayı: Orijinal butonu tetikle
            btn.addEventListener('click', () => {
                const originalBtn = document.getElementById(toolDef.id);
                if (originalBtn) {
                    originalBtn.click();

                    // Görsel aktiflik senkronizasyonu (Basitçe tıklandığını göster)
                    btn.classList.add('text-cyber-neon', 'bg-cyber-blue/30');
                    setTimeout(() => btn.classList.remove('text-cyber-neon', 'bg-cyber-blue/30'), 200);
                } else {
                    console.error(`Orijinal buton bulunamadı: ${toolDef.id}`);
                }
            });

            container.appendChild(btn);
        }
    });

    // Eğer hiç araç yoksa bilgilendirme ikonu veya boş durum
    if (quickTools.length === 0) {
        // container.innerHTML = '<div class="text-xs text-gray-500 text-center py-2">Ekle +</div>';
    }
}

function showQuickAccessModal() {
    // Varsa önce kapat
    const existingModal = document.getElementById('quickAccessModal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="quickAccessModal" class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div class="relative w-full max-w-md bg-cyber-dark border border-cyber-blue shadow-neon-blue rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
                
                <!-- Header -->
                <div class="px-6 py-4 border-b border-cyber-blue/30 bg-cyber-panel flex justify-between items-center">
                    <h3 class="text-lg font-bold text-white font-mono tracking-wider">
                        <i class="fa-solid fa-bolt text-cyber-yellow mr-2"></i> HIZLI ERİŞİM
                    </h3>
                    <button id="closeQuickSettings" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <!-- List -->
                <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    ${AVAILABLE_TOOLS.map(tool => {
        const isChecked = quickTools.includes(tool.id) ? 'checked' : '';
        return `
                            <label class="flex items-center gap-3 p-3 rounded-lg border border-cyber-blue/10 bg-cyber-black/30 hover:bg-cyber-blue/10 hover:border-cyber-blue/50 cursor-pointer transition-all group">
                                <input type="checkbox" value="${tool.id}" class="peer hidden" ${isChecked}>
                                <div class="w-5 h-5 border-2 border-gray-500 rounded peer-checked:bg-cyber-blue peer-checked:border-cyber-blue flex items-center justify-center transition-colors">
                                    <i class="fa-solid fa-check text-black text-xs opacity-0 peer-checked:opacity-100"></i>
                                </div>
                                <div class="w-8 h-8 flex items-center justify-center bg-gray-800 rounded text-gray-400 group-hover:text-white transition-colors">
                                    <i class="fa-solid ${tool.icon}"></i>
                                </div>
                                <span class="text-gray-300 font-mono text-sm group-hover:text-white">${tool.title}</span>
                            </label>
                        `;
    }).join('')}
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-cyber-blue/30 bg-cyber-panel flex justify-end">
                    <button id="saveQuickTools" class="px-6 py-2 bg-cyber-blue text-black font-bold rounded hover:bg-cyber-neon hover:shadow-neon-blue transition-all duration-300">
                        KAYDET
                    </button>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event Listeners
    document.getElementById('closeQuickSettings').addEventListener('click', () => {
        document.getElementById('quickAccessModal').remove();
    });

    document.getElementById('saveQuickTools').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#quickAccessModal input[type="checkbox"]:checked');
        quickTools = Array.from(checkboxes).map(cb => cb.value);

        // Kaydedip render et
        localStorage.setItem('quickAccessTools', JSON.stringify(quickTools));
        renderQuickTools();
        document.getElementById('quickAccessModal').remove();
    });

    // Modal dışına tıklayınca kapat
    document.getElementById('quickAccessModal').addEventListener('click', (e) => {
        if (e.target.id === 'quickAccessModal') {
            document.getElementById('quickAccessModal').remove();
        }
    });
}
