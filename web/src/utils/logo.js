/**
 * Shared logo resolution logic - eliminates duplication across CardGrid, StatsManage, etc.
 */

export function getCardLogo(card) {
  if (card.custom_logo_path) return '/uploads/' + card.custom_logo_path;
  if (card.logo_url) return card.logo_url;
  if (!card.url) return '/default-favicon.png';
  try {
    const url = new URL(card.url);
    return url.origin + '/favicon.ico';
  } catch {
    return '/default-favicon.png';
  }
}

export function onLogoError(e) {
  e.target.src = '/default-favicon.png';
}
