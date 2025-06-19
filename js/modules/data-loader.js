/**
 * data-loader.js
 * Adatok betöltése és előkészítése a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { calculateSustainabilityScore, determineCategory, getCategoryIcon } from './sustainability.js';
import { safeJsonParse } from '../utils/helpers.js';

/**
 * Recept adatok betöltése
 * 
 * @returns {Promise<Array>} Betöltött receptek tömbje
 */
export async function loadRecipeData() {
    console.log('📋 Recept adatok betöltése...');
    
    try {
        const response = await fetch(CONFIG.DATA_SOURCE);
        
        if (response.ok) {
            const recipes = await response.json();
            console.log('✅ Receptek sikeresen betöltve:', recipes.length, 'recept');
            return recipes;
        } else {
            throw new Error(`HTTP ${response.status}: Receptek nem elérhetők`);
        }
    } catch (error) {
        console.warn('⚠️ Receptek betöltése sikertelen:', error.message);
        console.log('🔄 Fallback adatok használata...');
        return loadFallbackData();
    }
}

/**
 * Fallback adatok betöltése hiba esetén
 * 
 * @returns {Array} Alapértelmezett receptek
 */
function loadFallbackData() {
    // Egyszerű fallback adatok teszt célra
    return [
        {
            recipeid: 1,
            name: "Egyszerű paradicsomleves",
            ingredients: "paradicsom, hagyma, só, bors, fokhagyma",
            category: "leves",
            env_score: 25.5,
            nutri_score: 78.2,
            sustainability_index: 70
        },
        {
            recipeid: 2,
            name: "Csirkemell rizibizivel",
            ingredients: "csirkemell, rizs, borsó, sárgarépa, só, bors",
            category: "főétel",
            env_score: 58.3,
            nutri_score: 65.1,
            sustainability_index: 45
        },
        {
            recipeid: 3,
            name: "Uborkasaláta",
            ingredients: "uborka, tejföl, kapor, só, bors, cukor",
            category: "saláta",
            env_score: 15.2,
            nutri_score: 72.8,
            sustainability_index: 85
        }
    ];
}

/**
 * Receptek előkészítése, érvénytelen adatok szűrése,
 * fenntarthatósági pontszámok újraszámítása
 * 
 * @param {Array} recipes - Nyers recept adatok
 * @returns {Array} Előkészített receptek
 */
export function prepareRecipes(recipes) {
    console.log('🔧 Receptek előkészítése és fenntarthatóság újraszámítása...');
    
    let validRecipes = 0;
    let filteredRecipes = [];
    let recalculatedCount = 0;
    
    recipes.forEach((recipe, index) => {
        // 1. ÉRVÉNYES RECEPTEK SZŰRÉSE (0 értékek kiszűrése)
        const envScore = recipe.env_score || 0;
        const nutriScore = recipe.nutri_score || 0;
        
        // Ha valamelyik pontszám 0 vagy hiányzik, kihagyjuk
        if (envScore <= 0 || nutriScore <= 0) {
            console.log(`❌ Recept kihagyva (0 pontszám): ${recipe.name || 'Névtelen'} - env:${envScore}, nutri:${nutriScore}`);
            return; // Kihagyjuk ezt a receptet
        }
        
        // 2. FENNTARTHATÓSÁG ÚJRASZÁMÍTÁSA
        const originalSustainability = recipe.sustainability_index || 0;
        const calculatedSustainability = calculateSustainabilityScore(recipe);
        
        recipe.sustainability_index = calculatedSustainability;
        recalculatedCount++;
        
        if (Math.abs(originalSustainability - calculatedSustainability) > 10) {
            console.log(`🔄 Fenntarthatóság változás: ${recipe.name?.substring(0, 30)} - ${originalSustainability.toFixed(1)} → ${calculatedSustainability.toFixed(1)}`);
        }
        
        // 3. KATEGÓRIA ÉS IKON HOZZÁADÁSA
        if (!recipe.category) {
            recipe.category = determineCategory(recipe);
        }
        
        if (!recipe.categoryIcon) {
            recipe.categoryIcon = getCategoryIcon(recipe.category);
        }
        
        // 4. BIZTONSÁGOS ÉRTÉKEK
        recipe.name = recipe.name || `Recept #${recipe.recipeid || index + 1}`;
        recipe.ingredients = recipe.ingredients || 'Ismeretlen hozzávalók';
        
        // Érvényes recept hozzáadása
        filteredRecipes.push(recipe);
        validRecipes++;
    });
    
    // Statisztikák
    const categoryCounts = {};
    filteredRecipes.forEach(recipe => {
        const cat = recipe.category || 'egyéb';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    console.log('✅ Előkészítés befejezve:');
    console.log('   - Érvényes receptek:', validRecipes);
    console.log('   - Újraszámított fenntarthatóság:', recalculatedCount);
    console.log('   - Kategória megoszlás:', categoryCounts);
    
    // Fenntarthatóság statisztikák
    if (filteredRecipes.length > 0) {
        const avgSustainability = filteredRecipes.reduce((sum, r) => sum + (r.sustainability_index || 0), 0) / filteredRecipes.length;
        const minSustainability = Math.min(...filteredRecipes.map(r => r.sustainability_index || 0));
        const maxSustainability = Math.max(...filteredRecipes.map(r => r.sustainability_index || 0));
        
        console.log('📊 Fenntarthatóság statisztikák:');
        console.log(`   - Átlag: ${avgSustainability.toFixed(1)}`);
        console.log(`   - Min: ${minSustainability.toFixed(1)}`);
        console.log(`   - Max: ${maxSustainability.toFixed(1)}`);
    }
    
    return filteredRecipes;
}
