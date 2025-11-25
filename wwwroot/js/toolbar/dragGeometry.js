// Taşıma Modu
let currentTool = { type: "drag" };
drawnItems.eachLayer(layer => { if (layer.dragging) layer.dragging.enable(); });

document.getElementById("btnDragGeometry").onclick = function () {
    disableCurrentTool();
    currentTool = { type: "drag" };
    drawnItems.eachLayer(layer => { if (layer.dragging) layer.dragging.enable(); });
    this.classList.add("active");
};

