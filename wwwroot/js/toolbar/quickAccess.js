// =========================================================
// HIZLI ERİŞİM PANELİ & DEĞİŞKEN TABANLI SİSTEM
// =========================================================

// --- TEMA TANIMLARI (Bootstrap/DOM Overrides Dahil) ---
const THEMES = [
    {
        id: 'cyberpunk',
        name: 'Cyberpunk (Default)',
        type: 'dark',
        colors: {
            '--color-bg': '#0a0b10',
            '--color-bg-dark': '#13151a',
            '--color-panel': '#1a1d24',
            '--color-text': '#e2e8f0',
            '--color-text-muted': '#94a3b8',
            '--color-primary': '#00f0ff',
            '--color-secondary': '#f0f',
            '--color-warning': '#fce300',
            '--color-accent': '#00f0ff',
            '--color-purple': '#bd00ff',
            '--shadow-primary': '0 0 10px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.4)',
            '--shadow-secondary': '0 0 10px #f0f, 0 0 20px rgba(255, 0, 255, 0.4)'
        }
    },
    {
        id: 'premium-saas',
        name: 'Premium SaaS (Light)',
        type: 'light',
        colors: {
            '--color-bg': '#f8fafc', // Çok açık gri
            '--color-bg-dark': '#ffffff', // Beyaz paneller
            '--color-panel': '#ffffff',
            '--color-text': '#1e293b', // Koyu gri text
            '--color-text-muted': '#64748b',
            '--color-primary': '#3b82f6', // Royal Blue
            '--color-secondary': '#6366f1',
            '--color-warning': '#f59e0b',
            '--color-accent': '#2563eb',
            '--color-purple': '#8b5cf6',
            '--shadow-primary': '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
            '--shadow-secondary': '0 4px 6px -1px rgba(99, 102, 241, 0.5)'
        }
    },
    {
        id: 'playful-pop',
        name: 'Playful & Pop',
        type: 'light',
        colors: {
            '--color-bg': '#fff1f2',
            '--color-bg-dark': '#ffffff',
            '--color-panel': '#ffffff',
            '--color-text': '#2d3436',
            '--color-text-muted': '#636e72',
            '--color-primary': '#ff4757', // Pop Red
            '--color-secondary': '#2ed573',
            '--color-warning': '#ffa502',
            '--color-accent': '#3742fa',
            '--color-purple': '#a29bfe',
            '--shadow-primary': '4px 4px 0px #ff4757', // Brutalist gölge
            '--shadow-secondary': '4px 4px 0px #2ed573'
        }
    },
    {
        id: 'forest-calm',
        name: 'Forest Calm (Nature)',
        type: 'light',
        colors: {
            '--color-bg': '#f0fdf4',
            '--color-bg-dark': '#dcfce7',
            '--color-panel': '#ffffff',
            '--color-text': '#14532d',
            '--color-text-muted': '#15803d',
            '--color-primary': '#16a34a',
            '--color-secondary': '#15803d',
            '--color-warning': '#d97706',
            '--color-accent': '#059669',
            '--color-purple': '#7e22ce',
            '--shadow-primary': '0 4px 12px rgba(22, 163, 74, 0.3)',
            '--shadow-secondary': '0 4px 12px rgba(21, 128, 61, 0.3)'
        }
    },
    {
        id: 'space-gray',
        name: 'Space Gray (Minimal)',
        type: 'dark',
        colors: {
            '--color-bg': '#171717',
            '--color-bg-dark': '#262626',
            '--color-panel': '#262626',
            '--color-text': '#e5e5e5',
            '--color-text-muted': '#a3a3a3',
            '--color-primary': '#525252', // Dark Grey Accent
            '--color-secondary': '#737373',
            '--color-warning': '#d4d4d4',
            '--color-accent': '#ffffff', // White pops
            '--color-purple': '#737373',
            '--shadow-primary': '0 0 0 1px #404040',
            '--shadow-secondary': '0 0 0 1px #525252'
        }
    },
    {
        id: 'sunset-warm',
        name: 'Sunset Warm',
        type: 'light',
        colors: {
            '--color-bg': '#fff7ed',
            '--color-bg-dark': '#ffedd5',
            '--color-panel': '#ffffff',
            '--color-text': '#7c2d12',
            '--color-text-muted': '#9a3412',
            '--color-primary': '#ea580c',
            '--color-secondary': '#c2410c',
            '--color-warning': '#f59e0b',
            '--color-accent': '#9a3412',
            '--color-purple': '#be185d',
            '--shadow-primary': '0 4px 15px rgba(234, 88, 12, 0.4)',
            '--shadow-secondary': '0 4px 15px rgba(194, 65, 12, 0.4)'
        }
    }
];

// --- QUICK ACCESS TOOLS ---
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

// State
let quickTools = JSON.parse(localStorage.getItem('quickAccessTools')) || [];
let currentThemeId = localStorage.getItem('currentTheme') || 'cyberpunk';

document.addEventListener('DOMContentLoaded', function () {
    initQuickAccessBar();
    applyTheme(currentThemeId); // Başlangıçta temayı uygula
});

/**
 * Quick Access Bar'ı başlat
 */
function initQuickAccessBar() {
    if (!document.getElementById('quick-access-bar')) {
        const barHTML = `
            <div id="quick-access-bar" class="fixed left-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-2 p-2 bg-cyber-dark/95 backdrop-blur-md border border-cyber-neon/30 rounded-xl shadow-neon-blue transition-all duration-300">
                <div id="quick-tools-container" class="flex flex-col gap-2">
                    <!-- Dinamik butonlar -->
                </div>
                
                <div class="h-[1px] bg-cyber-neon/30 my-1 w-full"></div>
                
                <!-- Ayarlar Butonu -->
                <button id="btnQuickSettings" class="w-10 h-10 flex items-center justify-center rounded-lg text-cyber-neon hover:bg-cyber-neon hover:text-white transition-all duration-200" title="Hızlı Erişimi Düzenle">
                    <i class="fa-solid fa-plus"></i>
                </button>
                
                <!-- Tema Butonu -->
                <button id="btnThemeSettings" class="w-10 h-10 flex items-center justify-center rounded-lg text-cyber-pink hover:bg-cyber-pink hover:text-white transition-all duration-200" title="Tema Değiştir">
                    <i class="fa-solid fa-palette"></i>
                </button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', barHTML);
    }

    renderQuickTools();

    // Event Listeners
    document.getElementById('btnQuickSettings').addEventListener('click', showQuickAccessModal);
    document.getElementById('btnThemeSettings').addEventListener('click', showThemeModal);
}

/**
 * Araçları Render Et
 */
function renderQuickTools() {
    const container = document.getElementById('quick-tools-container');
    container.innerHTML = '';

    quickTools.forEach(toolId => {
        const toolDef = AVAILABLE_TOOLS.find(t => t.id === toolId);
        if (toolDef) {
            const btn = document.createElement('button');
            btn.className = 'w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-cyber-neon hover:bg-cyber-neon/20 transition-all duration-200 relative group';
            btn.innerHTML = `
                <i class="fa-solid ${toolDef.icon} text-lg"></i>
                <!-- Tooltip -->
                <span class="absolute left-full ml-3 px-2 py-1 bg-cyber-panel border border-cyber-neon text-cyber-neon text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-50">
                    ${toolDef.title}
                </span>
            `;

            btn.addEventListener('click', () => {
                const originalBtn = document.getElementById(toolDef.id);
                if (originalBtn) {
                    originalBtn.click();
                    btn.classList.add('text-cyber-neon', 'bg-cyber-neon/30');
                    setTimeout(() => btn.classList.remove('text-cyber-neon', 'bg-cyber-neon/30'), 200);
                }
            });

            container.appendChild(btn);
        }
    });
}

/**
 * Temayı Uygula
 */
function applyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;

    // Değişkenleri güncelle
    Object.keys(theme.colors).forEach(key => {
        root.style.setProperty(key, theme.colors[key]);
    });

    // Kaydet
    currentThemeId = themeId;
    localStorage.setItem('currentTheme', themeId);

    console.log(`Tema uygulandı: ${theme.name}`);
}

/**
 * Tema Seçim Modalı
 */
function showThemeModal() {
    const existing = document.getElementById('themeModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="themeModal" class="fixed inset-0 z-[10002] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div class="relative w-full max-w-2xl bg-cyber-panel border border-cyber-neon shadow-neon-blue rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="px-6 py-4 border-b border-cyber-neon/30 bg-cyber-dark flex justify-between items-center">
                    <h3 class="text-xl font-bold text-cyber-neon font-mono tracking-wider">
                        <i class="fa-solid fa-paintbrush mr-2"></i> TEMA SEÇİMİ
                    </h3>
                    <button id="closeThemeModal" class="text-gray-400 hover:text-cyber-pink transition-colors">
                        <i class="fa-solid fa-times text-2xl"></i>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-cyber-dark">
                    ${THEMES.map(theme => `
                        <div class="theme-card relative group cursor-pointer border-2 ${currentThemeId === theme.id ? 'border-cyber-neon ring-2 ring-cyber-neon/30' : 'border-transparent hover:border-gray-500'} rounded-xl overflow-hidden transition-all duration-300 bg-white" onclick="selectTheme('${theme.id}')">
                            <!-- Theme Preview Block -->
                            <div class="h-24 w-full relative" style="background-color: ${theme.colors['--color-bg']}">
                                <div class="absolute top-2 left-2 w-20 h-16 rounded shadow-lg" style="background-color: ${theme.colors['--color-panel']}; border: 1px solid ${theme.colors['--color-primary']}"></div>
                                <div class="absolute bottom-2 right-2 w-8 h-8 rounded-full shadow-lg flex items-center justify-center" style="background-color: ${theme.colors['--color-primary']}">
                                    <i class="fa-solid fa-check text-white text-xs"></i>
                                </div>
                            </div>
                            
                            <!-- Info -->
                            <div class="p-3 bg-cyber-panel flex justify-between items-center">
                                <span class="font-bold text-sm" style="color: ${theme.type === 'dark' ? '#fff' : '#333'}">${theme.name}</span>
                                ${currentThemeId === theme.id ? '<span class="text-cyber-neon text-xs font-mono border border-cyber-neon px-1 rounded">ACTIVE</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('closeThemeModal').addEventListener('click', () => document.getElementById('themeModal').remove());
    document.getElementById('themeModal').addEventListener('click', (e) => {
        if (e.target.id === 'themeModal') document.getElementById('themeModal').remove();
    });

    window.selectTheme = function (id) {
        applyTheme(id);
        document.getElementById('themeModal').remove();
        showThemeModal(); // Modalı yeniden render et ki "Active" durumu güncellensin
    };
}

/**
 * Hızlı Erişim Düzenleme Modalı
 */
function showQuickAccessModal() {
    const existing = document.getElementById('quickAccessModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div id="quickAccessModal" class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div class="relative w-full max-w-md bg-cyber-panel border border-cyber-neon shadow-neon-blue rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
                
                <div class="px-6 py-4 border-b border-cyber-neon/30 bg-cyber-dark flex justify-between items-center">
                    <h3 class="text-lg font-bold text-cyber-neon font-mono tracking-wider">
                        <i class="fa-solid fa-bolt mr-2"></i> ARAÇLAR
                    </h3>
                    <button id="closeQuickModal" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-cyber-dark/30">
                    ${AVAILABLE_TOOLS.map(tool => {
        const isChecked = quickTools.includes(tool.id) ? 'checked' : '';
        return `
                            <label class="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-black/20 hover:bg-white/5 hover:border-cyber-neon/50 cursor-pointer transition-all group">
                                <input type="checkbox" value="${tool.id}" class="peer hidden" ${isChecked}>
                                <div class="w-5 h-5 border-2 border-gray-500 rounded peer-checked:bg-cyber-neon peer-checked:border-cyber-neon flex items-center justify-center transition-colors">
                                    <i class="fa-solid fa-check text-black text-xs opacity-0 peer-checked:opacity-100"></i>
                                </div>
                                <div class="w-8 h-8 flex items-center justify-center bg-gray-800 rounded text-gray-400 group-hover:text-white transition-colors">
                                    <i class="fa-solid ${tool.icon}"></i>
                                </div>
                                <span class="text-gray-300 font-mono text-sm group-hover:text-cyber-neon transition-colors">${tool.title}</span>
                            </label>
                        `;
    }).join('')}
                </div>

                <div class="px-6 py-4 border-t border-cyber-neon/30 bg-cyber-dark flex justify-end">
                    <button id="saveQuickTools" class="px-6 py-2 bg-cyber-neon text-black font-bold rounded hover:bg-white hover:shadow-neon-blue transition-all duration-300">
                        KAYDET
                    </button>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('closeQuickModal').addEventListener('click', () => document.getElementById('quickAccessModal').remove());
    document.getElementById('quickAccessModal').addEventListener('click', (e) => {
        if (e.target.id === 'quickAccessModal') document.getElementById('quickAccessModal').remove();
    });

    document.getElementById('saveQuickTools').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#quickAccessModal input[type="checkbox"]:checked');
        quickTools = Array.from(checkboxes).map(cb => cb.value);
        localStorage.setItem('quickAccessTools', JSON.stringify(quickTools));
        renderQuickTools();
        document.getElementById('quickAccessModal').remove();
    });
}
