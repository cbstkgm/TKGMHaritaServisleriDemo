document.addEventListener("DOMContentLoaded", function () {
    const exampleButtons = document.querySelectorAll("button[data-target]");

    exampleButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            const targetUrl = btn.getAttribute("data-target");

            if (targetUrl) {
                window.location.href = targetUrl;
            }
        });
    });
});
