// Yazı Ekleme
drawTextActive = true;

textClickHandler = function (e) {
    var text = prompt("Yazılacak metni giriniz:");
    if (text) {
        L.marker(e.latlng, {
            icon: L.divIcon({ className: "text-label", html: text, iconSize: [100, 40] })
        }).addTo(drawnItems);
    }
    drawTextActive = false;
    map.off("click", textClickHandler);
};
map.on("click", textClickHandler);

document.getElementById("btnDrawText").onclick = function () {
    if (drawTextActive) { disableTextTool(); return; }
    disableCurrentTool();
    resetToolbar();
    this.classList.add("active");
    drawTextActive = true;

    textClickHandler = function (e) {
        var text = prompt("Yazılacak metni giriniz:");
        if (text) {
            L.marker(e.latlng, {
                icon: L.divIcon({ className: "text-label", html: text, iconSize: [100, 40] })
            }).addTo(drawnItems);
        }
        disableTextTool();
    };
    map.on("click", textClickHandler);
};
