using Microsoft.AspNetCore.Mvc;

public class OGC_OrneklerController : Controller
{
    public IActionResult WmsOrnek()
    {
        return View(); // Views/OGC_Ornekler/wms_ornek.cshtml
    }

    public IActionResult WfsOrnek()
    {
        return View(); // Views/OGC_Ornekler/wfs_ornek.cshtml
    }

    public IActionResult WmtsOrnek()
    {
        return View(); // Views/OGC_Ornekler/wmts_ornek.cshtml
    }

    public IActionResult WcsOrnek()
    {
        return View();
    }

    public IActionResult CswOrnek()
    {
        return View();
    }

    public IActionResult WpsOrnek()
    {
        return View();
    }

    public IActionResult SosOrnek()
    {
        return View();
    }

    public IActionResult SldOrnek()
    {
        return View();
    }

    public IActionResult FilterOrnek()
    {
        return View();
    }

    public IActionResult GmlOrnek()
    {
        return View();
    }

    public IActionResult KmlOrnek()
    {
        return View();
    }
}