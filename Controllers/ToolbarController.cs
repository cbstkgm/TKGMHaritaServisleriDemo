using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using System.Collections.Generic;

namespace owsLab.Controllers
{
    [Route("[controller]")]
    public class ToolbarController : Controller
    {
        [HttpPost("Split")]
        public IActionResult Split([FromBody] object geoJson)
        {
            try
            {
                // GeoJSON string -> NetTopologySuite Geometry
                var reader = new GeoJsonReader();
                var geom = reader.Read<Geometry>(geoJson.ToString());

                if (!(geom is Polygon polygon))
                    return BadRequest("Sadece poligonlar destekleniyor.");

                // Polygon envelope ortasında yatay çizgi
                var envelope = polygon.EnvelopeInternal;
                double midY = (envelope.MaxY + envelope.MinY) / 2;

                // Üst poligon
                var topPolygon = new Polygon(new LinearRing(new[]
                {
                    new Coordinate(envelope.MinX, midY),
                    new Coordinate(envelope.MinX, envelope.MaxY),
                    new Coordinate(envelope.MaxX, envelope.MaxY),
                    new Coordinate(envelope.MaxX, midY),
                    new Coordinate(envelope.MinX, midY)
                }));

                // Alt poligon
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
                return BadRequest(ex.Message);
            }
        }
    }
}
