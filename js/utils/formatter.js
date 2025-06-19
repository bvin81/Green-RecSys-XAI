/**
 * formatter.js
 * Formázó függvények és text processing
 * Verzió: 2025.06.20
 */

/**
 * Hozzávalók formázása olvasható formátumra
 * 
 * @param {string} ingredients - Nyers hozzávalók string
 * @returns {string} Formázott hozzávalók
 */
export function formatIngredients(ingredients) {
    if (!ingredients || typeof ingredients !== 'string') {
        return 'Nincs megadva';
    }
    
    let formatted = ingredients
        // R karakteres lista formátum eltávolítása: c("item1", "item2")
        .replace(/^c\s*\(/i, '')
        .replace(/\)$/, '')
        // Idézőjelek eltávolítása
        .replace(/["']/g, '')
        // Vessző utáni szóközök normalizálása
        .replace(/\s*,\s*/g, ', ')
        // Többszörös szóközök eltávolítása
        .replace(/\s+/g, ' ')
        .trim();
    
    // Ha még mindig vesszős lista, szebb formázás
    if (formatted.includes(',')) {
        const items = formatted.split(',').map(item => item.trim()).filter(item => item.length > 0);
        if (items.length > 1) {
            const lastItem = items.pop();
            return items.join(', ') + ' és ' + lastItem;
        }
    }
    
    return formatted || 'Nincs megadva';
}

/**
 * Recept név formázása
 * 
 * @param {string} name - Nyers recept név
 * @returns {string} Formázott név
 */
export function formatRecipeName(name) {
    if (!name || typeof name !== 'string') {
        return 'Névtelen recept';
    }
    
    return name
        .trim()
        // Első betű nagybetű
        .replace(/^\w/, c => c.toUpperCase())
        // Többszörös szóközök eltávolítása
        .replace(/\s+/g, ' ');
}

/**
 * Pontszám formázása
 * 
 * @param {number} score - Nyers pontszám
 * @param {number} decimals - Tizedesjegyek száma
 * @returns {string} Formázott pontszám
 */
export function formatScore(score, decimals = 1) {
    if (typeof score !== 'number' || isNaN(score)) {
        return '0.0';
    }
    
    return score.toFixed(decimals);
}

/**
 * Idő formázása (másodpercből)
 * 
 * @param {number} seconds - Másodpercek
 * @returns {string} Formázott idő
 */
export function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return '0s';
    }
    
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
}

/**
 * Keresési kifejezések kiemelése a szövegben
 * 
 * @param {string} text - Szöveg
 * @param {string} searchTerms - Keresési kifejezések
 * @returns {string} Kiemelt szöveg HTML-lel
 */
export function highlightSearchTerms(text, searchTerms) {
    if (!text || !searchTerms) {
        return text || '';
    }
    
    // Keresési kifejezések feldolgozása
    const terms = searchTerms
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(term => term.length >= 2)
        .map(term => term.trim());
    
    if (terms.length === 0) {
        return text;
    }
    
    let highlightedText = text;
    
    terms.forEach(term => {
        const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
}

/**
 * RegExp escape függvény
 * 
 * @param {string} string - Escape-elendő string
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Százalék formázása
 * 
 * @param {number} value - Érték
 * @param {number} total - Összérték
 * @param {number} decimals - Tizedesjegyek
 * @returns {string} Formázott százalék
 */
export function formatPercentage(value, total, decimals = 1) {
    if (typeof value !== 'number' || typeof total !== 'number' || total === 0) {
        return '0%';
    }
    
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
}

/**
 * Szám formázása lokalizált formátumban
 * 
 * @param {number} number - Szám
 * @param {Object} options - Formázási opciók
 * @returns {string} Formázott szám
 */
export function formatNumber(number, options = {}) {
    if (typeof number !== 'number' || isNaN(number)) {
        return '0';
    }
    
    const defaultOptions = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: true
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    try {
        return number.toLocaleString('hu-HU', formatOptions);
    } catch (error) {
        // Fallback ha a lokalizáció nem támogatott
        return number.toFixed(formatOptions.maximumFractionDigits);
    }
}

/**
 * Fájlméret formázása
 * 
 * @param {number} bytes - Bájtok száma
 * @param {number} decimals - Tizedesjegyek
 * @returns {string} Formázott fájlméret
 */
export function formatFileSize(bytes, decimals = 2) {
    if (typeof bytes !== 'number' || bytes === 0) {
        return '0 B';
    }
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Relatív idő formázása (time ago)
 * 
 * @param {Date|string} date - Dátum
 * @returns {string} Relatív idő string
 */
export function formatTimeAgo(date) {
    const now = new Date();
    const targetDate = date instanceof Date ? date : new Date(date);
    
    if (isNaN(targetDate.getTime())) {
        return 'Érvénytelen dátum';
    }
    
    const diffMs = now.getTime() - targetDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
        return 'Most';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} perce`;
    } else if (diffHours < 24) {
        return `${diffHours} órája`;
    } else if (diffDays < 7) {
        return `${diffDays} napja`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} hete`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} hónapja`;
    } else {
        const years = Math.floor(diffDays / 365);
        return `${years} éve`;
    }
}

/**
 * Szöveg csonkítása
 * 
 * @param {string} text - Szöveg
 * @param {number} maxLength - Maximum hossz
 * @param {string} suffix - Végződés
 * @returns {string} Csonkított szöveg
 */
export function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    if (text.length <= maxLength) {
        return text;
    }
    
    // Szó határon vágás
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) {
        return truncated.substring(0, lastSpaceIndex) + suffix;
    }
    
    return truncated + suffix;
}

/**
 * Szöveg tisztítása HTML tag-ektől
 * 
 * @param {string} html - HTML string
 * @returns {string} Tiszta szöveg
 */
export function stripHtmlTags(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    // Egyszerű HTML tag eltávolítás
    return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Camel case konvertálása kebab case-re
 * 
 * @param {string} str - CamelCase string
 * @returns {string} kebab-case string
 */
export function camelToKebab(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Kebab case konvertálása camel case-re
 * 
 * @param {string} str - kebab-case string
 * @returns {string} camelCase string
 */
export function kebabToCamel(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Első betű nagybetűvé alakítása
 * 
 * @param {string} str - String
 * @returns {string} Kapitalizált string
 */
export function capitalize(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Minden szó első betűjének nagybetűvé alakítása
 * 
 * @param {string} str - String
 * @returns {string} Title case string
 */
export function toTitleCase(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}

/**
 * URL slug generálása
 * 
 * @param {string} text - Szöveg
 * @returns {string} URL-barát slug
 */
export function generateSlug(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text
        .toLowerCase()
        .trim()
        // Ékezetes karakterek normalizálása
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Csak betűk, számok és kötőjelek
        .replace(/[^a-z0-9\s-]/g, '')
        // Szóközök cseréje kötőjelre
        .replace(/\s+/g, '-')
        // Többszörös kötőjelek eltávolítása
        .replace(/-+/g, '-')
        // Kezdő és záró kötőjelek eltávolítása
        .replace(/^-+|-+$/g, '');
}

/**
 * Színkód validálása és formázása
 * 
 * @param {string} color - Színkód
 * @returns {string} Validált színkód vagy alapértelmezett
 */
export function formatColor(color) {
    if (!color || typeof color !== 'string') {
        return '#000000';
    }
    
    // Hex színkód validálás
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (hexRegex.test(color)) {
        return color.toLowerCase();
    }
    
    // Named colors (alapvető színek)
    const namedColors = {
        'red': '#ff0000',
        'green': '#008000',
        'blue': '#0000ff',
        'yellow': '#ffff00',
        'orange': '#ffa500',
        'purple': '#800080',
        'pink': '#ffc0cb',
        'brown': '#a52a2a',
        'black': '#000000',
        'white': '#ffffff',
        'gray': '#808080',
        'grey': '#808080'
    };
    
    const lowerColor = color.toLowerCase();
    return namedColors[lowerColor] || '#000000';
}
