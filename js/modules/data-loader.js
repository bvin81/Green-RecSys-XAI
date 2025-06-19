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
    
    // ✅ Adatforrás ellenőrzése és fallback
    let dataSource = CONFIG.DATA_SOURCE;
    if (!dataSource) {
        console.warn('⚠️ CONFIG.DATA_SOURCE üres, alapértelmezett használata');
        dataSource = './data/recipes_hungarian_best1000.json';
    }
    
    console.log('📁 Adatforrás URL:', dataSource);
    
    try {
        const response = await fetch(dataSource);
        
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
    // Bővebb fallback adatok teszteléshez
    return [
        {
            recipeid: 1,
            name: "Egyszerű paradicsomleves",
            ingredients: "paradicsom, hagyma, só, bors, fokhagyma",
            category: "leves",
            env_score: 25.5,
            nutri_score: 78.2,
            sustainability_index: 70,
            instructions: "A hagymát apróra vágjuk és olajon megdinszteljük. Hozzáadjuk a paradicsomot és a fűszereket. 20 percig főzzük."
        },
        {
            recipeid: 2,
            name: "Csirkemell rizibizivel",
            ingredients: "csirkemell, rizs, borsó, sárgarépa, só, bors",
            category: "főétel",
            env_score: 58.3,
            nutri_score: 65.1,
            sustainability_index: 45,
            instructions: "A csirkemellet megsütjük, a rizst megfőzzük. A zöldségeket párolunk és összekeverjük."
        },
        {
            recipeid: 3,
            name: "Uborkasaláta",
            ingredients: "uborka, tejföl, kapor, só, bors, cukor",
            category: "saláta",
            env_score: 15.2,
            nutri_score: 72.8,
            sustainability_index: 85,
            instructions: "Az uborkát felszeleteljük, megsózzuk. A tejfölt összekeverjük a fűszerekkel."
        },
        {
            recipeid: 4,
            name: "Spenótos lasagne",
            ingredients: "lasagne tészta, spenót, ricotta, mozzarella, paradicsom szósz, fokhagyma, hagyma",
            category: "főétel",
            env_score: 42.1,
            nutri_score: 70.5,
            sustainability_index: 62,
            instructions: "A spenótot összekeverjük a ricottával. Rétegesen összerakjuk a tésztával és szósszal. 180°C-on 45 percig sütjük."
        },
        {
            recipeid: 5,
            name: "Gyümölcssaláta",
            ingredients: "alma, banán, narancs, szőlő, citromlé, méz",
            category: "desszert",
            env_score: 12.8,
            nutri_score: 85.3,
            sustainability_index: 92,
            instructions: "A gyümölcsöket felkockázzuk, citromlével lelocsoljuk. Mézzel édesítjük."
        },
        {
            recipeid: 6,
            name: "Zöld smoothie",
            ingredients: "spenót, banán, alma, gyömbér, víz, citromlé",
            category: "ital",
            env_score: 8.5,
            nutri_score: 88.7,
            sustainability_index: 95,
            instructions: "Minden hozzávalót turmixgépbe teszünk és simára turmixoljuk."
        },
        {
            recipeid: 7,
            name: "Marhapörkölt",
            ingredients: "marha, hagyma, paprika, paradicsom, só, bors, babérlevél",
            category: "főétel",
            env_score: 75.2,
            nutri_score: 58.1,
            sustainability_index: 25,
            instructions: "A húst felkockázzuk, a hagymát megpirítjuk. Hozzáadjuk a húst és a fűszereket. 2 órán át pároljuk."
        },
        {
            recipeid: 8,
            name: "Vegán burger",
            ingredients: "fekete bab, quinoa, hagyma, fokhagyma, petrezselyem, zabpehely, zsemlemorzsa",
            category: "főétel",
            env_score: 18.3,
            nutri_score: 76.9,
            sustainability_index: 88,
            instructions: "A babot összetörjük, összekeverjük a többi hozzávalóval. Pogácsákat formázunk és megsütjük."
        }
    ];
}

/**
 * Receptek előkészítése a használatra
 * 
 * @param {Array} rawRecipes - Nyers recept adatok
 * @returns {Array} Előkészített receptek
 */
export function prepareRecipes(rawRecipes) {
    console.log('⚙️ Receptek előkészítése...');
    
    if (!Array.isArray(rawRecipes)) {
        console.error('❌ Hibás recept adat formátum!');
        return [];
    }
    
    const preparedRecipes = rawRecipes.map(recipe => {
        try {
            return prepareRecipe(recipe);
        } catch (error) {
            console.warn(`⚠️ Recept előkészítési hiba (${recipe.recipeid}):`, error);
            return null;
        }
    }).filter(recipe => recipe !== null);
    
    console.log('✅ Receptek előkészítve:', preparedRecipes.length, 'érvényes recept');
    return preparedRecipes;
}

/**
 * Egyetlen recept előkészítése
 * 
 * @param {Object} rawRecipe - Nyers recept adat
 * @returns {Object} Előkészített recept
 */
function prepareRecipe(rawRecipe) {
    // Alapértelmezett értékek beállítása
    const recipe = {
        recipeid: rawRecipe.recipeid || 0,
        name: rawRecipe.name || 'Névtelen recept',
        ingredients: rawRecipe.ingredients || '',
        category: rawRecipe.category || 'egyéb',
        env_score: parseFloat(rawRecipe.env_score) || 50,
        nutri_score: parseFloat(rawRecipe.nutri_score) || 50,
        sustainability_index: parseFloat(rawRecipe.sustainability_index) || 50,
        instructions: rawRecipe.instructions || 'Nincs elérhető útmutató.'
    };
    
    // Kategória normalizálása és ikon hozzáadása
    recipe.category = normalizeCategory(recipe.category);
    recipe.categoryIcon = getCategoryIcon(recipe.category);
    
    // Hiányzó fenntarthatósági pontszám számítása
    if (!rawRecipe.sustainability_index && rawRecipe.env_score && rawRecipe.nutri_score) {
        recipe.sustainability_index = calculateSustainabilityScore(
            recipe.env_score, 
            recipe.nutri_score, 
            recipe.category
        );
    }
    
    // Validáció
    validateRecipe(recipe);
    
    return recipe;
}

/**
 * Kategória normalizálása
 * 
 * @param {string} category - Eredeti kategória
 * @returns {string} Normalizált kategória
 */
function normalizeCategory(category) {
    if (!category || typeof category !== 'string') {
        return 'egyéb';
    }
    
    const normalized = category.toLowerCase().trim();
    
    // Kategória mapping
    const categoryMap = {
        'soup': 'leves',
        'salad': 'saláta',
        'main': 'főétel',
        'main_course': 'főétel',
        'dessert': 'desszert',
        'drink': 'ital',
        'beverage': 'ital',
        'breakfast': 'reggeli',
        'side': 'köret',
        'side_dish': 'köret',
        'appetizer': 'előétel',
        'snack': 'snack'
    };
    
    return categoryMap[normalized] || normalized;
}

/**
 * Recept validáció
 * 
 * @param {Object} recipe - Recept objektum
 * @throws {Error} Validációs hiba esetén
 */
function validateRecipe(recipe) {
    if (!recipe.recipeid || recipe.recipeid <= 0) {
        throw new Error('Érvénytelen recept ID');
    }
    
    if (!recipe.name || recipe.name.trim().length === 0) {
        throw new Error('Hiányzó recept név');
    }
    
    if (!recipe.ingredients || recipe.ingredients.trim().length === 0) {
        throw new Error('Hiányzó hozzávalók');
    }
    
    // Pontszámok ellenőrzése
    if (recipe.env_score < 0 || recipe.env_score > 100) {
        console.warn(`⚠️ Környezeti pontszám kívül esik a tartományon: ${recipe.env_score}`);
        recipe.env_score = Math.max(0, Math.min(100, recipe.env_score));
    }
    
    if (recipe.nutri_score < 0 || recipe.nutri_score > 100) {
        console.warn(`⚠️ Táplálkozási pontszám kívül esik a tartományon: ${recipe.nutri_score}`);
        recipe.nutri_score = Math.max(0, Math.min(100, recipe.nutri_score));
    }
    
    if (recipe.sustainability_index < 0 || recipe.sustainability_index > 100) {
        console.warn(`⚠️ Fenntarthatósági index kívül esik a tartományon: ${recipe.sustainability_index}`);
        recipe.sustainability_index = Math.max(0, Math.min(100, recipe.sustainability_index));
    }
}

/**
 * Receptek szűrése kritériumok alapján
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {Object} criteria - Szűrési kritériumok
 * @returns {Array} Szűrt receptek
 */
export function filterRecipes(recipes, criteria = {}) {
    if (!Array.isArray(recipes)) {
        return [];
    }
    
    return recipes.filter(recipe => {
        // Kategória szűrés
        if (criteria.category && recipe.category !== criteria.category) {
            return false;
        }
        
        // Fenntarthatósági minimum
        if (criteria.minSustainability && recipe.sustainability_index < criteria.minSustainability) {
            return false;
        }
        
        // Környezeti maximum
        if (criteria.maxEnvScore && recipe.env_score > criteria.maxEnvScore) {
            return false;
        }
        
        // Táplálkozási minimum
        if (criteria.minNutriScore && recipe.nutri_score < criteria.minNutriScore) {
            return false;
        }
        
        // Hozzávaló kizárás
        if (criteria.excludeIngredients && Array.isArray(criteria.excludeIngredients)) {
            const ingredients = recipe.ingredients.toLowerCase();
            for (const excluded of criteria.excludeIngredients) {
                if (ingredients.includes(excluded.toLowerCase())) {
                    return false;
                }
            }
        }
        
        return true;
    });
}

/**
 * Receptek csoportosítása kategória szerint
 * 
 * @param {Array} recipes - Receptek tömbje
 * @returns {Object} Kategóriánként csoportosított receptek
 */
export function groupRecipesByCategory(recipes) {
    if (!Array.isArray(recipes)) {
        return {};
    }
    
    const grouped = {};
    
    recipes.forEach(recipe => {
        const category = recipe.category || 'egyéb';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(recipe);
    });
    
    return grouped;
}

/**
 * Recept statisztikák számítása
 * 
 * @param {Array} recipes - Receptek tömbje
 * @returns {Object} Statisztikai adatok
 */
export function calculateRecipeStats(recipes) {
    if (!Array.isArray(recipes) || recipes.length === 0) {
        return {
            total: 0,
            avgSustainability: 0,
            avgEnvScore: 0,
            avgNutriScore: 0,
            categoryDistribution: {}
        };
    }
    
    const total = recipes.length;
    
    const avgSustainability = recipes.reduce((sum, recipe) => 
        sum + (recipe.sustainability_index || 0), 0) / total;
    
    const avgEnvScore = recipes.reduce((sum, recipe) => 
        sum + (recipe.env_score || 0), 0) / total;
    
    const avgNutriScore = recipes.reduce((sum, recipe) => 
        sum + (recipe.nutri_score || 0), 0) / total;
    
    const categoryDistribution = {};
    recipes.forEach(recipe => {
        const category = recipe.category || 'egyéb';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });
    
    return {
        total,
        avgSustainability: Math.round(avgSustainability * 10) / 10,
        avgEnvScore: Math.round(avgEnvScore * 10) / 10,
        avgNutriScore: Math.round(avgNutriScore * 10) / 10,
        categoryDistribution
    };
}
