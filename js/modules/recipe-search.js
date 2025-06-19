/**
 * recipe-search.js
 * Recept keresési logika a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { shuffleArray, countCommonElements, calculateStringSimilarity } from '../utils/helpers.js';

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
    const searchTerms = preprocessSearchQuery(ingredientsQuery);
    
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
    const finalResults = sortedResults.slice(0, CONFIG.SEARCH?.MAX_RESULTS || 10);
    
    console.log('📋 Végső eredmények:', finalResults.length, 'recept');
    
    // Debug: fenntarthatóság ellenőrzése
    finalResults.forEach((recipe, idx) => {
        console.log(`   ${idx+1}. ${recipe.name} - Eco-Score: ${recipe.sustainability_index || 'N/A'}`);
    });
    
    return finalResults;
}

/**
 * Keresési kifejezés előfeldolgozása
 * 
 * @param {string} query - Nyers keresési kifejezés
 * @returns {Array} Feldolgozott keresési kifejezések
 */
function preprocessSearchQuery(query) {
    if (!query || typeof query !== 'string') {
        return [];
    }
    
    return query.toLowerCase()
        .trim()
        // Speciális karakterek eltávolítása
        .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
        // Vesszők és egyéb elválasztók alapján szétbontás
        .split(/[,;+&\s]+/)
        // Rövid szavak kiszűrése és trim
        .map(term => term.trim())
        .filter(term => term.length >= 2)
        // Duplikátumok eltávolítása
        .filter((term, index, arr) => arr.indexOf(term) === index);
}

/**
 * Egyező receptek keresése
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {Array} searchTerms - Keresési kifejezések
 * @returns {Array} Pontozott találatok
 */
function findMatchingRecipes(recipes, searchTerms) {
    const matchResults = [];
    
    recipes.forEach(recipe => {
        const matchScore = calculateMatchScore(recipe, searchTerms);
        
        if (matchScore.totalScore > 0) {
            matchResults.push({
                recipe,
                matchScore: matchScore.totalScore,
                exactMatches: matchScore.exactMatches,
                partialMatches: matchScore.partialMatches,
                relevanceScore: matchScore.relevanceScore
            });
        }
    });
    
    return matchResults;
}

/**
 * Egyezési pontszám számítása egy receptre
 * 
 * @param {Object} recipe - Recept objektum
 * @param {Array} searchTerms - Keresési kifejezések
 * @returns {Object} Pontszám részletei
 */
function calculateMatchScore(recipe, searchTerms) {
    if (!recipe.ingredients) {
        return { totalScore: 0, exactMatches: 0, partialMatches: 0, relevanceScore: 0 };
    }
    
    // Recept hozzávalóinak előkészítése
    const recipeIngredients = preprocessRecipeIngredients(recipe.ingredients);
    
    let exactMatches = 0;
    let partialMatches = 0;
    let relevanceScore = 0;
    
    searchTerms.forEach(searchTerm => {
        let termMatched = false;
        
        // Pontos egyezés keresése
        recipeIngredients.forEach(ingredient => {
            if (ingredient === searchTerm) {
                exactMatches++;
                relevanceScore += 10; // Pontos egyezés magas pontszám
                termMatched = true;
            } else if (ingredient.includes(searchTerm) || searchTerm.includes(ingredient)) {
                if (!termMatched) { // Csak egyszer számoljuk a részleges egyezést
                    partialMatches++;
                    relevanceScore += 5; // Részleges egyezés közepes pontszám
                    termMatched = true;
                }
            } else {
                // String hasonlóság ellenőrzése (fuzzy matching)
                const similarity = calculateStringSimilarity(ingredient, searchTerm);
                if (similarity > 0.7 && !termMatched) {
                    partialMatches++;
                    relevanceScore += Math.round(similarity * 3); // Hasonlóság alapú pontszám
                    termMatched = true;
                }
            }
        });
        
        // Név alapú egyezés (alacsonyabb prioritás)
        if (!termMatched && recipe.name) {
            const nameLower = recipe.name.toLowerCase();
            if (nameLower.includes(searchTerm)) {
                partialMatches++;
                relevanceScore += 2; // Név egyezés alacsony pontszám
            }
        }
    });
    
    // Teljes pontszám számítása
    const coverageBonus = Math.round((exactMatches + partialMatches) / searchTerms.length * 5);
    const totalScore = relevanceScore + coverageBonus;
    
    return {
        totalScore,
        exactMatches,
        partialMatches,
        relevanceScore
    };
}

/**
 * Recept hozzávalóinak előfeldolgozása
 * 
 * @param {string} ingredients - Nyers hozzávalók string
 * @returns {Array} Tisztított hozzávalók lista
 */
function preprocessRecipeIngredients(ingredients) {
    if (!ingredients || typeof ingredients !== 'string') {
        return [];
    }
    
    return ingredients
        .toLowerCase()
        // R lista formátum eltávolítása
        .replace(/^c\s*\(/i, '')
        .replace(/\)$/, '')
        // Idézőjelek és speciális karakterek eltávolítása
        .replace(/["']/g, '')
        .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF,]/g, ' ')
        // Vesszők alapján szétbontás
        .split(/[,;]+/)
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient.length > 1);
}

/**
 * Rendezési stratégia alkalmazása teszt csoport szerint
 * 
 * @param {Array} matchResults - Találati eredmények
 * @param {string} testGroup - Teszt csoport (A, B, C)
 * @returns {Array} Rendezett receptek
 */
function applySortingStrategy(matchResults, testGroup) {
    let sortedResults;
    
    switch (testGroup) {
        case 'A':
            // Kontroll csoport: véletlenszerű sorrend
            sortedResults = shuffleArray(matchResults);
            console.log('📊 A csoport: Véletlenszerű rendezés');
            break;
            
        case 'B':
            // Relevancia + fenntarthatóság csoport: összetett rendezés
            sortedResults = sortByRelevanceAndSustainability(matchResults);
            console.log('📊 B csoport: Relevancia + fenntarthatóság rendezés');
            break;
            
        case 'C':
            // XAI csoport: fenntarthatóság prioritás
            sortedResults = sortBySustainabilityPriority(matchResults);
            console.log('📊 C csoport: Fenntarthatóság prioritás rendezés');
            break;
            
        default:
            // Alapértelmezett: relevancia alapú
            sortedResults = sortByRelevance(matchResults);
            console.log('📊 Alapértelmezett: Relevancia rendezés');
            break;
    }
    
    // Csak a recept objektumokat adjuk vissza
    return sortedResults.map(result => result.recipe);
}

/**
 * Rendezés relevancia szerint
 * 
 * @param {Array} matchResults - Találati eredmények
 * @returns {Array} Rendezett eredmények
 */
function sortByRelevance(matchResults) {
    return matchResults.sort((a, b) => {
        // Elsődleges: egyezési pontszám
        if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
        }
        
        // Másodlagos: pontos egyezések száma
        if (b.exactMatches !== a.exactMatches) {
            return b.exactMatches - a.exactMatches;
        }
        
        // Harmadlagos: részleges egyezések száma
        return b.partialMatches - a.partialMatches;
    });
}

/**
 * Rendezés relevancia és fenntarthatóság szerint (B csoport)
 * 
 * @param {Array} matchResults - Találati eredmények
 * @returns {Array} Rendezett eredmények
 */
function sortByRelevanceAndSustainability(matchResults) {
    return matchResults.sort((a, b) => {
        // Kombinált pontszám számítása: 70% relevancia + 30% fenntarthatóság
        const scoreA = (a.matchScore * 0.7) + ((a.recipe.sustainability_index || 50) * 0.3);
        const scoreB = (b.matchScore * 0.7) + ((b.recipe.sustainability_index || 50) * 0.3);
        
        if (Math.abs(scoreB - scoreA) > 1) {
            return scoreB - scoreA;
        }
        
        // Ha hasonló a kombinált pontszám, akkor fenntarthatóság szerint
        const sustainA = a.recipe.sustainability_index || 50;
        const sustainB = b.recipe.sustainability_index || 50;
        
        if (Math.abs(sustainB - sustainA) > 5) {
            return sustainB - sustainA;
        }
        
        // Végül relevancia szerint
        return b.matchScore - a.matchScore;
    });
}

/**
 * Rendezés fenntarthatóság prioritással (C csoport)
 * 
 * @param {Array} matchResults - Találati eredmények
 * @returns {Array} Rendezett eredmények
 */
function sortBySustainabilityPriority(matchResults) {
    return matchResults.sort((a, b) => {
        const sustainA = a.recipe.sustainability_index || 50;
        const sustainB = b.recipe.sustainability_index || 50;
        
        // Elsődleges: fenntarthatóság (nagyobb az jobb)
        if (Math.abs(sustainB - sustainA) > 3) {
            return sustainB - sustainA;
        }
        
        // Másodlagos: relevancia (hasonló fenntarthatóság esetén)
        if (Math.abs(b.matchScore - a.matchScore) > 2) {
            return b.matchScore - a.matchScore;
        }
        
        // Harmadlagos: környezeti hatás (kisebb az jobb)
        const envA = a.recipe.env_score || 50;
        const envB = b.recipe.env_score || 50;
        return envA - envB;
    });
}

/**
 * Receptek szűrése kategória szerint
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {string} category - Szűrendő kategória
 * @returns {Array} Szűrt receptek
 */
export function filterRecipesByCategory(recipes, category) {
    if (!recipes || !Array.isArray(recipes) || !category) {
        return recipes || [];
    }
    
    return recipes.filter(recipe => 
        recipe.category && recipe.category.toLowerCase() === category.toLowerCase()
    );
}

/**
 * Receptek szűrése fenntarthatósági küszöb szerint
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {number} minSustainability - Minimum fenntarthatósági pontszám
 * @returns {Array} Szűrt receptek
 */
export function filterRecipesBySustainability(recipes, minSustainability = 0) {
    if (!recipes || !Array.isArray(recipes)) {
        return [];
    }
    
    return recipes.filter(recipe => 
        (recipe.sustainability_index || 0) >= minSustainability
    );
}

/**
 * Fuzzy keresés hozzávalók alapján
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {string} query - Keresési kifejezés
 * @param {number} threshold - Hasonlósági küszöb (0-1)
 * @returns {Array} Találatok
 */
export function fuzzySearchRecipes(recipes, query, threshold = 0.6) {
    if (!recipes || !Array.isArray(recipes) || !query) {
        return [];
    }
    
    const searchTerms = preprocessSearchQuery(query);
    const results = [];
    
    recipes.forEach(recipe => {
        if (!recipe.ingredients) return;
        
        const recipeIngredients = preprocessRecipeIngredients(recipe.ingredients);
        let maxSimilarity = 0;
        let matchCount = 0;
        
        searchTerms.forEach(searchTerm => {
            recipeIngredients.forEach(ingredient => {
                const similarity = calculateStringSimilarity(searchTerm, ingredient);
                if (similarity > threshold) {
                    maxSimilarity = Math.max(maxSimilarity, similarity);
                    matchCount++;
                }
            });
        });
        
        if (maxSimilarity > threshold) {
            results.push({
                recipe,
                similarity: maxSimilarity,
                matchCount,
                score: (maxSimilarity * 0.7) + (matchCount / searchTerms.length * 0.3)
            });
        }
    });
    
    return results
        .sort((a, b) => b.score - a.score)
        .map(result => result.recipe);
}

/**
 * Keresési javaslatok generálása
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {string} partialQuery - Részleges keresési kifejezés
 * @param {number} limit - Maximum javaslatok száma
 * @returns {Array} Javaslatok
 */
export function generateSearchSuggestions(recipes, partialQuery, limit = 5) {
    if (!recipes || !Array.isArray(recipes) || !partialQuery || partialQuery.length < 2) {
        return [];
    }
    
    const query = partialQuery.toLowerCase().trim();
    const suggestions = new Set();
    
    // Összes hozzávaló gyűjtése
    const allIngredients = new Set();
    recipes.forEach(recipe => {
        if (recipe.ingredients) {
            const ingredients = preprocessRecipeIngredients(recipe.ingredients);
            ingredients.forEach(ingredient => allIngredients.add(ingredient));
        }
    });
    
    // Egyező hozzávalók keresése
    allIngredients.forEach(ingredient => {
        if (ingredient.includes(query) || query.includes(ingredient)) {
            suggestions.add(ingredient);
        } else {
            // Fuzzy matching
            const similarity = calculateStringSimilarity(query, ingredient);
            if (similarity > 0.7) {
                suggestions.add(ingredient);
            }
        }
    });
    
    // Receptnevek ellenőrzése
    recipes.forEach(recipe => {
        if (recipe.name && recipe.name.toLowerCase().includes(query)) {
            const words = recipe.name.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.includes(query) && word.length > 2) {
                    suggestions.add(word);
                }
            });
        }
    });
    
    return Array.from(suggestions)
        .sort((a, b) => {
            // Prioritás: pontosabb egyezések előre
            const aExact = a.startsWith(query) ? 1 : 0;
            const bExact = b.startsWith(query) ? 1 : 0;
            if (aExact !== bExact) return bExact - aExact;
            
            // Rövidebb szavak előre
            return a.length - b.length;
        })
        .slice(0, limit);
}

/**
 * Hasonló receptek keresése
 * 
 * @param {Object} targetRecipe - Cél recept
 * @param {Array} recipes - Összes recept
 * @param {number} limit - Maximum eredmények száma
 * @returns {Array} Hasonló receptek
 */
export function findSimilarRecipes(targetRecipe, recipes, limit = 5) {
    if (!targetRecipe || !recipes || !Array.isArray(recipes)) {
        return [];
    }
    
    const targetIngredients = preprocessRecipeIngredients(targetRecipe.ingredients || '');
    const similarities = [];
    
    recipes.forEach(recipe => {
        if (recipe.recipeid === targetRecipe.recipeid) return; // Saját magát kihagyjuk
        
        const recipeIngredients = preprocessRecipeIngredients(recipe.ingredients || '');
        const commonCount = countCommonElements(targetIngredients, recipeIngredients);
        const totalIngredients = new Set([...targetIngredients, ...recipeIngredients]).size;
        
        if (commonCount > 0) {
            const similarity = commonCount / totalIngredients;
            const categoryMatch = recipe.category === targetRecipe.category ? 0.1 : 0;
            const finalScore = similarity + categoryMatch;
            
            similarities.push({
                recipe,
                similarity: finalScore,
                commonIngredients: commonCount
            });
        }
    });
    
    return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.recipe);
}

/**
 * Keresési statisztikák
 * 
 * @param {Array} searchResults - Keresési eredmények
 * @param {string} testGroup - Teszt csoport
 * @returns {Object} Statisztikák
 */
export function getSearchStatistics(searchResults, testGroup) {
    if (!searchResults || !Array.isArray(searchResults)) {
        return {
            totalResults: 0,
            avgSustainability: 0,
            avgEnvScore: 0,
            categoryDistribution: {},
            testGroup
        };
    }
    
    const totalResults = searchResults.length;
    
    if (totalResults === 0) {
        return {
            totalResults: 0,
            avgSustainability: 0,
            avgEnvScore: 0,
            categoryDistribution: {},
            testGroup
        };
    }
    
    const sustainabilityScores = searchResults.map(recipe => recipe.sustainability_index || 50);
    const envScores = searchResults.map(recipe => recipe.env_score || 50);
    
    const avgSustainability = sustainabilityScores.reduce((sum, score) => sum + score, 0) / totalResults;
    const avgEnvScore = envScores.reduce((sum, score) => sum + score, 0) / totalResults;
    
    const categoryDistribution = {};
    searchResults.forEach(recipe => {
        const category = recipe.category || 'egyéb';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });
    
    return {
        totalResults,
        avgSustainability: Math.round(avgSustainability * 10) / 10,
        avgEnvScore: Math.round(avgEnvScore * 10) / 10,
        categoryDistribution,
        testGroup
    };
}

/**
 * Keresési teljesítmény optimalizálása
 * 
 * @param {Array} recipes - Receptek tömbje
 * @returns {Object} Indexelt adatstruktúra
 */
export function buildSearchIndex(recipes) {
    if (!recipes || !Array.isArray(recipes)) {
        return { ingredientIndex: {}, nameIndex: {}, categoryIndex: {} };
    }
    
    const ingredientIndex = {};
    const nameIndex = {};
    const categoryIndex = {};
    
    recipes.forEach((recipe, index) => {
        // Hozzávaló index
        if (recipe.ingredients) {
            const ingredients = preprocessRecipeIngredients(recipe.ingredients);
            ingredients.forEach(ingredient => {
                if (!ingredientIndex[ingredient]) {
                    ingredientIndex[ingredient] = [];
                }
                ingredientIndex[ingredient].push(index);
            });
        }
        
        // Név index
        if (recipe.name) {
            const nameWords = recipe.name.toLowerCase().split(/\s+/);
            nameWords.forEach(word => {
                if (word.length > 2) {
                    if (!nameIndex[word]) {
                        nameIndex[word] = [];
                    }
                    nameIndex[word].push(index);
                }
            });
        }
        
        // Kategória index
        if (recipe.category) {
            const category = recipe.category.toLowerCase();
            if (!categoryIndex[category]) {
                categoryIndex[category] = [];
            }
            categoryIndex[category].push(index);
        }
    });
    
    console.log('🔍 Keresési index elkészítve:', {
        ingredients: Object.keys(ingredientIndex).length,
        names: Object.keys(nameIndex).length,
        categories: Object.keys(categoryIndex).length
    });
    
    return { ingredientIndex, nameIndex, categoryIndex };
}
