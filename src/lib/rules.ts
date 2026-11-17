/*
 * Règles de contenu Zelko, appliquées côté serveur aux annonces et aux messages.
 * Renvoie un message d'erreur clair, ou null si le texte est accepté.
 */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Contenus interdits à la vente
const FORBIDDEN: [RegExp, string][] = [
  [/\b(hacks?|cheats?|aimbot|wallhack|triche[rs]?|boosting|kamas?)\b/, 'triche ou objets de jeu'],
  [/\b(armes?|pistolets?|fusils?|munitions?|couteaux? papillon|taser|poing americain)\b/, 'armes'],
  [/\b(drogues?|cannabis|weed|beuh|shit|cocaine|coke|ecstasy|mdma|lsd|champignons? hallucinogenes?|puff thc)\b/, 'drogues'],
  [/\b(contrefacons?|replique|repliques|fake|copie conforme|1:1|ua quality|rep )\b/, 'contrefaçons'],
  [/\b(medicaments?|ordonnance|viagra|xanax|anabolisants?|steroides?)\b/, 'médicaments'],
  [/\b(escort|sexe|porno|nudes?|onlyfans|contenu adulte)\b/, 'contenu adulte'],
  [/\b(compte (netflix|spotify|disney|fortnite|roblox|steam)|identifiants?|carte bancaire|cvv|faux papiers?|faux billets?)\b/, 'comptes, données ou documents'],
  [/\b(animaux? vivants?)\b/, 'animaux vivants'],
];

// Coordonnées et paiements hors du site (première cause d'arnaque)
const OFFSITE: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'adresse email'],
  [/\b(https?:\/\/|www\.)\S+|\b[\w-]+\.(com|fr|be|net|org|io|me|gg|ly)\b/, 'lien externe'],
  [/\b(paypal|lydia|wero|revolut|western union|moneygram|virement|iban|crypto|bitcoin|usdt|paysafecard|cash ?app)\b/, 'paiement hors de Zelko'],
  [/\b(whatsapp|whats app|telegram|snapchat|snap|insta(gram)?|discord|signal)\b/, 'contact hors de Zelko'],
];

const hasPhone = (t: string) => (t.match(/\+?\d[\d .\-()]{7,}\d/g) ?? []).some(m => m.replace(/\D/g, '').length >= 9);

export function checkListing(text: string): string | null {
  const t = norm(text);
  if (hasPhone(t)) return 'Annonce refusée : numéro de téléphone interdit. Toutes les ventes et paiements se font sur Zelko.';
  for (const [rx, what] of FORBIDDEN) if (rx.test(t)) return 'Annonce refusée : vente interdite (' + what + '). Consultez les règles de Zelko.';
  for (const [rx, what] of OFFSITE) if (rx.test(t)) return 'Annonce refusée : ' + what + ' interdit. Toutes les ventes et paiements se font sur Zelko.';
  return null;
}

export function checkMessage(text: string): string | null {
  const t = norm(text);
  if (hasPhone(t)) return 'Message bloqué : numéro de téléphone interdit. Pour votre sécurité, payez et discutez uniquement sur Zelko.';
  for (const [rx, what] of OFFSITE) if (rx.test(t)) return 'Message bloqué : ' + what + ' interdit. Pour votre sécurité, payez et discutez uniquement sur Zelko.';
  return null;
}

export const REPORT_REASONS: Record<string, string> = {
  SCAM: 'Arnaque ou fraude',
  FORBIDDEN: 'Objet interdit',
  FAKE: 'Contrefaçon',
  OFFSITE: 'Demande de paiement ou contact hors Zelko',
  OFFENSIVE: 'Contenu choquant ou inapproprié',
  OTHER: 'Autre',
};
export const HIDE_AFTER = 3;
