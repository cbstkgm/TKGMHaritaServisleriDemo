namespace owsLab.Models;

/// <summary>
/// appsettings.json içindeki "TkgmOws" bölümü. Eğitim amaçlı demo hesabının bilgilerini tutar.
/// Demo hesabı mahalle katmanında yalnızca Amasya / Merkez / Hızırpaşa'yı, parsel katmanında bu mahalle ve çevresini görür.
/// </summary>
public class TkgmOwsAyarlari
{
    public const string Bolum = "TkgmOws";

    public string TemelAdres { get; set; } = "https://cbsservis.tkgm.gov.tr/tkgm.ows";
    public string KullaniciAdi { get; set; } = string.Empty;
    public string Sifre { get; set; } = string.Empty;

    /// <summary>
    /// Tarayıcının istek göndereceği proxy kökü (sonuna /wms veya /wfs eklenir). Boşsa bu uygulamanın
    /// /OwsProxy adresi kullanılır. GitHub Pages sürümünde proxy/ klasöründeki Cloudflare Worker'ın adresidir.
    /// </summary>
    public string ProxyAdresi { get; set; } = string.Empty;
}
