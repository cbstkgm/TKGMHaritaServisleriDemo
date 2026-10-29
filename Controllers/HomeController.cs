using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using owsLab.Models;

namespace owsLab.Controllers;

public class HomeController : Controller
{
    public IActionResult Index() => View();

    public IActionResult Laboratuvar() => View();

    public IActionResult Rehber() => View();

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
