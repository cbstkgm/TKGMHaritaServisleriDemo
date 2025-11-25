// Polygon Çizimi
let currentTool = new L.Draw.Polygon(map);
currentTool.enable();

document.getElementById("btnDrawPolygon").onclick = function () {
    disableCurrentTool();
    currentTool = new L.Draw.Polygon(map);
    currentTool.enable();
    this.classList.add("active");
};
