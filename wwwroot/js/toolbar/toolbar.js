// --- TOOLBAR JS ---

// Sol katman panelini açıp kapatma
document.getElementById("btnLayers").addEventListener("click", function () {
    const panel = document.getElementById("left-layer-panel");

    // Toggle: Eğer show class'ı varsa kaldır, yoksa ekle
    panel.classList.toggle("show");

    // Aktif buton stilini yönet
    this.classList.toggle("active");
});

// İsteğe bağlı: Panel dışına tıklandığında paneli kapatma
document.addEventListener("click", function (e) {
    const panel = document.getElementById("left-layer-panel");
    const btn = document.getElementById("btnLayers");

    // Eğer tıklama panelin veya butonun dışındaysa kapat
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove("show");
        btn.classList.remove("active");
    }
});


// --- SAĞ OGC PANEL TOGGLE ---
document.getElementById("btnOGC").addEventListener("click", function () {
    const panel = document.getElementById("right-ogc-panel");

    // Toggle class show
    panel.classList.toggle("show");

    // Aktif buton stilini yönet
    this.classList.toggle("active");
});

// İsteğe bağlı: Panel dışına tıklayınca kapatma
document.addEventListener("click", function (e) {
    const panel = document.getElementById("right-ogc-panel");
    const btn = document.getElementById("btnOGC");

    if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove("show");
        btn.classList.remove("active");
    }
});

// ---------------------------------------------------------