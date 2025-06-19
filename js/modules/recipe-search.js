/**
 * recipe-search.js
 * Recept keresési logika a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { shuffleArray, countCommonElements } from '../utils/helpers.js';

/**
 * Receptek keresése a megadott hozzávalók alapján
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {string} ingredientsQuery - Keresési kifejezés (hozzávalók)
 * @param {string} testGroup - Teszt csoport (A, B, C)
 * @returns {Array} Találati receptek
 */
export function searchRecipes(recipes, ingredientsQuery, testGroup) {
    console.log('🔍 Keresés:', ingredientsQuery);
    console.log('👥 Teszt csoport:', testGroup);
    
    if (!recipes || !recipes.length || !ingredientsQuery) {
        console.warn('⚠️ Üres recept lista vagy keresés!');
        return [];
    }
    
    // 1. Keresési kifejezés feldolgozása
    const searchTerms = ingredientsQuery.toLowerCase()
        .split(/[,\s]+/)
        .filter(term => term.length >= 2);
    
    if (searchTerms.length === 0) {
        console.warn('⚠️ Nincs érvényes keresési kifejezés!');
        return [];
    }
    
    console.log('🔎 Keresett hozzávalók:', searchTerms.join(', '));
    
    // 2. Hozzávaló egyezések keresése
    const matchResults = findMatchingRecipes(recipes, searchTerms);
    
    // 3. Találatok rendezése teszt csoport szerint
    const sortedResults = applySortingStrategy(matchResults, testGroup);
    
    // 4. Találatok korlátozása a konfigurált maximumra
    const finalResults = sortedResults.slice(0, CONFIG.SEARCH.MAX_RESULTS);
    
    console.log('📋 Végső eredmények:', finalResults.length, 'recept');
    
    // Debug: fenntarthatóság ellenőrzése
    finalResults.forEach((recipe, idx) => {
        console.log(`   ${idx+1}. ${recipe.name?.substring(0, 25)} - Fenntarthatóság: ${recipe.sustainability_index.toFixed(1)} (env: ${recipe.env_score}, nutri: ${recipe.nutri_score})`);
    });
    
    return finalResults;
}

/**
 * Hozzávaló egyezések keresése
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {Array} searchTerms - Keresési kifejezések
 * @returns {Array} Találati receptek
 */
function findMatchingRecipes(recipes, searchTerms) {
    // Először pontos egyezések keresése
    let exactMatches = recipes.filter(recipe => {
        const ingredients = (recipe.ingredients || '').toLowerCase();
        return searchTerms.some(term => ingredients.includes(term));
    });
    
    console.log('🔍 Pontos egyezések:', exactMatches.length);
    
    // Ha kevés a találat, próbáljunk tágabb egyezéseket találni
    if (exactMatches.length < 4 && searchTerms.length > 0) {
        const fuzzyMatches = recipes.filter(recipe => {
            if (exactMatches.some(existing => existing.recipeid === recipe.recipeid)) {
                return false; // Kihagyjuk a már megtalált recepteket
            }
            
            const ingredients = (recipe.ingredients || '').toLowerCase();
            const words = ingredients.split(/[,\s]+/);
            
            // Részleges egyezés (szavak kezdete)
            return searchTerms.some(term => 
                words.some(word => word.startsWith(term))
            );
        });
        
        exactMatches = [...exactMatches, ...fuzzyMatches.slice(0, 5)];
        console.log('🔍 Részleges egyezések hozzáadva:', exactMatches.length);
    }
    
    // Ha még mindig kevés találat, legjobb receptek hozzáadása
    if (exactMatches.length < 5 && CONFIG.SEARCH.INCLUDE_TOP_SUSTAINABLE) {
        const topRecipes = recipes
            .filter(recipe => !exactMatches.some(existing => existing.recipeid === recipe.recipeid))
            .sort((a, b) => (b.sustainability_index || 0) - (a.sustainability_index || 0))
            .slice(0, 5 - exactMatches.length);
        
        exactMatches = [...exactMatches, ...topRecipes];
        console.log('⭐ Legjobb receptekkel kiegészítve:', exactMatches.length);
    }
    
    return exactMatches;
}

/**
 * Teszt csoport alapú rendezési stratégia alkalmazása
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {string} testGroup - Teszt csoport (A, B, C)
 * @returns {Array} Rendezett receptek
 */
function applySortingStrategy(recipes, testGroup) {
    switch (testGroup) {
        case 'A':
            // Kontroll csoport: véletlenszerű sorrend
            console.log('🎲 A csoport: véletlenszerű rendezés');
            return shuffleArray([...recipes]);
            
        case 'B':
        case 'C':
            // Kiegyensúlyozott fenntarthatósági és kedveltségi rendezés
            console.log('🌱 B/C csoport: kiegyensúlyozott rendezés');
            return balancedSorting(recipes);
            
        default:
            return recipes;
    }
}

/**
 * Kiegyensúlyozott rendezés (50% fenntarthatóság, 50% népszerűség)
 * 
 * @param {Array} recipes - Receptek tömbje
 * @returns {Array} Rendezett receptek
 */
function balancedSorting(recipes) {
    // Két rendezési szempont szerint külön-külön rendezzük a recepteket
    const sustainabilityRanked = [...recipes].sort((a, b) => 
        (b.sustainability_index || 0) - (a.sustainability_index || 0));
    
    const popularityRanked = [...recipes].sort((a, b) => 
        (b.aggregated_rating || 0) - (a.aggregated_rating || 0));
    
    // Ha nincs értékelés, használjuk a meal_score-t
    if (!recipes.some(r => r.aggregated_rating)) {
        popularityRanked.sort((a, b) => 
            (b.meal_score || 0) - (a.meal_score || 0));
    }
    
    // Váltakozva választunk a két rendezett listából
    const result = [];
    const maxResults = Math.min(CONFIG.SEARCH.MAX_RESULTS * 2, recipes.length);
    
    for (let i = 0; i < maxResults; i++) {
        const sourceIndex = Math.floor(i / 2);
        
        if (i % 2 === 0 && sustainabilityRanked[sourceIndex]) {
            // Még nem adtuk hozzá ezt a receptet?
            if (!result.some(r => r.recipeid === sustainabilityRanked[sourceIndex].recipeid)) {
                result.push(sustainabilityRanked[sourceIndex]);
            }
        } else if (popularityRanked[sourceIndex]) {
            // Még nem adtuk hozzá ezt a receptet?
            if (!result.some(r => r.recipeid === popularityRanked[sourceIndex].recipeid)) {
                result.push(popularityRanked[sourceIndex]);
            }
        }
    }
    
    return result.slice(0, CONFIG.SEARCH.MAX_RESULTS);
}

/**
 * Recept relevancia alapján történő rendezése
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {Array} searchTerms - Keresési kifejezések
 * @returns {Array} Rendezett receptek
 */
export function sortRecipesByRelevance(recipes, searchTerms) {
    const terms = searchTerms.toLowerCase().split(/[,\s]+/).filter(term => term.length >= 2);
    
    if (terms.length === 0) return recipes;
    
    return [...recipes].sort((a, b) => {
        const aIngredients = (a.ingredients || '').toLowerCase().split(/[,\s]+/);
        const bIngredients = (b.ingredients || '').toLowerCase().split(/[,\s]+/);
        
        const aMatches = countCommonElements(aIngredients, terms);
        const bMatches = countCommonElements(bIngredients, terms);
        
        return bMatches - aMatches;
    });
}
