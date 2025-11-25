// Düzenleme Modu
let currentTool = { type: "edit" };
drawnItems.eachLayer(layer => { if (layer.editing) layer.editing.enable(); });

document.getElementById("btnEditGeometry").onclick = function () {
    disableCurrentTool();
    currentTool = { type: "edit" };
    drawnItems.eachLayer(layer => { if (layer.editing) layer.editing.enable(); });
    this.classList.add("active");
};


