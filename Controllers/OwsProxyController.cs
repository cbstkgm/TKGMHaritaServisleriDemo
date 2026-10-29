using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using owsLab.Models;

namespace owsLab.Controllers;

/// <summary>
/// Tarayıcıdan gelen WMS/WFS isteklerini TKGM CBS Servisi'ne demo hesabıyla iletir.
///
/// Neden gerekli? TKGM servisi Basic Authentication ister. Tarayıcı, Authorization başlığı
/// içeren bir fetch isteğinden önce OPTIONS (CORS preflight) isteği gönderir ve TKGM bu isteğe
/// 401 döndürür. Leaflet'in &lt;img&gt; ile çektiği WMS karoları ise başlık ekleyemez.
/// Bu nedenle kimlik bilgisi sunucu tarafında eklenir.
///
/// Yanıt gövdesi hiçbir şekilde değiştirilmez: öğrenci TKGM'nin gerçekte ne döndürdüğünü görür.
/// </summary>
[Route("OwsProxy")]
public class OwsProxyController : Controller
{
    private static readonly HashSet<string> IzinliServisler = new(StringComparer.OrdinalIgnoreCase) { "wms", "wfs" };
    private static readonly TimeSpan YetenekOnbellekSuresi = TimeSpan.FromMinutes(30);

    private readonly IHttpClientFactory _istemciFabrikasi;
    private readonly IMemoryCache _onbellek;
    private readonly TkgmOwsAyarlari _ayarlar;

    public OwsProxyController(IHttpClientFactory istemciFabrikasi, IMemoryCache onbellek, IOptions<TkgmOwsAyarlari> ayarlar)
    {
        _istemciFabrikasi = istemciFabrikasi;
        _onbellek = onbellek;
        _ayarlar = ayarlar.Value;
    }

    [HttpGet("{servis}")]
    public async Task<IActionResult> Ilet(string servis, CancellationToken iptal)
    {
        if (!IzinliServisler.Contains(servis))
        {
            return NotFound($"TKGM CBS Servisi yalnızca WMS ve WFS yayınlar. '{servis}' adresi yoktur.");
        }

        // GitHub Pages'teki statik kopya bu proxy'yi başka bir kökenden çağırır
        string koken = Request.Headers.Origin.ToString();
        if (koken.Length > 0 && _ayarlar.IzinliKokenler.Contains(koken, StringComparer.OrdinalIgnoreCase))
        {
            Response.Headers.AccessControlAllowOrigin = koken;
            Response.Headers.AccessControlExposeHeaders = "X-Owslab-Hedef, X-Owslab-Sure-Ms, X-Owslab-Onbellek";
            Response.Headers.Vary = "Origin";
        }

        string sorgu = Request.QueryString.HasValue ? Request.QueryString.Value! : string.Empty;
        string hedefAdres = $"{_ayarlar.TemelAdres.TrimEnd('/')}/{servis.ToLowerInvariant()}{sorgu}";

        // GetCapabilities belgeleri büyüktür (WMS ~150 KB) ve nadiren değişir; kısa süreli önbelleğe alınır.
        bool yetenekIstegiMi = sorgu.Contains("getcapabilities", StringComparison.OrdinalIgnoreCase);
        if (yetenekIstegiMi && _onbellek.TryGetValue(hedefAdres, out OnbellekKaydi? kayit) && kayit != null)
        {
            return YanitDondur(kayit, hedefAdres, sureMs: 0, onbellektenMi: true);
        }

        var kronometre = Stopwatch.StartNew();
        try
        {
            using var istemci = _istemciFabrikasi.CreateClient();
            istemci.Timeout = TimeSpan.FromSeconds(60);

            using var istek = new HttpRequestMessage(HttpMethod.Get, hedefAdres);
            istek.Headers.UserAgent.ParseAdd("owsLab-Egitim-Portali/2.0");
            string kimlik = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_ayarlar.KullaniciAdi}:{_ayarlar.Sifre}"));
            istek.Headers.Authorization = new AuthenticationHeaderValue("Basic", kimlik);

            using var yanit = await istemci.SendAsync(istek, iptal);
            var yeniKayit = new OnbellekKaydi(
                (int)yanit.StatusCode,
                yanit.Content.Headers.ContentType?.ToString() ?? "application/octet-stream",
                await yanit.Content.ReadAsByteArrayAsync(iptal));
            kronometre.Stop();

            if (yetenekIstegiMi && yanit.IsSuccessStatusCode)
            {
                _onbellek.Set(hedefAdres, yeniKayit, YetenekOnbellekSuresi);
            }

            return YanitDondur(yeniKayit, hedefAdres, kronometre.ElapsedMilliseconds, onbellektenMi: false);
        }
        catch (Exception hata) when (hata is HttpRequestException or TaskCanceledException)
        {
            Response.Headers["X-Owslab-Sure-Ms"] = kronometre.ElapsedMilliseconds.ToString();
            return StatusCode(502, $"TKGM sunucusuna ulaşılamadı: {hata.Message}");
        }
    }

    private IActionResult YanitDondur(OnbellekKaydi kayit, string hedefAdres, long sureMs, bool onbellektenMi)
    {
        Response.StatusCode = kayit.DurumKodu;
        Response.Headers["X-Owslab-Hedef"] = Uri.EscapeDataString(hedefAdres);
        Response.Headers["X-Owslab-Sure-Ms"] = sureMs.ToString();
        Response.Headers["X-Owslab-Onbellek"] = onbellektenMi ? "evet" : "hayir";
        return File(kayit.Icerik, kayit.IcerikTipi);
    }

    private sealed record OnbellekKaydi(int DurumKodu, string IcerikTipi, byte[] Icerik);
}
