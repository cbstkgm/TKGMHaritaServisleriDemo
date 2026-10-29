using Microsoft.AspNetCore.Mvc;
using owsLab.Models;

namespace owsLab.Controllers;

public class DersController : Controller
{
    public IActionResult Index() => RedirectToAction("Index", "Home", null, "mufredat");

    public IActionResult Goster(string slug)
    {
        var ders = Mufredat.Bul(slug);
        if (ders == null)
        {
            return NotFound();
        }

        return View(ders);
    }
}
