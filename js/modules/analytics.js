/**
 * analytics.js
 * Analitika és statisztikák a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { safeJsonParse } from '../utils/helpers.js';

/**
 * Felhasználói választások statisztikáinak lekérése
 * 
 * @param {string} userId - Felhasználó azonosító (opcionális)
 * @returns {Object} Statisztikák objektum
 */
export function getUserChoiceStats(userId = null) {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    
    // Ha van userId, szűrjük a választásokat
    const userChoices = userId 
        ? choices.filter(choice => choice.userId === userId)
        : choices;
    
    if (userChoices.length === 0) {
        return {
            totalChoices: 0,
            avgDecisionTime: 0,
            avgSustainabilityIndex: 0,
            avgEnvScore: 0,
            avgNutriScore: 0,
            categoryCounts: {},
            testGroupCounts: {}
        };
    }
    
    // Átlagos döntési idő
    const avgDecisionTime = userChoices.reduce((sum, choice) => 
        sum + (choice.decisionTime || 0), 0) / userChoices.length;
    
    // Átlagos fenntarthatósági pontszám
    const avgSustainabilityIndex = userChoices.reduce((sum, choice) => 
        sum + (choice.sustainabilityIndex || 0), 0) / userChoices.length;
    
    // Átlagos környezeti pontszám
    const avgEnvScore = userChoices.reduce((sum, choice) => 
        sum + (choice.envScore || 0), 0) / userChoices.length;
    
    // Átlagos táplálkozási pontszám
    const avgNutriScore = userChoices.reduce((sum, choice) => 
        sum + (choice.nutriScore || 0), 0) / userChoices.length;
    
    // Kategória statisztikák
    const categoryCounts = {};
    userChoices.forEach(choice => {
        const category = choice.recipeCategory || 'egyéb';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // Teszt csoport statisztikák
    const testGroupCounts = {};
    userChoices.forEach(choice => {
        const group = choice.testGroup || 'ismeretlen';
        testGroupCounts[group] = (testGroupCounts[group] || 0) + 1;
    });
    
    return {
        totalChoices: userChoices.length,
        avgDecisionTime,
        avgSustainabilityIndex,
        avgEnvScore,
        avgNutriScore,
        categoryCounts,
        testGroupCounts
    };
}

/**
 * Kategória-alapú fenntarthatósági elemzés
 * 
 * @param {Array} recipes - Receptek tömbje
 * @returns {Object} Kategória elemzés objektum
 */
export function analyzeCategoriesWithEcoScore(recipes) {
    if (!recipes || recipes.length === 0) return {};
    
    const categories = {};
    
    recipes.forEach(recipe => {
        const cat = recipe.category || 'egyéb';
        
        if (!categories[cat]) {
            categories[cat] = {
                count: 0,
                avgEcoScore: 0,
                avgEnvScore: 0,
                avgNutriScore: 0
            };
        }
        
        categories[cat].count++;
        categories[cat].avgEcoScore += recipe.sustainability_index || 0;
        categories[cat].avgEnvScore += recipe.env_score || 0;
        categories[cat].avgNutriScore += recipe.nutri_score || 0;
    });
    
    // Átlagok számítása
    Object.values(categories).forEach(category => {
        if (category.count > 0) {
            category.avgEcoScore = category.avgEcoScore / category.count;
            category.avgEnvScore = category.avgEnvScore / category.count;
            category.avgNutriScore = category.avgNutriScore / category.count;
        }
    });
    
    return categories;
}

/**
 * Teszt csoport alapú választási elemzés
 * 
 * @returns {Object} Teszt csoport elemzés
 */
export function analyzeTestGroupChoices() {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    
    if (choices.length === 0) return {};
    
    const groupStats = {
        A: { count: 0, avgSustainability: 0, avgDecisionTime: 0 },
        B: { count: 0, avgSustainability: 0, avgDecisionTime: 0 },
        C: { count: 0, avgSustainability: 0, avgDecisionTime: 0 }
    };
    
    // Adatok összegyűjtése csoportok szerint
    choices.forEach(choice => {
        const group = choice.testGroup;
        
        if (groupStats[group]) {
            groupStats[group].count++;
            groupStats[group].avgSustainability += choice.sustainabilityIndex || 0;
            groupStats[group].avgDecisionTime += choice.decisionTime || 0;
        }
    });
    
    // Átlagok számítása
    Object.keys(groupStats).forEach(group => {
        if (groupStats[group].count > 0) {
            groupStats[group].avgSustainability = groupStats[group].avgSustainability / groupStats[group].count;
            groupStats[group].avgDecisionTime = groupStats[group].avgDecisionTime / groupStats[group].count;
        }
    });
    
    return groupStats;
}

/**
 * Legutóbbi választások lekérése
 * 
 * @param {number} limit - Választások száma
 * @param {string} userId - Felhasználó azonosító (opcionális)
 * @returns {Array} Választások tömbje
 */
export function getRecentChoices(limit = 10, userId = null) {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    
    // Szűrés felhasználó szerint, ha szükséges
    const filteredChoices = userId 
        ? choices.filter(choice => choice.userId === userId)
        : choices;
    
    // Rendezés időbélyeg szerint csökkenő sorrendben
    const sortedChoices = [...filteredChoices].sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
        return dateB - dateA;
    });
    
    return sortedChoices.slice(0, limit);
}

/**
 * Exportálja a felhasználói választásokat CSV formátumban
 * 
 * @returns {string} CSV szöveg
 */
export function exportChoicesToCSV() {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    
    if (choices.length === 0) return '';
    
    // CSV fejléc
    const headers = [
        'userId', 'userEmail', 'testGroup', 'recipeId', 'recipeName',
        'recipeCategory', 'rank', 'searchIngredients', 'decisionTime',
        'sustainabilityIndex', 'envScore', 'nutriScore', 'timestamp'
    ];
    
    // CSV fejléc sor
    let csv = headers.join(',') + '\n';
    
    // Adatsorok
    choices.forEach(choice => {
        const row = headers.map(header => {
            // String értékek idézőjelekkel
            const value = choice[header] || '';
            if (typeof value === 'string') {
                // Escape idézőjelek és más speciális karakterek
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        
        csv += row.join(',') + '\n';
    });
    
    return csv;
}
