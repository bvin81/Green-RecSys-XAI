/**
 * user-manager.js
 * Felhasználó kezelés a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { generateUniqueId, simpleHash, safeJsonParse, safeJsonStringify } from '../utils/helpers.js';

/**
 * Meglévő felhasználó ellenőrzése
 * 
 * @returns {Object|null} Felhasználó objektum vagy null
 */
export function checkExistingUser() {
    try {
        const savedUserData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        
        if (savedUserData) {
            const userData = JSON.parse(savedUserData);
            console.log('✅ Meglévő felhasználó:', userData.email);
            return userData;
        }
    } catch (error) {
        console.error('❌ Felhasználói adatok ellenőrzési hiba:', error);
        // Hibás adat esetén töröljük
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    }
    
    return null;
}

/**
 * Felhasználó regisztrálása
 * 
 * @param {string} email - Email cím
 * @returns {Object} Felhasználó objektum
 */
export function registerUser(email) {
    if (!email || !email.includes('@')) {
        throw new Error('Érvénytelen email cím');
    }
    
    // Egyedi User ID generálás
    const userId = generateUniqueId();
    
    // A/B/C teszt csoport hozzárendelés
    const testGroup = assignTestGroup(userId);
    
    // Felhasználó objektum
    const user = {
        id: userId,
        email: email,
        testGroup: testGroup,
        registeredAt: new Date().toISOString(),
        version: CONFIG.VERSION
    };
    
    // Mentés lokális tárolóba
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(user));
    
    console.log('✅ Regisztráció sikeres:', user);
    
    return user;
}

/**
 * Felhasználói választás rögzítése
 * 
 * @param {Object} user - Felhasználó objektum
 * @param {Object} recipe - Kiválasztott recept
 * @param {number} rank - Recept rangsor pozíciója
 * @param {string} searchIngredients - Keresési kifejezés
 * @param {number} decisionTime - Döntési idő másodpercekben
 * @returns {Object} Rögzített választás
 */
export function recordUserChoice(user, recipe, rank, searchIngredients, decisionTime, source = 'search') {
    if (!user || !recipe) {
        console.error('❌ Hiányzó felhasználó vagy recept adat!');
        return null;
    }
    
    // Választási adatok összeállítása
    const choiceData = {
        userId: user.id,
        userEmail: user.email,
        testGroup: user.testGroup,
        recipeId: recipe.recipeid,
        recipeName: recipe.name,
        recipeCategory: recipe.category || 'unknown',
        rank: rank,
        searchIngredients: searchIngredients,
        decisionTime: decisionTime,
        sustainabilityIndex: recipe.sustainability_index || 0,
        envScore: recipe.env_score || 0,
        nutriScore: recipe.nutri_score || 0,
        source: source,  // 'search' vagy 'ai-recommendation'
        timestamp: new Date().toISOString()
    };
    
    // Meglévő választások lekérése és frissítése
    const existingChoices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    existingChoices.push(choiceData);
    
    // Frissített választások mentése
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHOICES, safeJsonStringify(existingChoices));
    
    console.log(`✅ Választás rögzítve (${source}): ${choiceData.recipeName}`);
    
    return choiceData;
}

/**
 * Teszt csoport hozzárendelése
 * Konzisztens hozzárendelés a felhasználó ID alapján
 * 
 * @param {string} userId - Felhasználó azonosító
 * @returns {string} Teszt csoport (A, B, C)
 */
export function assignTestGroup(userId) {
    // Hash alapú konzisztens csoport hozzárendelés (33-33-34%)
    const hash = simpleHash(userId.toString());
    const groups = ['A', 'B', 'C'];
    return groups[hash % 3];
}

/**
 * Teszt csoport leírásának lekérése
 * 
 * @param {string} testGroup - Teszt csoport (A, B, C)
 * @returns {string} Csoport leírása
 */
export function getTestGroupDescription(testGroup) {
    return CONFIG.TEST_GROUPS[testGroup] || 'Ismeretlen csoport';
}

/**
 * Felhasználói adatok törlése
 * 
 * @returns {boolean} Sikeres törlés
 */
export function clearUserData() {
    try {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        console.log('✅ Felhasználói adatok törölve');
        return true;
    } catch (error) {
        console.error('❌ Felhasználói adatok törlési hiba:', error);
        return false;
    }
}

/**
 * Felhasználói választások törlése
 * 
 * @returns {boolean} Sikeres törlés
 */
export function clearUserChoices() {
    try {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CHOICES);
        console.log('✅ Felhasználói választások törölve');
        return true;
    } catch (error) {
        console.error('❌ Felhasználói választások törlési hiba:', error);
        return false;
    }
}

/**
 * Összes lokális adat törlése
 * 
 * @returns {boolean} Sikeres törlés
 */
export function clearAllData() {
    try {
        localStorage.clear();
        console.log('✅ Összes lokális adat törölve');
        return true;
    } catch (error) {
        console.error('❌ Lokális adatok törlési hiba:', error);
        return false;
    }
}
