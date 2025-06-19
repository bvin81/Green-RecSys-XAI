/**
 * helpers.js
 * Általános segédfüggvények a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

/**
 * Véletlenszerűen kever egy tömböt (Fisher-Yates algoritmus)
 * @param {Array} array - Keverendő tömb
 * @returns {Array} Kevert tömb (új példány)
 */
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Egyszerű hash függvény stringekhez
 * @param {string} str - Bemeneti string
 * @returns {number} Hash érték
 */
export function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Két tömb közös elemeinek száma
 * @param {Array} arr1 - Első tömb
 * @param {Array} arr2 - Második tömb
 * @returns {number} Közös elemek száma
 */
export function countCommonElements(arr1, arr2) {
    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    return arr2.filter(item => set1.has(item.toLowerCase())).length;
}

/**
 * Generál egy egyedi azonosítót
 * @returns {string} Egyedi azonosító
 */
export function generateUniqueId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * Biztonságos JSON parse
 * @param {string} str - JSON string
 * @param {*} defaultValue - Alapértelmezett érték hiba esetén
 * @returns {*} Parsed érték vagy alapértelmezett
 */
export function safeJsonParse(str, defaultValue = null) {
    try {
        return str ? JSON.parse(str) : defaultValue;
    } catch (error) {
        console.error('JSON parse hiba:', error);
        return defaultValue;
    }
}

/**
 * Biztonságos JSON stringify
 * @param {*} value - Érték
 * @returns {string} JSON string vagy üres string hiba esetén
 */
export function safeJsonStringify(value) {
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.error('JSON stringify hiba:', error);
        return '';
    }
}

/**
 * Objektum vagy tömb üres-e
 * @param {Object|Array} obj - Vizsgálandó objektum vagy tömb
 * @returns {boolean} Üres-e
 */
export function isEmpty(obj) {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

/**
 * Kivesz egy elemet a tömbből érték alapján
 * @param {Array} array - Tömb
 * @param {*} value - Keresett érték
 * @param {string} property - Tulajdonság (opcionális, ha objektumok tömbje)
 * @returns {Array} Módosított tömb (új példány)
 */
export function removeFromArray(array, value, property = null) {
    if (!array || !Array.isArray(array)) return [];
    
    return array.filter(item => {
        if (property) {
            return item[property] !== value;
        }
        return item !== value;
    });
}
