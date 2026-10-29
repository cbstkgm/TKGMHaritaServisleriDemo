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
app.UseStaticFiles();

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
