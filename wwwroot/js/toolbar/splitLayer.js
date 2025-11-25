// Poligonu Split Et
let selected = null;
drawnItems.eachLayer(layer => {
    if (layer.toGeoJSON().geometry.type === "Polygon") selected = layer;
});

if (!selected) { alert("Bölmek için bir poligon çizmelisiniz!"); return; }

var geoJson = selected.toGeoJSON();

fetch('/Toolbar/Split', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geoJson)
})
    .then(res => res.json())
    .then(list => {
        drawnItems.removeLayer(selected);
        list.forEach(geo => { L.geoJSON(JSON.parse(geo)).addTo(drawnItems); });
        alert("Poligon iki parçaya bölündü!");
    })
    .catch(err => alert("Hata: " + err));

document.getElementById("btnSplitLayer").onclick = function () {
    let selected = null;
    drawnItems.eachLayer(layer => {
        if (layer.toGeoJSON().geometry.type === "Polygon") selected = layer;
    });

    if (!selected) {
        alert("Bölmek için bir poligon çizmelisiniz!");
        return;
    }

    var geoJson = selected.toGeoJSON();

    fetch('/Toolbar/Split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geoJson)
    })
        .then(res => res.json())
        .then(list => {
            drawnItems.removeLayer(selected);
            list.forEach(geo => { L.geoJSON(JSON.parse(geo)).addTo(drawnItems); });
            alert("Poligon iki parçaya bölündü!");
        })
        .catch(err => alert("Hata: " + err));
};

