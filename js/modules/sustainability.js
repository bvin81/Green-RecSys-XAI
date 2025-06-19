/**
 * sustainability.js
 * Fenntarthatósági számítások és értékelések
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';

/**
 * Fenntarthatósági pontszám számítása
 * 
 * @param {number} envScore - Környezeti pontszám (0-100, magasabb = rosszabb)
 * @param {number} nutriScore - Táplálkozási pontszám (0-100, magasabb = jobb)
 * @param {string} category - Étel kategória
 * @returns {number} Fenntarthatósági index (0-100)
 */
export function calculateSustainabilityScore(envScore, nutriScore, category = 'egyéb') {
    // Input validáció
    if (typeof envScore !== 'number' || typeof nutriScore !== 'number') {
        console.warn('⚠️ Hibás pontszám típusok:', { envScore, nutriScore });
        return 50; // Alapértelmezett közepesen fenntartható
    }
    
    // Normalizálás 0-100 tartományra
    const normalizedEnvScore = Math.max(0, Math.min(100, envScore));
    const normalizedNutriScore = Math.max(0, Math.min(100, nutriScore));
    
    // Környezeti komponens: fordított skála (100 - envScore)
    const environmentalComponent = 100 - normalizedEnvScore;
    
    // Táplálkozási komponens: direkt skála
    const nutritionalComponent = normalizedNutriScore;
    
    // Súlyozott átlag: 60% környezeti, 40% táplálkozási
    const weightedScore = (environmentalComponent * 0.6) + (nutritionalComponent * 0.4);
    
    // Kategória módosító
    const categoryModifier = getCategoryModifier(category);
    
    // Végső pontszám számítása
    const finalScore = Math.max(0, Math.min(100, weightedScore + categoryModifier));
    
    return Math.round(finalScore * 10) / 10; // Egy tizedesjegy pontosság
}

/**
 * Kategória módosító lekérése
 * 
 * @param {string} category - Étel kategória
 * @returns {number} Módosító érték (-10 - +10)
 */
function getCategoryModifier(category) {
    const modifiers = CONFIG.SUSTAINABILITY?.CATEGORY_MODIFIERS || {
        'saláta': 5,      // Növényi alapú ételek bónusza
        'leves': 3,       // Általában kevesebb hús
        'főétel': 0,      // Semleges
        'desszert': -2,   // Általában cukor/tejtermékek
        'ital': 2,        // Folyadék, kevesebb erőforrás
        'reggeli': 1,     // Változó, de általában könnyebb
        'köret': 2,       // Általában növényi
        'egyéb': 0        // Semleges
    };
    
    return modifiers[category] || 0;
}

/**
 * Kategória meghatározása hozzávalók alapján
 * 
 * @param {string} ingredients - Hozzávalók string
 * @param {string} name - Recept neve
 * @returns {string} Kategória
 */
export function determineCategory(ingredients, name = '') {
    if (!ingredients && !name) {
        return 'egyéb';
    }
    
    const text = `${ingredients} ${name}`.toLowerCase();
    
    // Kategória kulcsszavak
    const categoryKeywords = {
        'saláta': ['saláta', 'uborka', 'paradicsom', 'fejes', 'salát', 'retek', 'paprika'],
        'leves': ['leves', 'húsleves', 'zöldségleves', 'krémleves', 'borsóleves', 'gulyás'],
        'főétel': ['hús', 'csirke', 'marha', 'sertés', 'hal', 'schnitzel', 'pörkölt', 'ragu', 'pizza'],
        'desszert': ['torta', 'sütemény', 'fagylalt', 'pudding', 'keksz', 'csoki', 'csokoládé', 'krémes'],
        'ital': ['smoothie', 'tea', 'kávé', 'juice', 'lé', 'ital', 'shake'],
        'reggeli': ['reggeli', 'tojás', 'omlett', 'pirítós', 'müzli', 'zabkása', 'pancake'],
        'köret': ['köret', 'rizs', 'tészta', 'burgonya', 'krumpli', 'nokedli', 'galuska']
    };
    
    // Pontszám alapú kategorizálás
    let maxScore = 0;
    let detectedCategory = 'egyéb';
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        let score = 0;
        keywords.forEach(keyword => {
            if (text.includes(keyword)) {
                score += keyword.length; // Hosszabb kulcsszavak nagyobb súlyt kapnak
            }
        });
        
        if (score > maxScore) {
            maxScore = score;
            detectedCategory = category;
        }
    }
    
    return detectedCategory;
}

/**
 * Kategória ikon lekérése
 * 
 * @param {string} category - Kategória
 * @returns {string} Emoji ikon
 */
export function getCategoryIcon(category) {
    return CONFIG.CATEGORY_ICONS[category] || CONFIG.CATEGORY_ICONS['egyéb'];
}

/**
 * Környezeti pontszám színkódja
 * 
 * @param {number} envScore - Környezeti pontszám (0-100)
 * @returns {string} CSS szín
 */
export function getEnvironmentalColor(envScore) {
    if (typeof envScore !== 'number') {
        return '#666666'; // Szürke az ismeretlen értékekhez
    }
    
    // Skála: 0 = legjobb (zöld), 100 = legrosszabb (piros)
    if (envScore <= 20) return '#22c55e';  // Zöld
    if (envScore <= 40) return '#84cc16';  // Világoszöld
    if (envScore <= 60) return '#eab308';  // Sárga
    if (envScore <= 80) return '#f97316';  // Narancs
    return '#ef4444';                      // Piros
}

/**
 * Környezeti pontszám címkéje
 * 
 * @param {number} envScore - Környezeti pontszám (0-100)
 * @returns {string} Leíró címke
 */
export function getEnvironmentalLabel(envScore) {
    if (typeof envScore !== 'number') {
        return 'Ismeretlen';
    }
    
    if (envScore <= 20) return 'Kiváló';
    if (envScore <= 40) return 'Jó';
    if (envScore <= 60) return 'Közepes';
    if (envScore <= 80) return 'Gyenge';
    return 'Rossz';
}

/**
 * Fenntarthatósági pontszám értékelése
 * 
 * @param {number} sustainabilityIndex - Fenntarthatósági index (0-100)
 * @returns {Object} Értékelési objektum
 */
export function evaluateSustainabilityScore(sustainabilityIndex) {
    if (typeof sustainabilityIndex !== 'number') {
        return {
            label: 'Ismeretlen',
            icon: '❓',
            color: '#666666',
            description: 'Nem sikerült értékelni a fenntarthatóságot'
        };
    }
    
    const ranges = CONFIG.SUSTAINABILITY?.SCORE_RANGES || [
        { min: 90, label: 'Kiváló', icon: '✨', color: '#22c55e' },
        { min: 80, label: 'Kiváló', icon: '✨', color: '#22c55e' },
        { min: 70, label: 'Nagyon jó', icon: '🌿', color: '#84cc16' },
        { min: 60, label: 'Jó', icon: '👍', color: '#65a30d' },
        { min: 50, label: 'Megfelelő', icon: '🆗', color: '#eab308' },
        { min: 40, label: 'Közepes', icon: '⚠️', color: '#f59e0b' },
        { min: 30, label: 'Gyenge', icon: '📉', color: '#f97316' },
        { min: 0, label: 'Rossz', icon: '⚠️', color: '#ef4444' }
    ];
    
    const evaluation = ranges.find(range => sustainabilityIndex >= range.min) || ranges[ranges.length - 1];
    
    return {
        ...evaluation,
        description: getScoreDescription(sustainabilityIndex)
    };
}

/**
 * Pontszám részletes leírása
 * 
 * @param {number} score - Pontszám (0-100)
 * @returns {string} Leírás
 */
function getScoreDescription(score) {
    if (score >= 80) {
        return 'Ez egy környezetbarát választás, alacsony ökológiai lábnyommal és jó táplálkozási értékkel.';
    } else if (score >= 60) {
        return 'Jó választás a fenntarthatóság szempontjából, kisebb javítási lehetőségekkel.';
    } else if (score >= 40) {
        return 'Közepes fenntarthatóságú étel, érdemes megfontolni alternatívákat.';
    } else {
        return 'Ez az étel jelentős környezeti hatással bír, fontolja meg a fenntarthatóbb alternatívákat.';
    }
}

/**
 * Hozzávalók környezeti hatásának elemzése
 * 
 * @param {string} ingredients - Hozzávalók string
 * @returns {Object} Környezeti hatás elemzés
 */
export function analyzeEnvironmentalImpact(ingredients) {
    if (!ingredients || typeof ingredients !== 'string') {
        return {
            totalImpact: 50,
            highImpactIngredients: [],
            lowImpactIngredients: [],
            recommendations: []
        };
    }
    
    const ingredientList = ingredients.toLowerCase()
        .replace(/[c\(\)"']/g, '')
        .split(/[,\s]+/)
        .filter(item => item.length > 2);
    
    // Környezeti hatás kategóriák
    const impactCategories = {
        high: {
            keywords: ['marha', 'marhahús', 'borjú', 'bárány', 'sertés', 'szalonna', 'bacon', 'vaj', 'tejszín', 'sajt'],
            impact: 80,
            recommendations: ['Próbáljon növényi alternatívákat', 'Csökkentse a húsmennyiséget']
        },
        medium: {
            keywords: ['csirke', 'tyúk', 'tojás', 'hal', 'tej', 'joghurt', 'tejföl'],
            impact: 50,
            recommendations: ['Válasszon bio vagy helyi termékeket', 'Mérsékelje a fogyasztást']
        },
        low: {
            keywords: ['zöldség', 'gyümölcs', 'rizs', 'tészta', 'bab', 'lencse', 'quinoa', 'zab', 'alma', 'paradicsom', 'spenót'],
            impact: 20,
            recommendations: ['Kiváló választás!', 'Támogassa a helyi termelőket']
        }
    };
    
    let totalImpact = 50;
    const highImpactIngredients = [];
    const lowImpactIngredients = [];
    const recommendations = [];
    
    let impactSum = 0;
    let ingredientCount = 0;
    
    ingredientList.forEach(ingredient => {
        let classified = false;
        
        for (const [category, data] of Object.entries(impactCategories)) {
            if (data.keywords.some(keyword => ingredient.includes(keyword))) {
                impactSum += data.impact;
                ingredientCount++;
                classified = true;
                
                if (category === 'high') {
                    highImpactIngredients.push(ingredient);
                } else if (category === 'low') {
                    lowImpactIngredients.push(ingredient);
                }
                
                recommendations.push(...data.recommendations);
                break;
            }
        }
        
        // Ha nincs kategorizálva, közepes hatásként számolunk
        if (!classified) {
            impactSum += 40;
            ingredientCount++;
        }
    });
    
    if (ingredientCount > 0) {
        totalImpact = Math.round(impactSum / ingredientCount);
    }
    
    // Duplikátumok eltávolítása a javaslatokból
    const uniqueRecommendations = [...new Set(recommendations)];
    
    return {
        totalImpact,
        highImpactIngredients,
        lowImpactIngredients,
        recommendations: uniqueRecommendations
    };
}

/**
 * Táplálkozási érték számítása hozzávalók alapján
 * 
 * @param {string} ingredients - Hozzávalók string
 * @returns {number} Becsült táplálkozási pontszám (0-100)
 */
export function estimateNutritionalValue(ingredients) {
    if (!ingredients || typeof ingredients !== 'string') {
        return 50;
    }
    
    const ingredientList = ingredients.toLowerCase()
        .replace(/[c\(\)"']/g, '')
        .split(/[,\s]+/)
        .filter(item => item.length > 2);
    
    // Táplálkozási érték kategóriák
    const nutritionCategories = {
        excellent: {
            keywords: ['spenót', 'brokkoli', 'quinoa', 'lencse', 'avokádó', 'dió', 'mandula', 'hal', 'áfonya'],
            score: 90
        },
        good: {
            keywords: ['zöldség', 'gyümölcs', 'teljes', 'barna', 'zabpehely', 'csirke', 'tojás', 'joghurt'],
            score: 75
        },
        moderate: {
            keywords: ['rizs', 'tészta', 'burgonya', 'kenyér', 'tej', 'sajt'],
            score: 60
        },
        poor: {
            keywords: ['cukor', 'zsír', 'olaj', 'vaj', 'szalonna', 'bacon', 'chips', 'édesség'],
            score: 30
        }
    };
    
    let totalScore = 0;
    let ingredientCount = 0;
    
    ingredientList.forEach(ingredient => {
        let scored = false;
        
        for (const [category, data] of Object.entries(nutritionCategories)) {
            if (data.keywords.some(keyword => ingredient.includes(keyword))) {
                totalScore += data.score;
                ingredientCount++;
                scored = true;
                break;
            }
        }
        
        // Ha nincs kategorizálva, közepes értékként számolunk
        if (!scored) {
            totalScore += 50;
            ingredientCount++;
        }
    });
    
    return ingredientCount > 0 ? Math.round(totalScore / ingredientCount) : 50;
}

/**
 * Fenntarthatóság javítási javaslatok
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Array} Javítási javaslatok
 */
export function getSustainabilityRecommendations(recipe) {
    const recommendations = [];
    
    if (!recipe) {
        return recommendations;
    }
    
    const sustainability = recipe.sustainability_index || 0;
    const envScore = recipe.env_score || 0;
    const nutriScore = recipe.nutri_score || 0;
    
    // Környezeti javítások
    if (envScore > 60) {
        recommendations.push({
            type: 'environmental',
            priority: 'high',
            message: 'Cserélje le a magas környezeti hatású hozzávalókat növényi alternatívákra',
            impact: '+15-25 pont'
        });
    }
    
    // Táplálkozási javítások
    if (nutriScore < 60) {
        recommendations.push({
            type: 'nutritional',
            priority: 'medium',
            message: 'Adjon hozzá több zöldséget vagy teljes kiőrlésű gabonát',
            impact: '+10-20 pont'
        });
    }
    
    // Általános javaslatok
    if (sustainability < 70) {
        recommendations.push({
            type: 'general',
            priority: 'low',
            message: 'Válasszon helyi és szezonális alapanyagokat',
            impact: '+5-10 pont'
        });
    }
    
    return recommendations;
}

/**
 * Szezonalitás ellenőrzése
 * 
 * @param {string} ingredients - Hozzávalók
 * @param {number} month - Hónap (1-12)
 * @returns {Object} Szezonalitás információ
 */
export function checkSeasonality(ingredients, month = new Date().getMonth() + 1) {
    const seasonalIngredients = {
        spring: [3, 4, 5], // március-május
        summer: [6, 7, 8], // június-augusztus
        autumn: [9, 10, 11], // szeptember-november
        winter: [12, 1, 2]  // december-február
    };
    
    const seasonalFoods = {
        spring: ['spárga', 'retek', 'saláta', 'spenót', 'újhagyma'],
        summer: ['paradicsom', 'paprika', 'uborka', 'cukkini', 'barack', 'szilva'],
        autumn: ['tök', 'káposzta', 'alma', 'körte', 'szőlő', 'dió'],
        winter: ['kelbimbó', 'karfiol', 'répa', 'krumpli', 'citrus']
    };
    
    let currentSeason = 'spring';
    for (const [season, months] of Object.entries(seasonalIngredients)) {
        if (months.includes(month)) {
            currentSeason = season;
            break;
        }
    }
    
    const ingredientList = ingredients.toLowerCase().split(/[,\s]+/);
    const seasonalMatches = seasonalFoods[currentSeason].filter(food => 
        ingredientList.some(ingredient => ingredient.includes(food))
    );
    
    return {
        season: currentSeason,
        seasonalIngredients: seasonalMatches,
        seasonalityScore: seasonalMatches.length > 0 ? Math.min(100, seasonalMatches.length * 20) : 0,
        recommendations: seasonalMatches.length === 0 ? 
            [`Próbáljon ${currentSeason} szezonú alapanyagokat használni`] : []
    };
}
