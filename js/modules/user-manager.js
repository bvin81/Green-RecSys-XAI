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
            
            // Verzió ellenőrzése
            if (userData.version !== CONFIG.VERSION) {
                console.log('⚠️ Eltérő alkalmazás verzió, frissítés szükséges');
                userData.version = CONFIG.VERSION;
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(userData));
            }
            
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
    
    // Email cím normalizálása
    const normalizedEmail = email.trim().toLowerCase();
    
    // Egyedi User ID generálás
    const userId = generateUniqueId();
    
    // A/B/C teszt csoport hozzárendelés
    const testGroup = assignTestGroup(userId);
    
    // Felhasználó objektum
    const user = {
        id: userId,
        email: normalizedEmail,
        testGroup: testGroup,
        registeredAt: new Date().toISOString(),
        version: CONFIG.VERSION,
        sessionCount: 1,
        lastLoginAt: new Date().toISOString()
    };
    
    // Mentés lokális tárolóba
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(user));
    
    console.log('✅ Regisztráció sikeres:', {
        id: user.id,
        email: user.email,
        testGroup: user.testGroup
    });
    
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
 * @param {string} source - Választás forrása ('search', 'details', 'ai-recommendation')
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
        timestamp: new Date().toISOString(),
        sessionId: generateSessionId()
    };
    
    // Meglévő választások lekérése és frissítése
    const existingChoices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    existingChoices.push(choiceData);
    
    // Frissített választások mentése
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHOICES, safeJsonStringify(existingChoices));
    
    // Felhasználói statisztikák frissítése
    updateUserStats(user.id);
    
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
 * Munkamenet ID generálása
 * 
 * @returns {string} Egyedi munkamenet azonosító
 */
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Felhasználói statisztikák frissítése
 * 
 * @param {string} userId - Felhasználó azonosító
 */
function updateUserStats(userId) {
    try {
        const userData = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER), null);
        if (userData && userData.id === userId) {
            userData.lastActivityAt = new Date().toISOString();
            userData.totalChoices = (userData.totalChoices || 0) + 1;
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(userData));
        }
    } catch (error) {
        console.error('❌ Felhasználói statisztikák frissítési hiba:', error);
    }
}

/**
 * Felhasználói adatok frissítése
 * 
 * @param {Object} updates - Frissítendő adatok
 * @returns {Object|null} Frissített felhasználó objektum
 */
export function updateUser(updates) {
    try {
        const userData = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER), null);
        if (!userData) {
            console.warn('⚠️ Nincs felhasználói adat a frissítéshez');
            return null;
        }
        
        const updatedUser = { ...userData, ...updates };
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(updatedUser));
        
        console.log('✅ Felhasználói adatok frissítve');
        return updatedUser;
    } catch (error) {
        console.error('❌ Felhasználói adatok frissítési hiba:', error);
        return null;
    }
}

/**
 * Felhasználói választások lekérése
 * 
 * @param {string} userId - Felhasználó azonosító (opcionális)
 * @returns {Array} Választások tömbje
 */
export function getUserChoices(userId = null) {
    try {
        const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
        
        if (userId) {
            return choices.filter(choice => choice.userId === userId);
        }
        
        return choices;
    } catch (error) {
        console.error('❌ Felhasználói választások lekérési hiba:', error);
        return [];
    }
}

/**
 * Felhasználó bejelentkezése (munkamenet indítása)
 * 
 * @param {Object} user - Felhasználó objektum
 * @returns {Object} Frissített felhasználó objektum
 */
export function loginUser(user) {
    try {
        const updatedUser = {
            ...user,
            lastLoginAt: new Date().toISOString(),
            sessionCount: (user.sessionCount || 0) + 1
        };
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(updatedUser));
        console.log('✅ Felhasználó bejelentkezve:', updatedUser.email);
        
        return updatedUser;
    } catch (error) {
        console.error('❌ Bejelentkezési hiba:', error);
        return user;
    }
}

/**
 * Felhasználó kijelentkezése
 * 
 * @returns {boolean} Sikeres kijelentkezés
 */
export function logoutUser() {
    try {
        // Csak a munkamenet adatokat töröljük, a felhasználói profilt megtartjuk
        const userData = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER), null);
        if (userData) {
            userData.lastLogoutAt = new Date().toISOString();
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(userData));
        }
        
        console.log('✅ Felhasználó kijelentkezve');
        return true;
    } catch (error) {
        console.error('❌ Kijelentkezési hiba:', error);
        return false;
    }
}

/**
 * Felhasználói adatok exportálása
 * 
 * @param {string} userId - Felhasználó azonosító
 * @returns {Object} Exportálható adatok
 */
export function exportUserData(userId) {
    try {
        const userData = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER), null);
        const choices = getUserChoices(userId);
        
        if (!userData || userData.id !== userId) {
            throw new Error('Felhasználó nem található');
        }
        
        const exportData = {
            user: {
                id: userData.id,
                email: userData.email,
                testGroup: userData.testGroup,
                registeredAt: userData.registeredAt,
                totalChoices: choices.length,
                sessionCount: userData.sessionCount || 1
            },
            choices: choices.map(choice => ({
                recipeId: choice.recipeId,
                recipeName: choice.recipeName,
                recipeCategory: choice.recipeCategory,
                rank: choice.rank,
                searchIngredients: choice.searchIngredients,
                decisionTime: choice.decisionTime,
                sustainabilityIndex: choice.sustainabilityIndex,
                source: choice.source,
                timestamp: choice.timestamp
            })),
            exportedAt: new Date().toISOString(),
            version: CONFIG.VERSION
        };
        
        console.log('✅ Felhasználói adatok exportálva');
        return exportData;
    } catch (error) {
        console.error('❌ Adatok exportálási hiba:', error);
        return null;
    }
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

/**
 * Adatvédelmi beállítások kezelése
 * 
 * @param {Object} settings - Adatvédelmi beállítások
 * @returns {boolean} Sikeres mentés
 */
export function updatePrivacySettings(settings) {
    try {
        const currentSettings = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS), {});
        const updatedSettings = { ...currentSettings, privacy: settings };
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, safeJsonStringify(updatedSettings));
        console.log('✅ Adatvédelmi beállítások frissítve');
        return true;
    } catch (error) {
        console.error('❌ Adatvédelmi beállítások frissítési hiba:', error);
        return false;
    }
}

/**
 * Felhasználó anonimizálása
 * 
 * @param {string} userId - Felhasználó azonosító
 * @returns {boolean} Sikeres anonimizálás
 */
export function anonymizeUser(userId) {
    try {
        // Felhasználói adatok anonimizálása
        const userData = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER), null);
        if (userData && userData.id === userId) {
            userData.email = `anonymous_${userData.id.substr(0, 8)}@anonymized.local`;
            userData.anonymized = true;
            userData.anonymizedAt = new Date().toISOString();
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, safeJsonStringify(userData));
        }
        
        // Választások anonimizálása
        const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
        const updatedChoices = choices.map(choice => {
            if (choice.userId === userId) {
                return {
                    ...choice,
                    userEmail: userData.email,
                    anonymized: true
                };
            }
            return choice;
        });
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.CHOICES, safeJsonStringify(updatedChoices));
        
        console.log('✅ Felhasználó anonimizálva');
        return true;
    } catch (error) {
        console.error('❌ Anonimizálási hiba:', error);
        return false;
    }
}

/**
 * Teszt csoport statisztikák lekérése
 * 
 * @returns {Object} Teszt csoport eloszlás
 */
export function getTestGroupStats() {
    try {
        const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
        const stats = { A: 0, B: 0, C: 0, total: 0 };
        
        choices.forEach(choice => {
            if (choice.testGroup && stats.hasOwnProperty(choice.testGroup)) {
                stats[choice.testGroup]++;
                stats.total++;
            }
        });
        
        return stats;
    } catch (error) {
        console.error('❌ Teszt csoport statisztikák hiba:', error);
        return { A: 0, B: 0, C: 0, total: 0 };
    }
}
