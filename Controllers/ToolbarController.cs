using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using System.Collections.Generic;
using System.IO; 
using Newtonsoft.Json.Linq; 

namespace owsLab.Controllers
{
    // Controller'ın root yolu: /Toolbar
    [Route("[controller]")]
    public class ToolbarController : Controller
    {
        // =========================================================
        // 1. SPLIT (Bölme) İşlevi
        // =========================================================
        
        [HttpPost("Split")]
        public IActionResult Split([FromBody] object geoJson)
        {
            try
            {
                var reader = new GeoJsonReader();
                var geom = reader.Read<Geometry>(((JObject)geoJson).ToString()); 

                if (!(geom is Polygon polygon))
                    return BadRequest("Sadece poligonlar destekleniyor.");

                var envelope = polygon.EnvelopeInternal;
                double midY = (envelope.MaxY + envelope.MinY) / 2;

                var topPolygon = new Polygon(new LinearRing(new[]
                {
                    new Coordinate(envelope.MinX, midY),
                    new Coordinate(envelope.MinX, envelope.MaxY),
                    new Coordinate(envelope.MaxX, envelope.MaxY),
                    new Coordinate(envelope.MaxX, midY),
                    new Coordinate(envelope.MinX, midY)
                }));

                var bottomPolygon = new Polygon(new LinearRing(new[]
                {
                    new Coordinate(envelope.MinX, envelope.MinY),
                    new Coordinate(envelope.MinX, midY),
                    new Coordinate(envelope.MaxX, midY),
                    new Coordinate(envelope.MaxX, envelope.MinY),
                    new Coordinate(envelope.MinX, envelope.MinY)
                }));
                
                var writer = new GeoJsonWriter();
                var geoJsonList = new List<string>
                {
                    writer.Write(topPolygon),
                    writer.Write(bottomPolygon)
                };

                return Json(geoJsonList);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"Split hatası: {ex.Message}");
                return StatusCode(500, new { error = "İşlem sırasında bir hata oluştu: " + ex.Message });
            }
        }
        
        // =========================================================
        // 2. SAVE GEOMETRY (Genel Kaydetme) İşlevi
        // =========================================================

        // Tüm geometri türlerini (Point, Polyline, Polygon, Circle) GeoJSON olarak alıp işler.
        [HttpPost("SaveGeometry")]
        public IActionResult SaveGeometry([FromBody] object geoJson)
        {
            try
            {
                var reader = new GeoJsonReader();
                var geoJsonString = ((JObject)geoJson).ToString();
                
                // GeoJSON'dan geometri nesnesini okur
                var geom = reader.Read<Geometry>(geoJsonString);
                
                // Geometrinin WKT (Well-Known Text) formatını al
                var wktWriter = new WKTWriter();
                string wkt = wktWriter.Write(geom);
                
                // GeoJSON'dan geometri adını ve özelliklerini çıkar
                JObject geoJsonObj = JObject.Parse(geoJsonString);
                
                // JS'den kaydettiğimiz adı alıyoruz.
                string geometryName = geoJsonObj["properties"]?["name"]?.ToString();
                
                // Leaflet Draw, Circle çizimini GeoJSON'a dönüştürdüğünde,
                // geometri türü 'Point' (merkez) ve özelliklerde yarıçap bulunur.
                // Geometri tipini GeoJSON'dan veya NTS geometrisinden al
                string geometryType = geoJsonObj["geometry"]?["type"]?.ToString() ?? geom.GeometryType; 
                
                // Daireler için ek olarak yarıçapı kaydetmek isteyebiliriz.
                // Bu değerin JSON'da "properties" altında "measurements" ve "radius" adıyla geldiği varsayılır.
                JToken radiusToken = geoJsonObj["properties"]?["measurements"]?["radius"];
                string radius = radiusToken != null ? $"{radiusToken.Value<double>():F2} m" : null;


                // --- Burada Veritabanı Kayıt İşlemleri Yapılır ---
                // WKT, Ad, Tip ve Daireler için Yarıçapı veritabanına kaydedebilirsiniz.
                // ------------------------------------------------

                // Başarılı yanıt
                return Json(new { 
                    success = true, 
                    message = $"{geometryType} ({geometryName}) başarıyla kaydedildi.", 
                    wktData = wkt,
                    name = geometryName,
                    type = geometryType,
                    radius = radius // Daireler için bu alan dolu gelecektir.
                });
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"Kaydetme hatası: {ex.Message}");
                return StatusCode(500, new { success = false, error = "Kayıt işlemi başarısız oldu: " + ex.Message });
            }
        }
    }
}