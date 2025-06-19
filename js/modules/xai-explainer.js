/**
 * xai-explainer.js
 * Explainable AI (XAI) megoldás a fenntarthatósági pontszámok magyarázatára
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { getIngredientSustainabilityImpact } from './sustainability.js';
import { retry } from '../utils/helpers.js';

/**
 * Recept adatok előkészítése a magyarázathoz
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Object} Előkészített adatok
 */
function prepareRecipeData(recipe) {
    // Hozzávalók strukturálása
    const ingredients = (recipe.ingredients || '')
        .toLowerCase()
        .replace(/^c\(|\)$/g, '')  // c() eltávolítása
        .replace(/"/g, '')         // idézőjelek eltávolítása
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);
    
    // Numerikus értékek
    const numericValues = {
        envScore: recipe.env_score || 0,
        nutriScore: recipe.nutri_score || 0,
        sustainabilityIndex: recipe.sustainability_index || 0
    };
    
    // Kategória információ
    const category = recipe.category || 'egyéb';
    
    return {
        id: recipe.recipeid,
        name: recipe.name,
        ingredients,
        category,
        ...numericValues
    };
}

/**
 * XAI magyarázat lekérése a pontszámokhoz
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Promise<Object>} Magyarázat objektum
 */
export async function getExplanation(recipe) {
    try {
        // Ha nincs elegendő adat, visszaadjuk a fallback magyarázatot
        if (!recipe.ingredients || !recipe.env_score || !recipe.nutri_score) {
            console.warn('⚠️ Hiányos recept adatok, fallback magyarázat használata');
            return generateFallbackExplanation(recipe);
        }
        
        // Adatok előkészítése
        const recipeData = prepareRecipeData(recipe);
        
        // API hívás konfigurációtól függően
        let xaiExplanation;
        
        if (CONFIG.XAI?.USE_REAL_API && CONFIG.XAI?.OPENAI_API_KEY) {
            // Valódi API hívás
            xaiExplanation = await callExternalXaiApi(recipeData);
        } else {
            // Szimulált API válasz
            xaiExplanation = await simulateXaiApi(recipeData);
        }
        
        return xaiExplanation;
        
    } catch (error) {
        console.error('❌ XAI magyarázat hiba:', error);
        return generateFallbackExplanation(recipe);
    }
}

/**
 * Külső XAI API hívás
 * 
 * @param {Object} recipeData - Előkészített recept adatok
 * @returns {Promise<Object>} API válasz
 */
async function callExternalXaiApi(recipeData) {
    const apiKey = CONFIG.XAI?.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('Hiányzó OpenAI API kulcs');
    }
    
    const prompt = generateApiPrompt(recipeData);
    
    const requestBody = {
        model: CONFIG.XAI?.MODEL_VERSION || 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content: 'Te egy fenntarthatósági szakértő vagy, aki magyarázza a receptek környezeti hatását.'
            },
            {
                role: 'user', 
                content: prompt
            }
        ],
        max_tokens: 800,
        temperature: 0.7
    };
    
    return await retry(async () => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API hiba: ${response.status}`);
        }
        
        const data = await response.json();
        return parseApiResponse(data.choices[0]?.message?.content, recipeData);
    }, 3, 1000);
}

/**
 * API prompt generálása
 * 
 * @param {Object} recipeData - Recept adatok
 * @returns {string} API prompt
 */
function generateApiPrompt(recipeData) {
    return `
Elemezd ezt a receptet fenntarthatósági szempontból:

Recept: ${recipeData.name}
Hozzávalók: ${recipeData.ingredients.join(', ')}
Kategória: ${recipeData.category}
Környezeti pontszám: ${recipeData.envScore} (0-100, magasabb = rosszabb)
Táplálkozási pontszám: ${recipeData.nutriScore} (0-100, magasabb = jobb)
Fenntarthatósági index: ${recipeData.sustainabilityIndex} (0-100, magasabb = jobb)

Kérlek, adj egy strukturált magyarázatot a következő formátumban:

ÖSSZEFOGLALÓ: [1-2 mondatos magyarázat]

KÖRNYEZETI TÉNYEZŐK:
- [Tényező neve]: [pozitív/negatív/semleges] - [magyarázat]

TÁPLÁLKOZÁSI TÉNYEZŐK:
- [Tényező neve]: [pozitív/negatív/semleges] - [magyarázat]

JAVASLATOK:
- [Javaslat 1]
- [Javaslat 2]
`;
}

/**
 * API válasz feldolgozása
 * 
 * @param {string} response - API válasz szöveg
 * @param {Object} recipeData - Recept adatok
 * @returns {Object} Strukturált magyarázat
 */
function parseApiResponse(response, recipeData) {
    try {
        const lines = response.split('\n').map(line => line.trim()).filter(line => line);
        
        let summary = '';
        const environmentalFactors = [];
        const nutritionalFactors = [];
        const suggestions = [];
        
        let currentSection = null;
        
        lines.forEach(line => {
            if (line.startsWith('ÖSSZEFOGLALÓ:')) {
                summary = line.replace('ÖSSZEFOGLALÓ:', '').trim();
                currentSection = 'summary';
            } else if (line.startsWith('KÖRNYEZETI TÉNYEZŐK:')) {
                currentSection = 'environmental';
            } else if (line.startsWith('TÁPLÁLKOZÁSI TÉNYEZŐK:')) {
                currentSection = 'nutritional';
            } else if (line.startsWith('JAVASLATOK:')) {
                currentSection = 'suggestions';
            } else if (line.startsWith('-') || line.startsWith('•')) {
                const content = line.replace(/^[-•]\s*/, '');
                
                if (currentSection === 'environmental') {
                    environmentalFactors.push(parseFactorLine(content));
                } else if (currentSection === 'nutritional') {
                    nutritionalFactors.push(parseFactorLine(content));
                } else if (currentSection === 'suggestions') {
                    suggestions.push(content);
                }
            } else if (currentSection === 'summary' && !summary) {
                summary = line;
            }
        });
        
        return {
            summary: summary || generateDefaultSummary(recipeData),
            environmentalFactors: environmentalFactors.length > 0 ? environmentalFactors : generateDefaultEnvironmentalFactors(recipeData),
            nutritionalFactors: nutritionalFactors.length > 0 ? nutritionalFactors : generateDefaultNutritionalFactors(recipeData),
            suggestions: suggestions.length > 0 ? suggestions : generateDefaultSuggestions(recipeData),
            confidence: 0.85,
            source: 'openai'
        };
        
    } catch (error) {
        console.error('❌ API válasz feldolgozási hiba:', error);
        return generateFallbackExplanation({ 
            ...recipeData, 
            ingredients: recipeData.ingredients.join(', ') 
        });
    }
}

/**
 * Tényező sor feldolgozása
 * 
 * @param {string} line - Tényező sor
 * @returns {Object} Tényező objektum
 */
function parseFactorLine(line) {
    const parts = line.split(':');
    if (parts.length < 2) {
        return {
            name: line,
            impact: 'neutral',
            explanation: '',
            importance: 0.5
        };
    }
    
    const name = parts[0].trim();
    const rest = parts[1].trim();
    
    let impact = 'neutral';
    if (rest.includes('pozitív') || rest.includes('jó')) {
        impact = 'positive';
    } else if (rest.includes('negatív') || rest.includes('rossz')) {
        impact = 'negative';
    }
    
    return {
        name,
        impact,
        explanation: rest.replace(/(pozitív|negatív|semleges)\s*-?\s*/i, ''),
        importance: Math.random() * 0.4 + 0.6 // 0.6-1.0 között
    };
}

/**
 * Szimulált XAI API válasz
 * 
 * @param {Object} recipeData - Recept adatok
 * @returns {Promise<Object>} Szimulált válasz
 */
async function simulateXaiApi(recipeData) {
    // Késleltetés szimulációhoz
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const environmentalFactors = generateDefaultEnvironmentalFactors(recipeData);
    const nutritionalFactors = generateDefaultNutritionalFactors(recipeData);
    const suggestions = generateDefaultSuggestions(recipeData);
    const summary = generateDefaultSummary(recipeData);
    
    return {
        summary,
        environmentalFactors,
        nutritionalFactors,
        suggestions,
        confidence: 0.75,
        source: 'simulated'
    };
}

/**
 * Alapértelmezett környezeti tényezők generálása
 * 
 * @param {Object} recipeData - Recept adatok
 * @returns {Array} Környezeti tényezők
 */
function generateDefaultEnvironmentalFactors(recipeData) {
    const factors = [];
    
    recipeData.ingredients.forEach(ingredient => {
        const impact = getIngredientSustainabilityImpact(ingredient);
        factors.push({
            name: ingredient,
            impact: impact.impact === 'positive' ? 'pozitív' : 
                   impact.impact === 'negative' ? 'negatív' : 'semleges',
            explanation: impact.explanation,
            importance: Math.abs(impact.score) / 10
        });
    });
    
    // Kategória hatás
    const categoryImpact = getCategoryEnvironmentalImpact(recipeData.category);
    factors.push(categoryImpact);
    
    return factors.slice(0, 5); // Maximum 5 tényező
}

/**
 * Alapértelmezett táplálkozási tényezők generálása
 * 
 * @param {Object} recipeData - Recept adatok
 * @returns {Array} Táplálkozási tényezők
 */
function generateDefaultNutritionalFactors(recipeData) {
    const factors = [];
    
    // Táplálkozási pontszám alapján
    if (recipeData.nutriScore > 70) {
        factors.push({
            name: 'Magas tápérték',
            impact: 'pozitív',
            explanation: 'Ez a recept gazdag vitaminokban és ásványi anyagokban.',
            importance: 0.9
        });
    } else if (recipeData.nutriScore < 40) {
        factors.push({
            name: 'Alacsony tápérték',
            impact: 'negatív', 
            explanation: 'A recept táplálkozási értéke javítható lenne.',
            importance: 0.8
        });
    }
    
    // Összetevők alapú elemzés
    const veggieCount = recipeData.ingredients.filter(ing => 
        ['saláta', 'paradicsom', 'uborka', 'spenót', 'brokkoli', 'sárgarépa'].some(veg => 
            ing.includes(veg)
        )
    ).length;
    
    if (veggieCount > 2) {
        factors.push({
            name: 'Gazdag zöldségtartalom',
            impact: 'pozitív',
            explanation: 'Sok zöldség növeli a vitamin- és rosttartalmat.',
            importance: 0.8
        });
    }
    
    const meatCount = recipeData.ingredients.filter(ing =>
        ['hús', 'csirke', 'marha', 'sertés'].some(meat => ing.includes(meat))
    ).length;
    
    if (meatCount > 0) {
        factors.push({
            name: 'Húsfehérje tartalom',
            impact: 'semleges',
            explanation: 'A hús jó fehérjeforrás, de modéráltan fogyasztandó.',
            importance: 0.6
        });
    }
    
    return factors.slice(0, 4);
}

/**
 * Alapértelmezett javaslatok generálása
 * 
 * @param {Object} recipeData - Recept adatok
 * @returns {Array} Javaslatok
 */
function generateDefaultSuggestions(recipeData) {
    const suggestions = [];
    
    // Fenntarthatóság alapján
    if (recipeData.sustainabilityIndex < 60) {
        suggestions.push('Próbáljon több zöldséget vagy növényi alapú fehérjét használni.');
    }
    
    // Környezeti hatás alapján
    if (recipeData.envScore > 60) {
        suggestions.push('Csökkentse a magas környezeti hatású hozzávalók mennyiségét.');
    }
    
    // Specifikus hozzávaló javaslatok
    const hasBeef = recipeData.ingredients.some(ing => ing.includes('marha'));
    if (hasBeef) {
        suggestions.push('A marhahús helyett próbáljon babot, lencsét vagy csirkét használni.');
    }
    
    const hasLowVeggies = recipeData.ingredients.filter(ing =>
        ['zöldség', 'saláta', 'paradicsom', 'uborka'].some(veg => ing.includes(veg))
    ).length < 2;
    
    if (hasLowVeggies) {
        suggestions.push('Adjon hozzá több friss zöldséget a tápérték növelésére.');
    }
    
    // Kategória specifikus javaslatok
    if (recipeData.category === 'főétel' && recipeData.sustainabilityIndex < 70) {
        suggestions.push('Főételnél különösen fontos a fenntartható hozzávalók választása.');
    }
    
    return suggestions.length > 0 ? suggestions : ['Ez a recept már jó egyensúlyt mutat!'];
}

/**
 * Alapértelmezett összefoglaló generálása
 * 
 * @param {Object} recipeData - Recept adatok
 * @returns {string} Összefoglaló szöveg
 */
function generateDefaultSummary(recipeData) {
    const sustainScore = recipeData.sustainabilityIndex;
    const envScore = recipeData.envScore;
    
    let evaluation = '';
    if (sustainScore >= 80) {
        evaluation = 'kiválóan fenntartható';
    } else if (sustainScore >= 60) {
        evaluation = 'jól fenntartható';
    } else if (sustainScore >= 40) {
        evaluation = 'közepesen fenntartható';
    } else {
        evaluation = 'kevésbé fenntartható';
    }
    
    let envImpact = '';
    if (envScore <= 30) {
        envImpact = 'alacsony környezeti hatással';
    } else if (envScore <= 60) {
        envImpact = 'mérsékelt környezeti hatással';
    } else {
        envImpact = 'magas környezeti hatással';
    }
    
    return `Ez a ${recipeData.category} recept ${evaluation} és ${envImpact} rendelkezik. A ${sustainScore.toFixed(1)}/100 fenntarthatósági pontszám a hozzávalók környezeti hatásának és táplálkozási értékének kombinációjából adódik.`;
}

/**
 * Kategória környezeti hatásának meghatározása
 * 
 * @param {string} category - Recept kategória
 * @returns {Object} Kategória hatás
 */
function getCategoryEnvironmentalImpact(category) {
    const categoryImpacts = {
        'saláta': {
            name: 'Saláta kategória',
            impact: 'pozitív',
            explanation: 'Salátáknak általában alacsony a környezeti lábnyoma.',
            importance: 0.7
        },
        'leves': {
            name: 'Leves kategória', 
            impact: 'pozitív',
            explanation: 'Levesek hatékonyan használják fel a hozzávalókat.',
            importance: 0.6
        },
        'főétel': {
            name: 'Főétel kategória',
            impact: 'semleges',
            explanation: 'Főételek környezeti hatása a hozzávalóktól függ.',
            importance: 0.5
        },
        'desszert': {
            name: 'Desszert kategória',
            impact: 'negatív',
            explanation: 'Desszertek gyakran energiaigényes hozzávalókat tartalmaznak.',
            importance: 0.4
        }
    };
    
    return categoryImpacts[category] || {
        name: 'Kategória hatás',
        impact: 'semleges',
        explanation: 'A kategória környezeti hatása átlagos.',
        importance: 0.3
    };
}

/**
 * Fallback magyarázat generálása
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Object} Egyszerű magyarázat
 */
function generateFallbackExplanation(recipe) {
    const sustainabilityIndex = recipe.sustainability_index || 50;
    const envScore = recipe.env_score || 50;
    const nutriScore = recipe.nutri_score || 50;
    
    return {
        summary: `Ez a recept ${sustainabilityIndex.toFixed(1)}/100 fenntarthatósági pontot kapott. A pontozás a környezeti hatás (${envScore.toFixed(1)}) és a táplálkozási érték (${nutriScore.toFixed(1)}) alapján történt.`,
        environmentalFactors: [
            {
                name: 'Környezeti hatás',
                impact: envScore > 60 ? 'negatív' : envScore > 40 ? 'semleges' : 'pozitív',
                explanation: `A recept környezeti pontszáma ${envScore.toFixed(1)}/100.`,
                importance: 0.8
            }
        ],
        nutritionalFactors: [
            {
                name: 'Táplálkozási érték',
                impact: nutriScore > 60 ? 'pozitív' : nutriScore > 40 ? 'semleges' : 'negatív',
                explanation: `A recept táplálkozási pontszáma ${nutriScore.toFixed(1)}/100.`,
                importance: 0.7
            }
        ],
        suggestions: [
            'Részletes AI magyarázat jelenleg nem elérhető.',
            'A pontszámok a hozzávalók fenntarthatósági hatása alapján készültek.'
        ],
        confidence: 0.6,
        source: 'fallback'
    };
}

/**
 * Hasonló, de fenntarthatóbb receptek keresése
 * 
 * @param {Object} targetRecipe - Eredeti recept
 * @param {Array} allRecipes - Összes recept
 * @param {number} limit - Maximum eredmények
 * @returns {Array} Hasonló receptek javított fenntarthatósággal
 */
export function findSimilarButMoreSustainableRecipes(targetRecipe, allRecipes, limit = 3) {
    if (!targetRecipe || !allRecipes || !Array.isArray(allRecipes)) {
        return [];
    }
    
    const targetSustainability = targetRecipe.sustainability_index || 50;
    const targetIngredients = preprocessIngredients(targetRecipe.ingredients);
    
    const candidates = allRecipes
        .filter(recipe => {
            // Kizárjuk az eredeti receptet
            if (recipe.recipeid === targetRecipe.recipeid) return false;
            
            // Csak fenntarthatóbb recepteket
            const recipeSustainability = recipe.sustainability_index || 50;
            return recipeSustainability > targetSustainability + 5; // Minimum 5 pont javulás
        })
        .map(recipe => {
            const recipeIngredients = preprocessIngredients(recipe.ingredients);
            const similarity = calculateIngredientSimilarity(targetIngredients, recipeIngredients);
            const sustainabilityImprovement = (recipe.sustainability_index || 50) - targetSustainability;
            
            return {
                recipe,
                similarity,
                sustainabilityImprovement,
                score: (similarity * 0.7) + (sustainabilityImprovement / 100 * 0.3)
            };
        })
        .filter(item => item.similarity > 0.3) // Minimum hasonlóság
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    
    return candidates;
}

/**
 * Összetevő helyettesítési javaslatok
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Array} Helyettesítési javaslatok
 */
export function suggestIngredientSubstitutions(recipe) {
    if (!recipe || !recipe.ingredients) {
        return [];
    }
    
    const ingredients = preprocessIngredients(recipe.ingredients);
    const substitutions = [];
    
    // Helyettesítési táblázat
    const substitutionMap = {
        'marha': {
            substitutes: ['lencse', 'csicseriborsó', 'tofu', 'tempeh'],
            improvementPercent: 60,
            explanation: 'Növényi fehérjék sokkal alacsonyabb környezeti hatással rendelkeznek.'
        },
        'marhahús': {
            substitutes: ['bab', 'quinoa', 'szeitan'],
            improvementPercent: 65,
            explanation: 'Növényi alapú alternatívák drámaian csökkentik a szén-lábnyomot.'
        },
        'sertés': {
            substitutes: ['csirke', 'hal', 'tofu'],
            improvementPercent: 35,
            explanation: 'Alternatív fehérjeforrások alacsonyabb környezeti hatással.'
        },
        'csirke': {
            substitutes: ['hal', 'tojás', 'cottage cheese'],
            improvementPercent: 20,
            explanation: 'Kevésbé erőforrás-igényes állati fehérjék.'
        },
        'vaj': {
            substitutes: ['olívaolaj', 'kókuszolaj', 'avokádó'],
            improvementPercent: 30,
            explanation: 'Növényi zsírok alacsonyabb környezeti hatással.'
        },
        'tejszín': {
            substitutes: ['kókusztej', 'zabtej', 'mandulakrém'],
            improvementPercent: 40,
            explanation: 'Növényi tejek kevesebb erőforrást igényelnek.'
        },
        'saj': { // sajt részleges egyezéshez
            substitutes: ['nutritional yeast', 'kesutej-sajt', 'tofu-sajt'],
            improvementPercent: 45,
            explanation: 'Növényi sajtalternatívák fenntarthatóbbak.'
        }
    };
    
    ingredients.forEach(ingredient => {
        // Pontos egyezés keresése
        for (const [key, data] of Object.entries(substitutionMap)) {
            if (ingredient.includes(key) || key.includes(ingredient)) {
                const substitute = data.substitutes[Math.floor(Math.random() * data.substitutes.length)];
                substitutions.push({
                    original: ingredient,
                    substitute: substitute,
                    improvementPercent: data.improvementPercent,
                    explanation: data.explanation
                });
                break; // Egy ingredienshez csak egy javaslat
            }
        }
    });
    
    return substitutions.slice(0, 3); // Maximum 3 javaslat
}

/**
 * Hozzávalók előfeldolgozása
 * 
 * @param {string} ingredients - Hozzávalók string
 * @returns {Array} Tisztított hozzávalók
 */
function preprocessIngredients(ingredients) {
    if (!ingredients || typeof ingredients !== 'string') {
        return [];
    }
    
    return ingredients
        .toLowerCase()
        .replace(/^c\(|\)$/g, '')
        .replace(/["']/g, '')
        .split(',')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0);
}

/**
 * Hozzávalók hasonlóságának számítása
 * 
 * @param {Array} ingredients1 - Első hozzávaló lista
 * @param {Array} ingredients2 - Második hozzávaló lista
 * @returns {number} Hasonlóság (0-1)
 */
function calculateIngredientSimilarity(ingredients1, ingredients2) {
    if (!ingredients1.length || !ingredients2.length) {
        return 0;
    }
    
    const set1 = new Set(ingredients1);
    const set2 = new Set(ingredients2);
    
    // Jaccard hasonlóság
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
}

/**
 * XAI cache kezelés
 */
export const XAICache = {
    cache: new Map(),
    maxSize: 100,
    
    get(key) {
        return this.cache.get(key);
    },
    
    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    },
    
    clear() {
        this.cache.clear();
    },
    
    size() {
        return this.cache.size;
    }
};
