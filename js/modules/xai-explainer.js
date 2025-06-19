/**
 * xai-explainer.js
 * Explainable AI (XAI) megoldás a fenntarthatósági pontszámok magyarázatára
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';

// API konfiguráció
const XAI_CONFIG = {
    API_ENDPOINT: CONFIG.XAI.API_ENDPOINT,
    API_KEY: CONFIG.XAI.API_KEY,
    MODEL: CONFIG.XAI.MODEL_VERSION
};

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
        
        if (CONFIG.XAI.USE_REAL_API) {
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
    const response = await fetch(XAI_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XAI_CONFIG.API_KEY}`
        },
        body: JSON.stringify({
            model: XAI_CONFIG.MODEL,
            data: recipeData
        })
    });
    
    if (!response.ok) {
        throw new Error(`XAI API hívás sikertelen: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * Szimulált XAI API válasz generálása
 * 
 * @param {Object} recipeData - Előkészített recept adatok
 * @returns {Promise<Object>} Szimulált válasz
 */
async function simulateXaiApi(recipeData) {
    // LIME/SHAP-szerű magyarázatok szimulálása
    
    // Környezeti tényezők elemzése
    const environmentalFactors = [];
    
    // Hús jelenlétének ellenőrzése
    const meatIngredients = ['csirke', 'marha', 'sertés', 'hal', 'hús', 'kolbász'];
    const hasMeat = recipeData.ingredients.some(ing => 
        meatIngredients.some(meat => ing.includes(meat))
    );
    
    if (hasMeat) {
        environmentalFactors.push({
            name: 'állati eredetű összetevők',
            impact: 'negatív',
            importance: 0.65,
            explanation: 'Az állati eredetű összetevők általában magasabb környezeti terhelést jelentenek a nagyobb erőforrásigény miatt.'
        });
    } else {
        environmentalFactors.push({
            name: 'növényi alapú összetétel',
            impact: 'pozitív',
            importance: 0.58,
            explanation: 'A növényi alapú ételek általában kisebb környezeti terhelést jelentenek az alacsonyabb erőforrásigény miatt.'
        });
    }
    
    // Feldolgozottság ellenőrzése
    const processedIndicators = ['konzerv', 'feldolgozott', 'instant', 'előkészített'];
    const hasProcessed = recipeData.ingredients.some(ing => 
        processedIndicators.some(proc => ing.includes(proc))
    );
    
    if (hasProcessed) {
        environmentalFactors.push({
            name: 'feldolgozott összetevők',
            impact: 'negatív',
            importance: 0.42,
            explanation: 'A feldolgozott élelmiszerek gyártása általában több energiát és erőforrást igényel.'
        });
    }
    
    // Szezonális összetevők ellenőrzése
    const seasonalIngredients = ['szezonális', 'helyi', 'friss'];
    const hasSeasonal = recipeData.ingredients.some(ing => 
        seasonalIngredients.some(seas => ing.includes(seas))
    );
    
    if (hasSeasonal) {
        environmentalFactors.push({
            name: 'szezonális összetevők',
            impact: 'pozitív',
            importance: 0.38,
            explanation: 'A szezonális és helyi összetevők általában kisebb szállítási igényt jelentenek.'
        });
    }
    
    // Kategória hatás
    const categoryImpact = {
        'saláta': { impact: 'pozitív', importance: 0.35, explanation: 'A saláták általában nagy arányban tartalmaznak növényi összetevőket.' },
        'leves': { impact: 'pozitív', importance: 0.30, explanation: 'A levesek általában hatékonyan használják fel az összetevőket és sok vizet tartalmaznak.' },
        'főétel': { impact: 'negatív', importance: 0.25, explanation: 'A főételek gyakran tartalmaznak húst vagy más állati eredetű összetevőket.' },
        'desszert': { impact: 'negatív', importance: 0.40, explanation: 'A desszertek gyakran magas feldolgozottsági szintűek és sok cukrot tartalmaznak.' }
    };
    
    if (categoryImpact[recipeData.category]) {
        environmentalFactors.push({
            name: `${recipeData.category} kategória`,
            impact: categoryImpact[recipeData.category].impact,
            importance: categoryImpact[recipeData.category].importance,
            explanation: categoryImpact[recipeData.category].explanation
        });
    }
    
    // Táplálkozási tényezők elemzése
    const nutritionalFactors = [];
    
    // Egészséges összetevők ellenőrzése
    const healthyIngredients = ['zöldség', 'gyümölcs', 'teljes kiőrlésű', 'hal', 'hüvelyes'];
    const hasHealthy = recipeData.ingredients.some(ing => 
        healthyIngredients.some(healthy => ing.includes(healthy))
    );
    
    if (hasHealthy) {
        nutritionalFactors.push({
            name: 'egészséges összetevők',
            impact: 'pozitív',
            importance: 0.55,
            explanation: 'A recept tartalmaz tápanyagban gazdag, egészséges összetevőket.'
        });
    }
    
    // Magas cukortartalom ellenőrzése
    const sugarIndicators = ['cukor', 'méz', 'szirup'];
    const hasHighSugar = recipeData.ingredients.some(ing => 
        sugarIndicators.some(sugar => ing.includes(sugar))
    );
    
    if (hasHighSugar) {
        nutritionalFactors.push({
            name: 'magas cukortartalom',
            impact: 'negatív',
            importance: 0.48,
            explanation: 'A magas cukortartalom csökkenti a táplálkozási értéket és növeli a kalóriatartalmat.'
        });
    }
    
    // Fehérjetartalom ellenőrzése
    const proteinSources = ['hús', 'hal', 'tojás', 'tej', 'sajt', 'bab', 'lencse', 'tofu'];
    const hasProtein = recipeData.ingredients.some(ing => 
        proteinSources.some(protein => ing.includes(protein))
    );
    
    if (hasProtein) {
        nutritionalFactors.push({
            name: 'fehérjeforrások',
            impact: 'pozitív',
            importance: 0.42,
            explanation: 'A recept jó fehérjeforrásokat tartalmaz, amelyek esszenciálisak a szervezet számára.'
        });
    }
    
    // Zsírtartalom ellenőrzése
    const fatSources = ['olaj', 'vaj', 'zsír', 'szalonna', 'tejszín'];
    const hasFat = recipeData.ingredients.some(ing => 
        fatSources.some(fat => ing.includes(fat))
    );
    
    if (hasFat) {
        nutritionalFactors.push({
            name: 'zsírtartalom',
            impact: 'semleges',
            importance: 0.35,
            explanation: 'A recept tartalmaz zsírforrásokat, amelyek mértékkel fogyasztva részei az egészséges étrendnek.'
        });
    }
    
    // Összetettség ellenőrzése (sok összetevő = változatosabb tápanyagok)
    if (recipeData.ingredients.length > 8) {
        nutritionalFactors.push({
            name: 'összetevők változatossága',
            impact: 'pozitív',
            importance: 0.25,
            explanation: 'A változatos összetevők többféle tápanyagot biztosítanak.'
        });
    }
    
    // Összefoglaló generálása
    const environmentalImpactSum = environmentalFactors.reduce((sum, factor) => 
        sum + (factor.impact === 'pozitív' ? 1 : factor.impact === 'negatív' ? -1 : 0) * factor.importance, 0);
    
    const nutritionalImpactSum = nutritionalFactors.reduce((sum, factor) => 
        sum + (factor.impact === 'pozitív' ? 1 : factor.impact === 'negatív' ? -1 : 0) * factor.importance, 0);
    
    let summary = '';
    
    if (environmentalImpactSum > 0 && nutritionalImpactSum > 0) {
        summary = 'A recept környezeti és táplálkozási szempontból is kedvező értékelést kapott.';
    } else if (environmentalImpactSum > 0) {
        summary = 'A recept környezeti szempontból kedvező, de táplálkozási értéke fejleszthető.';
    } else if (nutritionalImpactSum > 0) {
        summary = 'A recept táplálkozási értéke jó, de környezeti hatása fejleszthető.';
    } else {
        summary = 'A recept mind környezeti, mind táplálkozási szempontból fejleszthető.';
    }
    
    // Javaslatok
    const suggestions = [];
    
    if (environmentalImpactSum < 0) {
        if (hasMeat) {
            suggestions.push('Próbálja csökkenteni az állati eredetű összetevők mennyiségét vagy helyettesítse növényi alternatívákkal.');
        }
        if (hasProcessed) {
            suggestions.push('Használjon friss, feldolgozatlan összetevőket a feldolgozott termékek helyett.');
        }
    }
    
    if (nutritionalImpactSum < 0) {
        if (hasHighSugar) {
            suggestions.push('Csökkentse a hozzáadott cukor mennyiségét vagy használjon természetes édesítőket.');
        }
        if (!hasHealthy) {
            suggestions.push('Adjon több zöldséget vagy gyümölcsöt a recepthez a tápanyagtartalom növeléséhez.');
        }
    }
    
    // Szimulált késleltetés (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Végleges magyarázat összeállítása
    return {
        success: true,
        environmentalFactors: environmentalFactors.sort((a, b) => b.importance - a.importance),
        nutritionalFactors: nutritionalFactors.sort((a, b) => b.importance - a.importance),
        suggestions: suggestions,
        summary: summary,
        model: 'XAI-LIME-Simulator-v1',
        confidence: 0.82
    };
}

/**
 * Fallback magyarázat generálása hiba esetére
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Object} Egyszerű magyarázat
 */
function generateFallbackExplanation(recipe) {
    return {
        success: false,
        environmentalFactors: [
            { 
                name: 'általános hatás', 
                impact: recipe.env_score > 50 ? 'negatív' : 'pozitív',
                importance: 1.0,
                explanation: 'A recept általános környezeti hatása az összetevők alapján.'
            }
        ],
        nutritionalFactors: [
            { 
                name: 'tápanyagtartalom', 
               impact: recipe.nutri_score > 50 ? 'pozitív' : 'negatív',
                importance: 1.0,
                explanation: 'A recept általános táplálkozási értéke az összetevők alapján.'
            }
        ],
        suggestions: [
            'Részletes magyarázat nem elérhető, kérjük próbálja újra később.'
        ],
        summary: 'Egyszerűsített értékelés a rendelkezésre álló adatok alapján.',
        model: 'Fallback-Explainer',
        confidence: 0.5
    };
}

/**
 * Összes recept elemzése és hasonlóságok keresése
 * 
 * @param {Object} recipe - Vizsgált recept
 * @param {Array} allRecipes - Összes recept
 * @returns {Array} Hasonló receptek javaslatok
 */
export function findSimilarButMoreSustainableRecipes(recipe, allRecipes) {
    try {
        if (!recipe || !allRecipes || !allRecipes.length) {
            return [];
        }
        
        // Kategória egyezés
        const sameCategory = allRecipes.filter(r => 
            r.category === recipe.category && 
            r.recipeid !== recipe.recipeid &&
            (r.sustainability_index || 0) > (recipe.sustainability_index || 0)
        );
        
        // Hozzávalók hasonlósága
        const recipeIngredients = (recipe.ingredients || '')
            .toLowerCase()
            .replace(/^c\(|\)$/g, '')
            .replace(/"/g, '')
            .split(',')
            .map(i => i.trim())
            .filter(i => i.length > 0);
        
        // Pontszám számítása az egyező hozzávalók alapján
        const scoredRecipes = sameCategory.map(r => {
            const targetIngredients = (r.ingredients || '')
                .toLowerCase()
                .replace(/^c\(|\)$/g, '')
                .replace(/"/g, '')
                .split(',')
                .map(i => i.trim())
                .filter(i => i.length > 0);
            
            // Közös hozzávalók számítása
            const commonIngredients = recipeIngredients.filter(ing => 
                targetIngredients.some(targetIng => targetIng.includes(ing) || ing.includes(targetIng))
            );
            
            // Hasonlósági pontszám (Jaccard index)
            const similarityScore = commonIngredients.length / 
                (recipeIngredients.length + targetIngredients.length - commonIngredients.length);
            
            // Fenntarthatósági különbség
            const sustainabilityDifference = 
                (r.sustainability_index || 0) - (recipe.sustainability_index || 0);
            
            return {
                recipe: r,
                similarityScore,
                sustainabilityDifference,
                // Kombinált pontszám (hasonlóság + fenntarthatósági különbség)
                totalScore: similarityScore * 0.7 + (sustainabilityDifference / 50) * 0.3
            };
        });
        
        // Rendezés kombinált pontszám szerint
        return scoredRecipes
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 3)
            .map(item => ({
                recipe: item.recipe,
                similarity: Math.round(item.similarityScore * 100),
                sustainabilityImprovement: Math.round(item.sustainabilityDifference)
            }));
            
    } catch (error) {
        console.error('❌ Hasonló receptek keresési hiba:', error);
        return [];
    }
}

/**
 * Egyszerű hozzávaló-alapú fenntarthatósági becslés
 * (Csak demonstrációs célra)
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Array} Módosítási javaslatok
 */
export function suggestIngredientSubstitutions(recipe) {
    try {
        if (!recipe || !recipe.ingredients) {
            return [];
        }
        
        const ingredients = (recipe.ingredients || '')
            .toLowerCase()
            .replace(/^c\(|\)$/g, '')
            .replace(/"/g, '')
            .split(',')
            .map(i => i.trim())
            .filter(i => i.length > 0);
        
        const substitutions = [];
        
        // Ismert helyettesítések
        const knownSubstitutions = {
            'marhahús': { 
                replace: 'csirkehús', 
                improvementPercent: 40,
                explanation: 'A csirkehús előállítása jelentősen kevesebb üvegházhatású gáz kibocsátással jár.'
            },
            'sertéshús': { 
                replace: 'csirkehús', 
                improvementPercent: 25,
                explanation: 'A csirkehús előállítása kevesebb üvegházhatású gáz kibocsátással jár.'
            },
            'marhahús': { 
                replace: 'növényi húshelyettesítő', 
                improvementPercent: 75,
                explanation: 'A növényi alapú húshelyettesítők töredék környezeti hatással járnak.'
            },
            'vaj': { 
                replace: 'olívaolaj', 
                improvementPercent: 30,
                explanation: 'A növényi olajok általában kisebb környezeti hatással járnak, mint az állati eredetű zsiradékok.'
            },
            'tejszín': { 
                replace: 'kókusztejszín', 
                improvementPercent: 35,
                explanation: 'A növényi alapú tejszínhelyettesítők kisebb környezeti hatással járnak.'
            },
            'tej': { 
                replace: 'növényi tej', 
                improvementPercent: 40,
                explanation: 'A növényi tejek (pl. zab-, mandula-, szójatej) kisebb környezeti lábnyommal rendelkeznek.'
            }
        };
        
        // Végigmegyünk az összetevőkön és megnézzük, hogy van-e fenntarthatóbb helyettesítő
        ingredients.forEach(ingredient => {
            Object.entries(knownSubstitutions).forEach(([target, suggestion]) => {
                if (ingredient.includes(target)) {
                    substitutions.push({
                        original: ingredient,
                        substitute: suggestion.replace,
                        improvementPercent: suggestion.improvementPercent,
                        explanation: suggestion.explanation
                    });
                }
            });
        });
        
        return substitutions;
        
    } catch (error) {
        console.error('❌ Helyettesítési javaslat hiba:', error);
        return [];
    }
}

/**
 * Eco-Score különbség vizualizációs adatok generálása
 * 
 * @param {number} currentScore - Jelenlegi pontszám
 * @param {number} improvedScore - Javított pontszám 
 * @returns {Object} Vizualizációs adatok
 */
export function generateScoreComparisonData(currentScore, improvedScore) {
    // CO2 egyenérték becslése kg/adag
    const estimatedCO2Current = (100 - currentScore) * 0.015;
    const estimatedCO2Improved = (100 - improvedScore) * 0.015;
    const co2Reduction = estimatedCO2Current - estimatedCO2Improved;
    
    // Vízlábnyom becslése liter/adag
    const estimatedWaterCurrent = (100 - currentScore) * 10;
    const estimatedWaterImproved = (100 - improvedScore) * 10;
    const waterReduction = estimatedWaterCurrent - estimatedWaterImproved;
    
    // Földhasználat becslése m²/adag
    const estimatedLandCurrent = (100 - currentScore) * 0.08;
    const estimatedLandImproved = (100 - improvedScore) * 0.08;
    const landReduction = estimatedLandCurrent - estimatedLandImproved;
    
    return {
        scores: {
            current: currentScore,
            improved: improvedScore,
            difference: improvedScore - currentScore,
            percentImprovement: Math.round((improvedScore - currentScore) / currentScore * 100)
        },
        environmentalImpact: {
            co2: {
                current: estimatedCO2Current.toFixed(2),
                improved: estimatedCO2Improved.toFixed(2),
                reduction: co2Reduction.toFixed(2),
                percentReduction: Math.round(co2Reduction / estimatedCO2Current * 100)
            },
            water: {
                current: Math.round(estimatedWaterCurrent),
                improved: Math.round(estimatedWaterImproved),
                reduction: Math.round(waterReduction),
                percentReduction: Math.round(waterReduction / estimatedWaterCurrent * 100)
            },
            land: {
                current: estimatedLandCurrent.toFixed(2),
                improved: estimatedLandImproved.toFixed(2),
                reduction: landReduction.toFixed(2),
                percentReduction: Math.round(landReduction / estimatedLandCurrent * 100)
            }
        },
        comparisons: [
            {
                label: 'Autóval megtett km',
                value: Math.round(co2Reduction * 6),
                unit: 'km',
                icon: '🚗'
            },
            {
                label: 'Zuhanyozással megtakarított víz',
                value: Math.round(waterReduction / 50),
                unit: 'zuhanyzás',
                icon: '🚿'
            }
        ]
    };
}
