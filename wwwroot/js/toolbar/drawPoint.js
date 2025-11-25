// Nokta Çizimi
let currentTool = new L.Draw.Marker(map);
currentTool.enable();

document.getElementById("btnDrawPoint").onclick = function () {
    disableCurrentTool();
    currentTool = new L.Draw.Marker(map);
    currentTool.enable();
    this.classList.add("active");
};


