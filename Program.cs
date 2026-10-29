using Microsoft.AspNetCore.StaticFiles;
using owsLab.Models;

var builder = WebApplication.CreateBuilder(args);

// Servisleri konteynere ekle
builder.Services.AddControllersWithViews();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();
builder.Services.Configure<TkgmOwsAyarlari>(builder.Configuration.GetSection(TkgmOwsAyarlari.Bolum));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
// wwwroot/data altındaki örnek GML kayıtları için içerik tipi
var icerikTipleri = new FileExtensionContentTypeProvider();
icerikTipleri.Mappings[".gml"] = "application/gml+xml";
app.UseStaticFiles(new StaticFileOptions { ContentTypeProvider = icerikTipleri });

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "ders",
    pattern: "ders/{slug}",
    defaults: new { controller = "Ders", action = "Goster" });

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
