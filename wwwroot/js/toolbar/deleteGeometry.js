// Silme Modu
let currentTool = { type: "delete" };
drawnItems.eachLayer(layer => { if (layer.editing) layer.editing.enable(); });

document.getElementById("btnDeleteOne").onclick = function () {
    disableCurrentTool();
    currentTool = { type: "delete" };
    drawnItems.eachLayer(layer => { if (layer.editing) layer.editing.enable(); });
    this.classList.add("active");
};


