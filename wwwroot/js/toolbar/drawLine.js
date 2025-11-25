// Çizgi Çizimi
let currentTool = new L.Draw.Polyline(map);
currentTool.enable();

document.getElementById("btnDrawLine").onclick = function () {
    disableCurrentTool();
    currentTool = new L.Draw.Polyline(map);
    currentTool.enable();
    this.classList.add("active");
};

