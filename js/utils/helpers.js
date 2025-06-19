/**
 * helpers.js
 * Segédfüggvények és utility funkciók
 * Verzió: 2025.06.20
 */

/**
 * Biztonságos JSON parse
 * 
 * @param {string} str - JSON string
 * @param {*} defaultValue - Alapértelmezett érték hiba esetén
 * @returns {*} Parsed objektum vagy alapértelmezett érték
 */
export function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.warn('⚠️ JSON parse hiba:', error.message);
        return defaultValue;
    }
}

/**
 * Biztonságos JSON stringify
 * 
 * @param {*} obj - Objektum
 * @param {string} defaultValue - Alapértelmezett érték hiba esetén
 * @returns {string} JSON string vagy alapértelmezett érték
 */
export function safeJsonStringify(obj, defaultValue = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.error('❌ JSON stringify hiba:', error.message);
        return defaultValue;
    }
}

/**
 * Egyedi azonosító generálása
 * 
 * @returns {string} Egyedi ID
 */
export function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${randomPart}`;
}

/**
 * Egyszerű hash függvény
 * 
 * @param {string} str - Hash-elendő string
 * @returns {number} Hash érték
 */
export function simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32 bit integer-ré konvertálás
    }
    
    return Math.abs(hash);
}

/**
 * Tömb összekeverése (Fisher-Yates algoritmus)
 * 
 * @param {Array} array - Összekeverendő tömb
 * @returns {Array} Összekevert tömb
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
 * Közös elemek számának meghatározása két tömb között
 * 
 * @param {Array} arr1 - Első tömb
 * @param {Array} arr2 - Második tömb
 * @returns {number} Közös elemek száma
 */
export function countCommonElements(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
        return 0;
    }
    
    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    const set2 = new Set(arr2.map(item => item.toLowerCase()));
    
    let count = 0;
    for (const item of set1) {
        if (set2.has(item)) {
            count++;
        }
    }
    
    return count;
}

/**
 * String hasonlóság számítása (Levenshtein távolság alapú)
 * 
 * @param {string} str1 - Első string
 * @param {string} str2 - Második string
 * @returns {number} Hasonlóság 0-1 között
 */
export function calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const a = str1.toLowerCase();
    const b = str2.toLowerCase();
    
    if (a === b) return 1;
    
    const distance = levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

/**
 * Levenshtein távolság számítása
 * 
 * @param {string} str1 - Első string
 * @param {string} str2 - Második string
 * @returns {number} Távolság
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

/**
 * Debounce függvény
 * 
 * @param {Function} func - Debounce-olandó függvény
 * @param {number} delay - Késleltetés milliszekundumban
 * @returns {Function} Debounce-olt függvény
 */
export function debounce(func, delay) {
    let timeoutId;
    
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle függvény
 * 
 * @param {Function} func - Throttle-olandó függvény
 * @param {number} limit - Limit milliszekundumban
 * @returns {Function} Throttle-olt függvény
 */
export function throttle(func, limit) {
    let inThrottle;
    
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Szöveg tisztítása és normalizálása
 * 
 * @param {string} text - Tisztítandó szöveg
 * @returns {string} Tisztított szöveg
 */
export function cleanText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    return text
        .trim()
        .replace(/\s+/g, ' ')           // Többszörös szóközök eltávolítása
        .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '') // Spec. karakterek, ékezetek megtartása
        .toLowerCase();
}

/**
 * Email validáció
 * 
 * @param {string} email - Validálandó email cím
 * @returns {boolean} Érvényes email-e
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Szám intervallumba korlátozása
 * 
 * @param {number} value - Érték
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number} Korlátozott érték
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Tömb csoportosítása kulcs alapján
 * 
 * @param {Array} array - Csoportosítandó tömb
 * @param {string|Function} key - Csoportosítási kulcs vagy függvény
 * @returns {Object} Csoportosított objektum
 */
export function groupBy(array, key) {
    if (!Array.isArray(array)) {
        return {};
    }
    
    return array.reduce((groups, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        const group = groups[groupKey] || [];
        group.push(item);
        groups[groupKey] = group;
        return groups;
    }, {});
}

/**
 * Objektum mély klónozása
 * 
 * @param {*} obj - Klónozandó objektum
 * @returns {*} Klónozott objektum
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    
    return obj;
}

/**
 * Formázott dátum string generálása
 * 
 * @param {Date} date - Dátum objektum
 * @param {string} format - Formátum ('short', 'medium', 'long')
 * @returns {string} Formázott dátum
 */
export function formatDate(date, format = 'medium') {
    if (!(date instanceof Date) || isNaN(date)) {
        return 'Érvénytelen dátum';
    }
    
    const options = {
        short: { year: 'numeric', month: 'numeric', day: 'numeric' },
        medium: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
        long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
    };
    
    return date.toLocaleDateString('hu-HU', options[format] || options.medium);
}

/**
 * Késleltetés aszinkron függvényhez
 * 
 * @param {number} ms - Milliszekundum
 * @returns {Promise} Promise amely a megadott idő után resolve-ol
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry logika aszinkron függvényekhez
 * 
 * @param {Function} fn - Retry-olandó függvény
 * @param {number} maxRetries - Maximum újrapróbálkozások
 * @param {number} delayMs - Késleltetés újrapróbálkozások között
 * @returns {Promise} Promise az eredménnyel
 */
export async function retry(fn, maxRetries = 3, delayMs = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries) {
                console.warn(`⚠️ Újrapróbálkozás ${i + 1}/${maxRetries}:`, error.message);
                await delay(delayMs * Math.pow(2, i)); // Exponenciális backoff
            }
        }
    }
    
    throw lastError;
}

/**
 * Local Storage kapacitás ellenőrzése
 * 
 * @returns {Object} Kapacitás információk
 */
export function checkLocalStorageCapacity() {
    try {
        let used = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                used += localStorage[key].length + key.length;
            }
        }
        
        // 5MB limit tesztelése
        const testKey = 'test_capacity_key';
        let available = 0;
        
        try {
            const testData = 'x'.repeat(1024); // 1KB
            let testSize = 0;
            
            while (testSize < 5 * 1024 * 1024) { // 5MB
                localStorage.setItem(testKey + testSize, testData);
                testSize += 1024;
                available = testSize;
            }
        } catch (e) {
            // Kapacitás elérve
        } finally {
            // Teszt adatok törlése
            for (let i = 0; i < available; i += 1024) {
                localStorage.removeItem(testKey + i);
            }
        }
        
        return {
            used: Math.round(used / 1024), // KB
            available: Math.round(available / 1024), // KB
            total: Math.round((used + available) / 1024), // KB
            percentage: Math.round((used / (used + available)) * 100)
        };
    } catch (error) {
        console.error('❌ Local Storage kapacitás ellenőrzési hiba:', error);
        return { used: 0, available: 0, total: 0, percentage: 0 };
    }
}

/**
 * User Agent információk kinyerése
 * 
 * @returns {Object} Browser és OS információk
 */
export function getUserAgentInfo() {
    const ua = navigator.userAgent;
    
    const browser = {
        chrome: /Chrome/i.test(ua) && !/Edg/i.test(ua),
        firefox: /Firefox/i.test(ua),
        safari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
        edge: /Edg/i.test(ua),
        ie: /MSIE|Trident/i.test(ua)
    };
    
    const os = {
        windows: /Windows/i.test(ua),
        macos: /Macintosh|Mac OS X/i.test(ua),
        linux: /Linux/i.test(ua),
        android: /Android/i.test(ua),
        ios: /iPhone|iPad|iPod/i.test(ua)
    };
    
    const mobile = /Mobi|Android/i.test(ua);
    
    return {
        browser: Object.keys(browser).find(key => browser[key]) || 'unknown',
        os: Object.keys(os).find(key => os[key]) || 'unknown',
        mobile,
        userAgent: ua
    };
}
