
    // --- Global Değişkenler ---
    let map;
    let drawnItems;
    let currentBbox = null;
    let currentWkt = null;
    let wfsFeaturesLayer = null; // WFS'ten çekilen GeoJSON verisinin tutulacağı katman
    let wmsLayer = null; // WMS arka plan katmanı
    let selectedLayerName = 'TKGM:mahalleler'; // Başlangıç katmanı adı
    let currentWfsUrl = document.getElementById('wfsUrlSelect').value;

    // TKGM ve Açık Kaynak WFS'ler için özel başlangıç koordinatları (Center, Zoom)
    const initialViews = {
    'https://cbsservis.tkgm.gov.tr/tkgm.ows/wfs': [39.9334, 32.8597, 6], // Türkiye
    'https://ahocevar.com/geoserver/wfs': [40.7128, -74.0060, 10], // New York
    'https://demo.deegree.org/deegree-webservices/services/wfs110': [51.0504, 13.7373, 10], // Dresden, Almanya
    'https://geodata.nationaalgeoregister.nl/top10nl/wfs': [52.3676, 4.9041, 10], // Amsterdam, Hollanda
    'default': [20, 0, 2]
};


    // ----------------------------------------------------------------------
    //                       *** TEMEL YARDIMCI FONKSİYONLAR ***
    // ----------------------------------------------------------------------

    /**
    * 💻 Console'a log mesajı yazmak için yardımcı fonksiyon
    * @param {string} type - 'INFO', 'SUCCESS', 'ERROR', 'WARNING'
    * @param {string} message - Gösterilecek mesaj
    */
    function logToConsole(type, message) {
    const consoleOutput = document.getElementById('consoleOutput');
    const now = new Date();
    const timeString = `<span class="log-timestamp">${now.toLocaleTimeString('tr-TR')}</span>`;
    let logClass = '';

    switch (type) {
    case 'SUCCESS':
    logClass = 'log-success';
    break;
    case 'ERROR':
    logClass = 'log-error';
    break;
    case 'WARNING':
    logClass = 'log-warning';
    break;
    case 'INFO':
    default:
    logClass = 'log-info';
    break;
}

    const logEntry = `<span class="${logClass}">[${type}]</span> ${message}\n`;
    consoleOutput.innerHTML += timeString + logEntry;
    // Otomatik kaydırma
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}


    /**
    * ⚙️ Seçilen WFS işlemine göre (GetFeature, GetCapabilities, vb.) parametre gruplarını ayarlar.
    */
    function updateOperationParams() {
    const operation = document.getElementById('wfsOperationSelect').value;
    const featureParams = document.getElementById('getFeatureParams');
    const typeSelection = document.getElementById('typeSelectionGroup');

    if (operation === 'GetFeature') {
    featureParams.style.display = 'block';
    typeSelection.style.display = 'block';
} else if (operation === 'DescribeFeatureType') {
    featureParams.style.display = 'none';
    typeSelection.style.display = 'block';
} else { // GetCapabilities
    featureParams.style.display = 'none';
    typeSelection.style.display = 'none';
}

    updateUrlPreview();
}

    // ----------------------------------------------------------------------
    //                       *** WFS URL OLUŞTURMA VE YANIT YÖNETİMİ ***
    // ----------------------------------------------------------------------

    /**
    * 🔗 Request URL, Download URL ve Harici Linki güncel parametrelere göre oluşturur.
    */
    function updateUrlPreview() {
    const url = currentWfsUrl;
    const request = document.getElementById('wfsOperationSelect').value;
    const typeName = selectedLayerName;
    const maxFeatures = document.getElementById('maxFeatures').value;
    const cqlInput = document.getElementById('cqlInput').value.trim();
    const spatialMode = document.querySelector('input[name="spatialMode"]:checked').value;

    // --- TEMEL PARAMETRELER ---
    let params = `service=WFS&version=1.1.0&request=${request}`;

    if (request !== 'GetCapabilities') {
    params += `&typename=${typeName}`;
}

    let cqlFilter = cqlInput;

    // --- GETFEATURE ÖZEL PARAMETRELERİ ---
    if (request === 'GetFeature') {
    params += `&maxFeatures=${maxFeatures}`;
    params += `&outputFormat=application/json`;

    // Mekansal Kısıt Ekleme (BBOX veya WKT/INTERSECTS)
    if (drawnItems && drawnItems.getLayers().length > 0) { // drawnItems kontrolü eklendi
    const geomProperty = currentWfsUrl.includes('tkgm') ? 'geom' : 'the_geom';
    const srs = currentWfsUrl.includes('tkgm') ? 'EPSG:4326' : 'EPSG:4326';

    if (spatialMode === 'BBOX' && currentBbox) {
    params += `&bbox=${currentBbox},${srs}`;
} else if (spatialMode === 'INTERSECTS' && currentWkt) {
    // INTERSECTS filtresi WKT'yi içeriyor ve CQL_FILTER'a ekleniyor.
    const filter = `INTERSECTS(${geomProperty}, ${currentWkt})`;
    cqlFilter = cqlFilter ? cqlFilter + ' AND ' + filter : filter;
}
}

    // CQL Filtresi Ekleme (Mekansal filtre eklendikten sonra kontrol edilir)
    if (cqlFilter) {
    params += `&cql_filter=${encodeURIComponent(cqlFilter)}`;
}
}

    const fullUrl = `${url}?${params}`;

    // --- 1. REQUEST URL SEKME GÜNCELLEMESİ (Decode Edilmiş) ---
    document.getElementById('urlDisplay').textContent = decodeURIComponent(fullUrl);
    hljs.highlightAll();

    // --- 2. İNDİRME URL ÖNİZLEMESİ GÜNCELLEMESİ (Download Sekmesi) ---
    const downloadFormat = document.getElementById('downloadFormat').value;

    let downloadUrl = fullUrl;
    if (request === 'GetFeature') {
    // outputFormat=application/json'ı indirilecek formata değiştir
    const downloadParams = params.replace(`&outputFormat=application/json`, `&outputFormat=${downloadFormat}`);
    downloadUrl = `${url}?${downloadParams}`;
}

    document.getElementById('downloadUrlDisplay').textContent = decodeURIComponent(downloadUrl);
    document.getElementById('iframeFormatBadge').textContent = document.getElementById('downloadFormat').options[document.getElementById('downloadFormat').selectedIndex].text;
}


    /**
    * 📡 Seçilen WFS URL'sine GetCapabilities isteği gönderir ve katmanları listeler.
    */
    async function fetchWfsLayers(url) {
    if (!url || url.includes('custom_url')) return;

    logToConsole('INFO', `WFS Katmanlarını sorguluyor (GetCapabilities): ${url}`);
    document.getElementById('loading-indicator').style.display = 'block';

    const capabilitiesUrl = `${url}?service=WFS&version=1.1.0&request=GetCapabilities`;
    document.getElementById('urlDisplay').textContent = capabilitiesUrl;

    try {
    const startTime = performance.now();
    const response = await fetch(capabilitiesUrl);
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(2);

    document.getElementById('responseTimeBadge').textContent = `${responseTime}ms`;
    document.getElementById('responseTimeBadge').style.display = 'inline';

    const responseText = await response.text();
    document.getElementById('responseOutput').textContent = responseText;
    hljs.highlightAll();

    if (!response.ok) {
    logToConsole('ERROR', `HTTP Hatası: ${response.status} ${response.statusText}`);
    document.getElementById('responseStatusBadge').textContent = `HATA: ${response.status}`;
    document.getElementById('responseStatusBadge').className = 'badge bg-danger border border-secondary text-light';
    return;
}

    document.getElementById('responseStatusBadge').textContent = `OK: 200`;
    document.getElementById('responseStatusBadge').className = 'badge bg-success border border-secondary text-light';

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(responseText, "text/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length) {
    logToConsole('ERROR', 'XML ayrıştırma hatası! Yanıt geçerli bir XML değil.');
    return;
}

    parseWfsCapabilities(xmlDoc);

} catch (error) {
    logToConsole('ERROR', `İstek gönderilirken hata oluştu: ${error.message}`);
    document.getElementById('responseStatusBadge').textContent = `BAĞLANTI HATASI`;
    document.getElementById('responseStatusBadge').className = 'badge bg-danger border border-secondary text-light';
} finally {
    document.getElementById('loading-indicator').style.display = 'none';
    updateOperationParams();
}
}


    /**
    * 📄 GetCapabilities XML yanıtını ayrıştırır ve katman listesini doldurur.
    */
    function parseWfsCapabilities(xmlDoc) {
    const featureTypeList = xmlDoc.getElementsByTagName('FeatureTypeList')[0];
    const availableLayersList = document.getElementById('availableLayersList');
    availableLayersList.innerHTML = '';

    if (!featureTypeList) {
    availableLayersList.innerHTML = '<div class="list-group-item list-group-item-action disabled small text-danger">Katman Listesi (FeatureTypeList) XML yanıtında bulunamadı.</div>';
    document.getElementById('layerCount').textContent = '0';
    return;
}

    const featureTypes = featureTypeList.getElementsByTagName('FeatureType');
    let defaultLayerName = '';
    let count = 0;

    for (const featureType of featureTypes) {
    const nameElement = featureType.getElementsByTagName('Name')[0];
    if (nameElement) {
    const layerName = nameElement.textContent;

    // TKGM için mahalleleri veya diğer servisler için ilkini varsayılan yap
    if (count === 0 || (currentWfsUrl.includes('tkgm') && layerName.includes('mahalle'))) {
    defaultLayerName = layerName;
}

    const listItem = document.createElement('a');
    listItem.href = '#';
    listItem.className = 'list-group-item list-group-item-action py-1 small';
    listItem.textContent = layerName;
    listItem.setAttribute('data-layer-name', layerName);
    listItem.onclick = (e) => selectLayer(e, layerName);

    availableLayersList.appendChild(listItem);
    count++;
}
}

    document.getElementById('layerCount').textContent = count;
    logToConsole('SUCCESS', `${count} adet WFS katmanı başarıyla yüklendi.`);

    if (defaultLayerName) {
    setLayerName(defaultLayerName);
}
}


    /**
    * 🖱️ Listeden bir katman seçildiğinde çalışır.
    */
    function selectLayer(e, layerName) {
    if (e) e.preventDefault();
    setLayerName(layerName);

    const listItems = document.querySelectorAll('#availableLayersList .list-group-item');
    listItems.forEach(item => {
    item.classList.remove('active', 'fw-bold');
    if (item.getAttribute('data-layer-name') === layerName) {
    item.classList.add('active', 'fw-bold');
}
});

    logToConsole('INFO', `Katman seçimi yapıldı: ${layerName}`);
}

    /**
    * 🏷️ LayerName Input ve Hidden alanlarını günceller.
    */
    function setLayerName(layerName) {
    document.getElementById('typeNameInput').value = layerName;
    document.getElementById('selectedLayer').value = layerName;
    selectedLayerName = layerName;
    updateUrlPreview();
}

    // ----------------------------------------------------------------------
    //                       *** HARİTA İŞLEVLERİ ***
    // ----------------------------------------------------------------------

    /**
    * 🗺️ Leaflet Haritasını Başlatır, Temel Katmanları ve Kontrolleri Ekler.
    */
    function initializeMap() {
    logToConsole('INFO', 'Harita başlatılıyor...');

    // 1. Harita Div'ini başlat
    map = L.map('map', {
    minZoom: 2,
    maxZoom: 18,
}).setView([39.9334, 32.8597], 6); // Varsayılan TKGM başlangıç

    // 2. Temel Katman (Örn: OSM) ekle
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

    // 3. Leaflet.Draw için konteyneri tanımla
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // 4. Çizim Kontrollerini ekle
    const drawControl = new L.Control.Draw({
    edit: {
    featureGroup: drawnItems
},
    draw: {
    polyline: false, marker: false, circlemarker: false, circle: false,
    polygon: {
    allowIntersection: false,
    shapeOptions: { color: '#EA082A' }
},
    rectangle: {
    shapeOptions: { color: '#2c5364' }
}
}
});
    map.addControl(drawControl);


    // 5. Çizim Olayları (Drawing Events)
    map.on(L.Draw.Event.created, function (event) {
    const layer = event.layer;
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    updateSpatialConstraints(layer);
    document.getElementById('drawStatus').textContent = `${event.layerType.toUpperCase()} Çizildi.`;
    updateUrlPreview();
    logToConsole('SUCCESS', `Harita üzerinde bir ${event.layerType.toUpperCase()} çizimi yapıldı.`);
});

    map.on(L.Draw.Event.deleted, function (event) {
    currentBbox = null;
    currentWkt = null;
    document.getElementById('drawStatus').textContent = 'Çizim Yok';
    document.getElementById('wktOutput').innerHTML = '<div class="alert alert-info small">Haritada bir çizim yapıldığında WKT formatı buraya eklenecektir.</div>';
    document.getElementById('bboxOutput').innerHTML = '<div class="alert alert-warning small">BBOX bilgisi burada gösterilecektir.</div>';
    updateUrlPreview();
    logToConsole('WARNING', 'Tüm çizimler temizlendi.');
});

    // 6. Özel WKT/BBOX Butonlarını ekle
    addWktBboxControls();

    // 7. Koordinat Bilgisi Kontrolünü ekle
    addCoordinateInfoControl();

    // 8. WFS servisine göre haritayı ayarla, GetMap'i başlat ve parametreleri ayarla
    loadLayers(true);
    updateOperationParams();
}

    /**
    * 📌 Çizilen geometriden WKT ve BBOX değerlerini alır ve değişkenleri/modalları günceller.
    * @param {L.Layer} layer - Leaflet çizim katmanı
    */
    function updateSpatialConstraints(layer) {
    if (layer instanceof L.Rectangle) {
    const bounds = layer.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    currentBbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
    currentWkt = null;
    document.getElementById('bboxOutput').innerHTML = `<pre class="m-0 small"><code class="language-none">${currentBbox}</code></pre>`;
    document.getElementById('wktOutput').innerHTML = '<div class="alert alert-info small">Geometri bir dikdörtgen olduğu için sadece BBOX bilgisi kullanılıyor.</div>';

} else if (layer instanceof L.Polygon) {
    currentWkt = L.WKT.layerToWkt(layer);
    currentBbox = null;

    const bounds = layer.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const calculatedBbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

    document.getElementById('wktOutput').innerHTML = `<pre class="m-0 small"><code class="language-none">${currentWkt}</code></pre>`;
    document.getElementById('bboxOutput').innerHTML = `<pre class="m-0 small"><code class="language-none">${calculatedBbox} (Kapsayan BBOX)</code></pre>`;
}
}

    /**
    * 🗺️ WKT ve BBOX butonu kontrollerini haritaya ekler.
    */
    function addWktBboxControls() {
    L.Control.WKTButton = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-wkt-button');
            const link = L.DomUtil.create('a', '', container);
            link.href = '#';
            link.title = 'Çizilen Geometrinin WKT/BBOX Detaylarını Gör';
            link.innerHTML = '✏️ WKT / BBOX';
            L.DomEvent.on(link, 'click', function(e) {
                L.DomEvent.stop(e);
                const modal = new bootstrap.Modal(document.getElementById('wktBboxModal'));
                modal.show();
            });
            return container;
        }
    });
    L.control.wktButton = function(opts) { return new L.Control.WKTButton(opts); }
    L.control.wktButton({ position: 'topright' }).addTo(map);
}


    /**
    * 🗺️ Fare hareketine duyarlı koordinat bilgisini haritaya ekler.
    */
    function addCoordinateInfoControl() {
    L.Control.CoordinateInfo = L.Control.extend({
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-control-coordinate-info');
            container.innerHTML = 'Lng: 0.0000 | Lat: 0.0000';
            map.on('mousemove', function(e) {
                container.innerHTML = `Lng: ${e.latlng.lng.toFixed(4)} | Lat: ${e.latlng.lat.toFixed(4)}`;
            });
            return container;
        }
    });
    L.control.coordinateInfo = function(opts) { return new L.Control.CoordinateInfo(opts); }
    L.control.coordinateInfo({ position: 'bottomleft' }).addTo(map);
}

    /**
    * 🗺️ Seçili WFS URL'sine göre harita görünümünü ayarlar ve WMS (GetMap) katmanını ekler/günceller.
    */
    function loadLayers(shouldUpdateView) {
    const wfsSelect = document.getElementById('wfsUrlSelect');
    let selectedWfsUrl = wfsSelect.value;

    if (selectedWfsUrl === 'custom_url') {
    document.getElementById('customUrlGroup').style.display = 'flex';
    const customUrlInput = document.getElementById('customWfsUrlInput');
    selectedWfsUrl = customUrlInput.value || '';
    document.getElementById('typeNameInput').value = 'Geçici Katman Adı';
    document.getElementById('availableLayersList').innerHTML = '<div class="list-group-item list-group-item-action disabled small">Özel URL için önce Algıla butonuna basınız.</div>';
    document.getElementById('layerCount').textContent = '0';
} else {
    document.getElementById('customUrlGroup').style.display = 'none';
}

    currentWfsUrl = selectedWfsUrl;

    if (shouldUpdateView && map) {
    const [lat, lng, zoom] = initialViews[currentWfsUrl] || initialViews['default'];
    map.setView([lat, lng], zoom);
    logToConsole('INFO', `Harita görünümü yeni servise (${currentWfsUrl}) göre ayarlandı.`);
}

    if (wmsLayer) {
    map.removeLayer(wmsLayer);
    wmsLayer = null;
}

    if (currentWfsUrl && currentWfsUrl.includes('ows')) {
    let wmsUrl = currentWfsUrl.replace('/wfs', '/wms').replace('wfs', 'wms');
    const wmsLayerName = currentWfsUrl.includes('tkgm') ? 'TKGM:ilceler' : '';

    wmsLayer = L.tileLayer.wms(wmsUrl, {
    layers: wmsLayerName || 'ne:ne_10m_admin_0_countries',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    attribution: `WMS/WFS: ${currentWfsUrl.split('/')[2]}`
}).addTo(map);

    logToConsole('SUCCESS', `WMS (GetMap) arka plan katmanı yüklendi. URL: ${wmsUrl}`);

    // WFS Katmanlarını yükleme fonksiyonunu çağır
    if (selectedWfsUrl !== 'custom_url') {
    fetchWfsLayers(currentWfsUrl);
}

} else if (currentWfsUrl !== 'custom_url') {
    logToConsole('WARNING', 'Geçerli bir WFS URL seçilmedi veya URL tanımsız.');
}
}

    // ----------------------------------------------------------------------
    //                       *** GETFEATURE & İNDİRME İŞLEVLERİ ***
    // ----------------------------------------------------------------------

    /**
    * 👁️ Haritada Önizle (Fetch) butonuna tıklandığında çalışır.
    * GetFeature isteği gönderir ve GeoJSON yanıtını haritaya çizer.
    */
    async function previewData() {
    const request = document.getElementById('wfsOperationSelect').value;
    if (request !== 'GetFeature') {
    logToConsole('WARNING', `Önizleme sadece 'GetFeature' seçiliyken çalışır. Mevcut işlem: ${request}`);
    return;
}

    // updateUrlPreview() içinde outputFormat=application/json ayarlandı.
    // İndirme URL'sini al, outputFormat'ı GeoJSON olarak ayarla
    const downloadUrlElement = document.getElementById('downloadUrlDisplay');
    const encodedUrl = downloadUrlElement.textContent;
    const geoJsonUrl = encodedUrl.replace(/outputFormat=.*$/, 'outputFormat=application/json');

    logToConsole('INFO', `Haritada önizleme için GetFeature isteği gönderiliyor...`);
    document.getElementById('loading-indicator').style.display = 'block';

    // Haritadaki eski GeoJSON katmanını temizle
    if (wfsFeaturesLayer) {
    map.removeLayer(wfsFeaturesLayer);
    wfsFeaturesLayer = null;
}

    try {
    const startTime = performance.now();
    const response = await fetch(geoJsonUrl);
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(2);

    document.getElementById('responseTimeBadge').textContent = `${responseTime}ms`;
    document.getElementById('responseTimeBadge').style.display = 'inline';

    const responseText = await response.text();

    // Yanıt sekmesine geç ve veriyi göster
    document.getElementById('response-tab').click();
    document.getElementById('responseOutput').textContent = responseText;
    hljs.highlightAll();

    if (!response.ok) {
    logToConsole('ERROR', `HTTP Hatası: ${response.status} ${response.statusText}`);
    document.getElementById('responseStatusBadge').textContent = `HATA: ${response.status}`;
    document.getElementById('responseStatusBadge').className = 'badge bg-danger border border-secondary text-light';
    return;
}

    document.getElementById('responseStatusBadge').textContent = `OK: 200`;
    document.getElementById('responseStatusBadge').className = 'badge bg-success border border-secondary text-light';

    // GeoJSON'u ayrıştır ve haritaya ekle
    const geoJsonData = JSON.parse(responseText);

    if (geoJsonData.type === 'FeatureCollection' && geoJsonData.features.length > 0) {
    wfsFeaturesLayer = L.geoJSON(geoJsonData, {
    style: function (feature) {
    return { color: '#007bff', weight: 3, opacity: 0.65 };
},
    onEachFeature: function (feature, layer) {
    // Basit bir popup içeriği oluştur
    let popupContent = "<h6>Öznitelikler:</h6>";
    for (const key in feature.properties) {
    popupContent += `<strong>${key}:</strong> ${feature.properties[key] === null ? 'Boş' : feature.properties[key]}<br>`;
}
    layer.bindPopup(popupContent);
}
}).addTo(map);

    // Harita görünümünü çekilen verilere göre ayarla
    map.fitBounds(wfsFeaturesLayer.getBounds());

    logToConsole('SUCCESS', `${geoJsonData.features.length} adet geometri haritaya çizildi.`);
} else {
    logToConsole('WARNING', 'Veri çekildi, ancak GeoJSON boş veya FeatureCollection formatında değil.');
}

} catch (error) {
    logToConsole('ERROR', `Veri işlenirken hata oluştu: ${error.message}. Sunucu yanıtı GeoJSON formatında olmayabilir veya CORS hatası olabilir.`);
    document.getElementById('responseStatusBadge').textContent = `İŞLEM HATASI`;
    document.getElementById('responseStatusBadge').className = 'badge bg-danger border border-secondary text-light';
} finally {
    document.getElementById('loading-indicator').style.display = 'none';
}
}

    /**
    * 📥 DOSYAYI İNDİR butonuna tıklandığında çalışır.
    */
    function downloadData() {
    const request = document.getElementById('wfsOperationSelect').value;
    if (request !== 'GetFeature') {
    logToConsole('ERROR', `İndirme işlemi sadece 'GetFeature' seçiliyken desteklenir. Mevcut işlem: ${request}`);
    return;
}

    const downloadUrl = document.getElementById('downloadUrlDisplay').textContent;

    window.open(downloadUrl, '_blank');
    logToConsole('SUCCESS', `İndirme işlemi başlatıldı. Format: ${document.getElementById('downloadFormat').value}`);
}

    /**
    * 🔗 Harici URL sekmesine tıklandığında mevcut URL'yi yeni sekmede açar.
    */
    function openExternalUrl() {
    const urlToOpen = document.getElementById('downloadUrlDisplay').textContent;
    window.open(urlToOpen, '_blank');
    logToConsole('INFO', 'İstek URL\'si yeni sekmede açıldı.');
}

    /**
    * <iframe> içeriğini, indirme URL'sini kullanarak yükler.
    */
    function loadIframeContent() {
        const url = document.getElementById('downloadUrlDisplay').textContent;
        document.getElementById('liveResultFrameInTab').src = url;
        logToConsole('INFO', `iFrame'de canlı yanıt yükleniyor: ${document.getElementById('downloadFormat').options[document.getElementById('downloadFormat').selectedIndex].text}`);
    }

    /**
    * Response Output içeriğinin Satır Kaydırma (Wrap) ayarını değiştirir.
    */
    function toggleWrap() {
        const output = document.getElementById('responseOutput');
        if (output.style.whiteSpace === 'pre-wrap') {
        output.style.whiteSpace = 'pre';
        logToConsole('INFO', 'Satır Kaydırma (Wrap) kapatıldı.');
    } else {
        output.style.whiteSpace = 'pre-wrap';
        logToConsole('INFO', 'Satır Kaydırma (Wrap) açıldı.');
    }
    }

    /**
    * Response Output içeriğini panoya kopyalar.
    */
    function copyResponse() {
        const outputText = document.getElementById('responseOutput').textContent;
        navigator.clipboard.writeText(outputText).then(() => {
        logToConsole('INFO', 'Yanıt panoya kopyalandı.');
    }).catch(err => {
        logToConsole('ERROR', 'Kopyalama işlemi başarısız oldu: ' + err);
    });
    }

    // Haritayı DOM yüklendikten sonra başlat
    document.addEventListener('DOMContentLoaded', initializeMap);

    // Geriye kalan tek eksik fonksiyon: Özel URL Algılama (detectAndLoadLayers)
    function detectAndLoadLayers() {
        const customInput = document.getElementById('customWfsUrlInput');
        const customUrl = customInput.value.trim();

        if (!customUrl) {
        logToConsole('ERROR', 'Lütfen özel WFS URL\'sini girin.');
        return;
    }

        currentWfsUrl = customUrl;
        logToConsole('INFO', `Özel URL algılanıyor: ${customUrl}`);

        // Hata durumunda varsayılan TKGM seçili kalmasın diye seçimi özel url'ye geçir
        document.getElementById('wfsUrlSelect').value = 'custom_url';

        // Harita görünümünü varsayılana ayarla ve katmanları yükle (true = görünümü güncelle)
        loadLayers(true);
        // Ardından GetCapabilities'i çağır
        fetchWfsLayers(customUrl);
    }
