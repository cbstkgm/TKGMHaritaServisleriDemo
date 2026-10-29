namespace owsLab.Models;

/// <summary>
/// appsettings.json içindeki "TkgmOws" bölümü. Eğitim amaçlı demo hesabının bilgilerini tutar.
/// Demo hesabı yalnızca Amasya / Merkez / Hızırpaşa mahallesi verisini görebilir.
/// </summary>
public class TkgmOwsAyarlari
{
    public const string Bolum = "TkgmOws";

    public string TemelAdres { get; set; } = "https://cbsservis.tkgm.gov.tr/tkgm.ows";
    public string KullaniciAdi { get; set; } = string.Empty;
    public string Sifre { get; set; } = string.Empty;
}
