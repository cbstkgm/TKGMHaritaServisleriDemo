// ============================================================================
// owsLab TKGM proxy'si — Cloudflare Worker sürümü (Controllers/OwsProxyController.cs'nin eşi).
//
// GitHub Pages yalnızca statik dosya sunar. TKGM CBS Servisi ise Basic Authentication ister ve
// CORS ön isteğine (OPTIONS) 401 döndürür; bu yüzden tarayıcı kimlikli isteği doğrudan gönderemez.
// Bu Worker kimlik bilgisini sunucu tarafında ekler ve yanıtı değiştirmeden iletir.
//
// Adresler:  https://<worker>/wms?…  →  https://cbsservis.tkgm.gov.tr/tkgm.ows/wms?…
//            https://<worker>/wfs?…  →  https://cbsservis.tkgm.gov.tr/tkgm.ows/wfs?…
//
// Ortam değişkenleri (wrangler.toml [vars] veya `wrangler secret put`):
//   TKGM_KULLANICI, TKGM_SIFRE  — TKGM hesabı
//   IZINLI_KOKENLER             — virgülle ayrılmış kökenler (ör. https://erdemalpar.github.io). Boşsa herkese açık.
// ============================================================================

const TKGM_TEMEL = "https://cbsservis.tkgm.gov.tr/tkgm.ows";
const IZINLI_SERVISLER = new Set(["wms", "wfs"]);
const YETENEK_ONBELLEK_SN = 30 * 60;

export default {
    async fetch(istek, env, ctx) {
        const koken = istek.headers.get("Origin");
        const izinliKokenler = (env.IZINLI_KOKENLER || "").split(",").map(k => k.trim()).filter(Boolean);
        if (koken && izinliKokenler.length && !izinliKokenler.includes(koken)) {
            return new Response("Bu köken için izin yok.", { status: 403 });
        }
        const corsBasliklari = {
            "Access-Control-Allow-Origin": koken && izinliKokenler.length ? koken : "*",
            "Access-Control-Expose-Headers": "X-Owslab-Hedef, X-Owslab-Sure-Ms, X-Owslab-Onbellek",
            "Vary": "Origin"
        };

        if (istek.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: { ...corsBasliklari, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
        }
        if (istek.method !== "GET") {
            return new Response("Yalnızca GET desteklenir.", { status: 405, headers: corsBasliklari });
        }

        const adres = new URL(istek.url);
        const servis = adres.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
        if (!IZINLI_SERVISLER.has(servis)) {
            return new Response(`TKGM CBS Servisi yalnızca WMS ve WFS yayınlar. '${servis}' adresi yoktur.`, { status: 404, headers: corsBasliklari });
        }

        const hedefAdres = `${TKGM_TEMEL}/${servis}${adres.search}`;
        // GetCapabilities belgeleri büyüktür ve nadiren değişir; Cloudflare önbelleğinde kısa süre tutulur.
        const yetenekIstegiMi = adres.search.toLowerCase().includes("getcapabilities");
        const onbellek = caches.default;
        const onbellekAnahtari = new Request(hedefAdres);

        if (yetenekIstegiMi) {
            const kayit = await onbellek.match(onbellekAnahtari);
            if (kayit) {
                return yanitDondur(kayit, hedefAdres, 0, true, corsBasliklari);
            }
        }

        const baslangic = Date.now();
        let yanit;
        try {
            yanit = await fetch(hedefAdres, {
                headers: {
                    "Authorization": "Basic " + btoa(`${env.TKGM_KULLANICI}:${env.TKGM_SIFRE}`),
                    "User-Agent": "owsLab-Egitim-Portali/2.0"
                }
            });
        } catch (hata) {
            return new Response(`TKGM sunucusuna ulaşılamadı: ${hata.message}`, {
                status: 502, headers: { ...corsBasliklari, "X-Owslab-Sure-Ms": String(Date.now() - baslangic) }
            });
        }
        const sureMs = Date.now() - baslangic;

        // Gövde bir kez okunur; hem önbelleğe hem istemciye aynı baytlar gider.
        const govde = await yanit.arrayBuffer();
        const icerikTipi = yanit.headers.get("Content-Type") || "application/octet-stream";

        if (yetenekIstegiMi && yanit.ok) {
            const saklanacak = new Response(govde, {
                status: yanit.status,
                headers: { "Content-Type": icerikTipi, "Cache-Control": `public, max-age=${YETENEK_ONBELLEK_SN}` }
            });
            ctx.waitUntil(onbellek.put(onbellekAnahtari, saklanacak));
        }

        return yanitDondur(new Response(govde, { status: yanit.status, headers: { "Content-Type": icerikTipi } }), hedefAdres, sureMs, false, corsBasliklari);
    }
};

function yanitDondur(kaynak, hedefAdres, sureMs, onbellektenMi, corsBasliklari) {
    const basliklar = new Headers(corsBasliklari);
    basliklar.set("Content-Type", kaynak.headers.get("Content-Type") || "application/octet-stream");
    basliklar.set("Cache-Control", "no-store");
    basliklar.set("X-Owslab-Hedef", encodeURIComponent(hedefAdres));
    basliklar.set("X-Owslab-Sure-Ms", String(sureMs));
    basliklar.set("X-Owslab-Onbellek", onbellektenMi ? "evet" : "hayir");
    return new Response(kaynak.body, { status: kaynak.status, headers: basliklar });
}
