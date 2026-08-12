# Configurator op je eigen website plaatsen

Met de 3D bottle-configurator laten je klanten hun eigen flessen, mokken en
tumblers ontwerpen — rechtstreeks op jouw website, in jouw huisstijl. Je plaatst
de configurator als een **embed** (een stukje code) op een pagina van je site.
Bezoekers zien jouw domein in de adresbalk; alles draait in jouw eigen branding.

---

## 1. Je persoonlijke embed-code

Je krijgt van ons een unieke code die er zo uitziet (met jouw eigen `reseller`-id):

```html
<iframe
  src="https://configurator.izybottles.com/nl/configurator?reseller=JOUW-ID"
  width="100%"
  height="900"
  frameborder="0"
  style="border:none; border-radius:16px;"
  allow="xr-spatial-tracking; clipboard-write"
  title="Ontwerp je fles">
</iframe>
```

- **`JOUW-ID`** vervang je door het id dat wij je geven (bv. `tailwind`).
- **Taal**: vervang `/nl/` door `/en/`, `/fr/` of `/de/` voor een andere starttaal.
  De bezoeker kan in de configurator zelf ook van taal wisselen.

> Je hoeft niets aan logo's, kleuren of prijzen in te stellen in de code — die
> zijn al aan jouw `reseller`-id gekoppeld aan onze kant.

---

## 2. Waar plaats je de code?

Maak een pagina op je website (bijvoorbeeld `/ontwerp-je-fles`) en plak de
embed-code daar. Hieronder per platform:

### WordPress
1. Maak een nieuwe pagina of bewerk een bestaande.
2. Voeg een **"Aangepaste HTML"**-blok toe (Custom HTML block).
3. Plak de embed-code erin.
4. Publiceren.

### Shopify
1. Ga naar **Online Store → Pages → Add page**.
2. Klik rechtsboven in de tekst-editor op **`< >` (Show HTML)**.
3. Plak de embed-code.
4. Opslaan.
   *(Of plaats het in een sectie/template via je thema-editor.)*

### Wix / Squarespace
1. Voeg een **"Embed"** / **"Code"**-element toe op de pagina.
2. Plak de embed-code.
3. Publiceren.

### Eigen / handgecodeerde site
Plak de `<iframe>`-code op de gewenste plek in je HTML.

---

## 3. Formaat & responsiveness

- `width="100%"` laat de configurator de volledige breedte van je container vullen.
- `height="900"` is een goede starthoogte. Op mobiel werkt de configurator het
  fijnst met wat meer hoogte. Een veilige, responsieve variant:

```html
<div style="max-width:1100px; margin:0 auto;">
  <iframe
    src="https://configurator.izybottles.com/nl/configurator?reseller=JOUW-ID"
    style="width:100%; height:90vh; min-height:720px; border:none; border-radius:16px;"
    allow="xr-spatial-tracking; clipboard-write"
    title="Ontwerp je fles">
  </iframe>
</div>
```

- Geef de configurator bij voorkeur een **eigen, ruime pagina** (geen smalle
  zijbalk) — het is een interactieve 3D-tool.

---

## 4. Wat ziet jouw klant?

- Jouw bedrijfsnaam / logo en jouw accentkleur.
- Jouw verkoopprijzen.
- Alleen de ontwerp-functies die voor jou zijn ingeschakeld.
- **Geen** verwijzing naar IZY in de interface.

Wanneer een klant een ontwerp afrondt en een offerte/aanvraag indient, ontvang
**jij** de aanvraag per e-mail (op het adres dat we voor je hebben ingesteld),
inclusief het ontwerp en de contactgegevens van de klant. Wij ontvangen een
kopie zodat we de productie kunnen voorbereiden.

---

## 5. Veelgestelde vragen

**Ziet de klant `izybottles.com` in de adresbalk?**
Nee. Omdat de configurator als iframe op jóuw pagina staat, ziet de bezoeker
jouw eigen domein in de adresbalk. (Wil je dat ook de techniek volledig op je
eigen domein draait — bv. `configurator.jouwbedrijf.nl` — dan kunnen we een
custom domein opzetten. Neem hiervoor contact met ons op.)

**Kan ik de prijzen of functies later aanpassen?**
Ja — laat het ons weten, dan passen we het aan jouw `reseller`-id aan. Je hoeft
de embed-code op je site dan niet te wijzigen.

**Werkt het op mobiel?**
Ja, de configurator is volledig responsive. Geef 'm wel voldoende hoogte
(zie sectie 3).

**Mijn logo wordt niet goed weergegeven.**
Lever ons een logo aan dat goed leesbaar is op een lichte achtergrond
(bij voorkeur PNG of SVG met transparante achtergrond). Wij stellen het in.

---

## 6. Hulp nodig?

Loop je ergens tegenaan bij het plaatsen? Stuur ons een mailtje met je
website-platform en een link naar de pagina, dan helpen we je verder.
