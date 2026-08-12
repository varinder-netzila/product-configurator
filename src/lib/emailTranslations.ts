/** Translations for the B2B notification + customer confirmation emails.
 *  Sentences with {placeholders} are interpolated in email.ts. */
export interface EmailStrings {
  // Internal (ops) notification
  newRequest: string;
  productDetails: string;
  product: string;
  quantity: string;
  units: string;
  adviceUnitPrice: string;
  estimatedTotal: string;
  design: string;
  mockup: string;
  flatDesign: string;
  download: string;
  contactInfo: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  shippingAddress: string;
  additionalNotes: string;
  automatedFooter: string;
  // Customer confirmation
  custSubject: string; // {brand}
  thankYou: string;
  hi: string; // {name}
  received: string; // {qty} {product}
  questions: string;
  regards: string;
  team: string; // {brand}
}

const en: EmailStrings = {
  newRequest: 'New B2B Request',
  productDetails: 'Product Details',
  product: 'Product',
  quantity: 'Quantity',
  units: 'units',
  adviceUnitPrice: 'Advice Unit Price',
  estimatedTotal: 'Estimated Total',
  design: 'Design',
  mockup: '3D mockup',
  flatDesign: 'Flat print design',
  download: 'Download',
  contactInfo: 'Contact Information',
  name: 'Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  shippingAddress: 'Shipping Address',
  additionalNotes: 'Additional Notes',
  automatedFooter:
    'This is an automated notification from the 3D Bottle Configurator. Reply directly to this email to contact the customer.',
  custSubject: 'We received your request — {brand}',
  thankYou: 'Thank you for your request!',
  hi: 'Hi {name},',
  received:
    "We've received your request for {qty}x {product}. Our team will review your request and get back to you with a quote shortly.",
  questions: 'If you have any questions in the meantime, feel free to reply to this email.',
  regards: 'Best regards,',
  team: 'The {brand} Team',
};

const nl: EmailStrings = {
  newRequest: 'Nieuwe B2B-aanvraag',
  productDetails: 'Productgegevens',
  product: 'Product',
  quantity: 'Aantal',
  units: 'stuks',
  adviceUnitPrice: 'Adviesprijs per stuk',
  estimatedTotal: 'Geschat totaal',
  design: 'Ontwerp',
  mockup: '3D-mockup',
  flatDesign: 'Drukklaar ontwerp',
  download: 'Downloaden',
  contactInfo: 'Contactgegevens',
  name: 'Naam',
  company: 'Bedrijf',
  email: 'E-mail',
  phone: 'Telefoon',
  shippingAddress: 'Verzendadres',
  additionalNotes: 'Aanvullende opmerkingen',
  automatedFooter:
    'Dit is een automatische melding van de 3D-configurator. Antwoord direct op deze e-mail om contact op te nemen met de klant.',
  custSubject: 'We hebben je aanvraag ontvangen — {brand}',
  thankYou: 'Bedankt voor je aanvraag!',
  hi: 'Hoi {name},',
  received:
    'We hebben je aanvraag voor {qty}x {product} ontvangen. Ons team bekijkt je aanvraag en komt zo snel mogelijk bij je terug met een offerte.',
  questions: 'Heb je in de tussentijd vragen? Beantwoord deze e-mail gerust.',
  regards: 'Met vriendelijke groet,',
  team: 'Het team van {brand}',
};

const fr: EmailStrings = {
  newRequest: 'Nouvelle demande B2B',
  productDetails: 'Détails du produit',
  product: 'Produit',
  quantity: 'Quantité',
  units: 'unités',
  adviceUnitPrice: 'Prix conseillé unitaire',
  estimatedTotal: 'Total estimé',
  design: 'Design',
  mockup: 'Maquette 3D',
  flatDesign: "Fichier d'impression à plat",
  download: 'Télécharger',
  contactInfo: 'Coordonnées',
  name: 'Nom',
  company: 'Entreprise',
  email: 'E-mail',
  phone: 'Téléphone',
  shippingAddress: 'Adresse de livraison',
  additionalNotes: 'Remarques supplémentaires',
  automatedFooter:
    'Ceci est une notification automatique du configurateur 3D. Répondez directement à cet e-mail pour contacter le client.',
  custSubject: 'Nous avons reçu votre demande — {brand}',
  thankYou: 'Merci pour votre demande !',
  hi: 'Bonjour {name},',
  received:
    "Nous avons bien reçu votre demande pour {qty}x {product}. Notre équipe l'examinera et reviendra vers vous avec un devis dans les plus brefs délais.",
  questions: "Si vous avez des questions entre-temps, n'hésitez pas à répondre à cet e-mail.",
  regards: 'Cordialement,',
  team: "L'équipe {brand}",
};

const de: EmailStrings = {
  newRequest: 'Neue B2B-Anfrage',
  productDetails: 'Produktdetails',
  product: 'Produkt',
  quantity: 'Menge',
  units: 'Stück',
  adviceUnitPrice: 'Empfohlener Stückpreis',
  estimatedTotal: 'Geschätzte Gesamtsumme',
  design: 'Design',
  mockup: '3D-Mockup',
  flatDesign: 'Druckfertiges Design',
  download: 'Herunterladen',
  contactInfo: 'Kontaktdaten',
  name: 'Name',
  company: 'Firma',
  email: 'E-Mail',
  phone: 'Telefon',
  shippingAddress: 'Lieferadresse',
  additionalNotes: 'Zusätzliche Anmerkungen',
  automatedFooter:
    'Dies ist eine automatische Benachrichtigung vom 3D-Konfigurator. Antworten Sie direkt auf diese E-Mail, um den Kunden zu kontaktieren.',
  custSubject: 'Wir haben Ihre Anfrage erhalten — {brand}',
  thankYou: 'Vielen Dank für Ihre Anfrage!',
  hi: 'Hallo {name},',
  received:
    'Wir haben Ihre Anfrage für {qty}x {product} erhalten. Unser Team prüft Ihre Anfrage und meldet sich in Kürze mit einem Angebot.',
  questions: 'Bei Fragen in der Zwischenzeit antworten Sie einfach auf diese E-Mail.',
  regards: 'Mit freundlichen Grüßen,',
  team: 'Das {brand}-Team',
};

const TABLE: Record<string, EmailStrings> = { en, nl, fr, de };

/** Email strings for a locale, falling back to English. */
export function emailStrings(locale?: string): EmailStrings {
  return TABLE[(locale || '').toLowerCase()] ?? en;
}
