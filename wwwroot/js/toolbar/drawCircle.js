// Daire Çizimi
let currentTool = new L.Draw.Circle(map);
currentTool.enable();

document.getElementById("btnDrawCircle").onclick = function () {
    disableCurrentTool();
    currentTool = new L.Draw.Circle(map);
    currentTool.enable();
    this.classList.add("active");
};


