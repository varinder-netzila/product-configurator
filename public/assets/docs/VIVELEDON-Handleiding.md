# ViveleDon 3D Fles Configurator
## Integratie & Bedieningshandleiding

Hallo, hier vindt u alles wat u nodig hebt om de IZY Bottles 3D-Configurator op uw website te integreren. Offerteaanvragen worden automatisch naar info@viveledon.com doorgestuurd.

---

## Uw Configurator-URL

Uw configurator is live op:

```
https://configurator.izybottles.com/nl/configurator?reseller=viveledon
```

Elke bezoeker ziet automatisch het ViveleDon-logo, uw huiskleur (#b91c1c rood) en de volledige interface in het Nederlands. Offerteaanvragen landen rechtstreeks in uw inbox. Probeer het meteen uit — als alles functioneert, ziet u bovenaan het ViveleDon-logo in plaats van IZY.

---

## Inbedding per iframe (5 minuten)

De gemakkelijkste manier om de configurator op uw website te plaatsen, is via een iframe. Maak een nieuwe pagina aan (bijv. viveledon.com/configurator) en voeg deze code in:

```html
<iframe
  src="https://configurator.izybottles.com/nl/configurator?reseller=viveledon"
  width="100%" 
  height="900"
  style="border: 0; min-height: 900px;"
  allow="camera; gyroscope; accelerometer; xr-spatial-tracking"
  loading="lazy">
</iframe>
```

Klaar — de configurator draait nu op uw site, en uw klanten zien viveledon.com in de adresbalk van hun browser.

### WordPress / CMS

Draait uw website op WordPress? Maak een nieuwe pagina aan, voeg een Custom-HTML-blok (Gutenberg) in, of schakel de Classic Editor op "Tekst" in en plak de iframe-code. De meeste andere CMS-systemen (Webflow, Wix, Shopify, Squarespace) accepteren dezelfde code via een HTML-/Embed-blok.

**Let op bij caching-plugins:** Als u WP Rocket, LiteSpeed Cache of iets vergelijkbaars gebruikt, sluit de configuratorpagina uit van minificatie en iframe-lazy-loading — anders kan de 3D-viewer stotteren.

### Eigen subdomein (optioneel)

Wil u dat de configurator onder configurator.viveledon.com draait in plaats van onder onze URL? Dat richten wij gratis in. Wij hebben alleen een CNAME-vermelding in uw DNS nodig (de exacte waarde sturen wij u); SSL draait automatisch. Stuur ons gewoon een e-mail.

---

## Zo functioneert het voor uw klanten

1. **Fles kiezen** — IZY Bottle, Travel Bottle, Mug of Tumbler.
2. **Configureren** — Kleur, design (eigen upload, stadskaart of AI-generator), tekst en logo.
3. **3D-preview** — De fles kan gedraaid, ingezoomd en op de smartphone zelfs in AR bekeken worden.
4. **Offerte aanvragen** — De klant voert bedrijfsgegevens + aantal in; wij sturen design + aanvraag automatisch per e-mail naar ViveleDon.

| Wat | Waar |
|-----|------|
| Offerteaanvraag | info@viveledon.com (primair) + IZY (CC voor productie) |
| 3D-mockup PNG + design | Als bijlage in de e-mail aan ViveleDon |

---

## Veelgestelde vragen

**Ziet mijn klant "IZY" als hij op configurator.izybottles.com terechtkomt?**

Nee. Zodra u de link met `?reseller=viveledon` (of de iframe) gebruikt, wordt overal ViveleDon-branding weergegeven — uw logo, uw kleuren, en "IZY" wordt verwijderd uit alle productnamen.

**Hoe wijzig ik prijzen of taal?**

Alle prijzen zijn ingesteld op "op aanvraag" — geen vaste prijzen weergegeven. Voor een ander e-mailadres of bedrijfsgegevens: stuur ons een mailtje. Voor een andere taal: vervang `/nl/` in de URL door `/en/`, `/de/`, `/fr/` of `/cs/`. De configurator is volledig in 5 talen vertaald.

**Wat kost dit?**

De configurator zelf is gratis — wij verdienen aan de productie. Uw marge zit in het verschil tussen uw inkoopprijs bij IZY en de prijs die u uw klanten doorrekent.

**Kan ik het design in mijn eigen branding hebben?**

Ja! Het is volledig wit-gelabeld — uw logo, uw kleuren, uw e-mailadres. Klanten zien niets van IZY.

**Hoe lang duurt productie?**

Standaard 2-3 weken. Express-opties beschikbaar op aanvraag.

---

## Support

Vragen, wijzigingen of wil u een eigen subdomein? Stuur Jim Woerdman een e-mail op jim@izybottles.com — antwoord meestal binnen 1 werkdag.

---

**IZY Bottles · configurator.izybottles.com · Juni 2026 · Gemaakt voor ViveleDon**
