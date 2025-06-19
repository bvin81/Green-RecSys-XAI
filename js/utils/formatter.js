/**
 * formatter.js
 * Adatformázó segédfüggvények a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

/**
 * Összetevők tisztítása és formázása
 * Eltávolítja a c(), idézőjeleket és egyéb felesleges karaktereket
 * @param {string} ingredients - Nyers összetevő string
 * @returns {string} Formázott összetevő lista
 */
export function formatIngredients(ingredients) {
    if (!ingredients) return "Nincs információ";
    
    return ingredients
        .replace(/^c\(|\)$/g, '')        // Eltávolítja a c( és ) karaktereket
        .replace(/"/g, '')               // Eltávolítja az idézőjeleket
        .replace(/,\s*/g, ', ')          // Egységesíti a vesszőt követő szóközöket
        .replace(/\[\d+:\d+\]/g, '')     // Eltávolítja az indexelési jelöléseket
        .trim();
}

/**
 * Recept név formázása
 * Eltávolítja a felesleges karaktereket, korlátozza a hosszát
 * @param {string} name - Recept név
 * @param {number} maxLength - Maximális hossz (opcionális)
 * @returns {string} Formázott recept név
 */
export function formatRecipeName(name, maxLength = 50) {
    if (!name) return "Névtelen recept";
    
    // Tisztítás és hossz korlátozás
    const cleanName = name
        .replace(/['"]/g, '')           // Eltávolítja az idézőjeleket
        .trim();
    
    if (cleanName.length <= maxLength) return cleanName;
    return cleanName.substring(0, maxLength) + '...';
}

/**
 * Idő formázás
 * @param {number} seconds - Másodpercek
 * @returns {string} Formázott idő
 */
export function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(1)} másodperc`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
        return `${minutes} perc`;
    }
    
    return `${minutes} perc ${remainingSeconds.toFixed(0)} másodperc`;
}

/**
 * Pontszám formázás
 * @param {number} score - Pontszám
 * @param {number} decimals - Tizedesjegyek száma
 * @returns {string} Formázott pontszám
 */
export function formatScore(score, decimals = 1) {
    if (score === undefined || score === null) return "N/A";
    return score.toFixed(decimals);
}

/**
 * Keresett kifejezések kiemelése
 * @param {string} text - Szöveg
 * @param {string} searchTerms - Keresési kifejezések
 * @returns {string} Kiemelt szöveg
 */
export function highlightSearchTerms(text, searchTerms) {
    if (!text || !searchTerms) return text;
    
    const formattedText = formatIngredients(text);
    const terms = searchTerms.toLowerCase().split(/[,\s]+/).filter(term => term.length > 2);
    
    if (terms.length === 0) return formattedText;
    
    let result = formattedText;
    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        result = result.replace(regex, '<strong>$1</strong>');
    });
    
    return result;
}
