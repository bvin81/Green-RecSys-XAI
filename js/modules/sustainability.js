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
        'saláta': 5,      // Salátáknak bónusz
        'leves': 3,       // Leveseknek kis bónusz
        'főétel': 0,      // Főételeknek semleges
        'desszert': -2,   // Desszerteknek kis levonás
        'ital': 2,        // Italoknak kis bónusz
        'reggeli': 1,     // Reggeliknek kis bónusz
        'köret': 2,       // Köreteknek kis bónusz
        'egyéb': 0        // Egyéb ételeknek semleges
    };
    
    return modifiers[category] || 0;
}

/**
 * Környezeti hatás színének meghatározása
 * 
 * @param {number} envScore - Környezeti pontszám (0-100)
 * @returns {string} CSS szín
 */
export function getEnvironmentalColor(envScore) {
    if (typeof envScore !== 'number') {
        return '#666666'; // Szürke ismeretlen értékekhez
    }
    
    // Környezeti pontszám: magasabb = rosszabb
    if (envScore <= 20) {
        return '#22c55e'; // Zöld - nagyon jó
    } else if (envScore <= 40) {
        return '#84cc16'; // Világoszöld - jó
    } else if (envScore <= 60) {
        return '#eab308'; // Sárga - közepes
    } else if (envScore <= 80) {
        return '#f97316'; // Narancs - rossz
    } else {
        return '#ef4444'; // Piros - nagyon rossz
    }
}

/**
 * Környezeti hatás címkéjének meghatározása
 * 
 * @param {number} envScore - Környezeti pontszám (0-100)
 * @returns {string} Leíró címke
 */
export function getEnvironmentalLabel(envScore) {
    if (typeof envScore !== 'number') {
        return 'Ismeretlen';
    }
    
    if (envScore <= 20) {
        return 'Kiváló';
    } else if (envScore <= 40) {
        return 'Jó';
    } else if (envScore <= 60) {
        return 'Közepes';
    } else if (envScore <= 80) {
        return 'Rossz';
    } else {
        return 'Nagyon rossz';
    }
}

/**
 * Fenntarthatósági pontszám értékelése
 * 
 * @param {number} sustainabilityIndex - Fenntarthatósági index (0-100)
 * @returns {Object} Értékelés objektum (label, icon, color, category)
 */
export function evaluateSustainabilityScore(sustainabilityIndex) {
    if (typeof sustainabilityIndex !== 'number') {
        return {
            label: 'Ismeretlen',
            icon: '❓',
            color: '#666666',
            category: 'unknown'
        };
    }
    
    const categories = CONFIG.SUSTAINABILITY?.SCORE_CATEGORIES || [
        { min: 90, label: 'Kiváló', icon: '✨', color: '#22c55e', category: 'excellent' },
        { min: 80, label: 'Nagyon jó', icon: '🌿', color: '#84cc16', category: 'very-good' },
        { min: 70, label: 'Jó', icon: '👍', color: '#10b981', category: 'good' },
        { min: 60, label: 'Megfelelő', icon: '🆗', color: '#eab308', category: 'acceptable' },
        { min: 50, label: 'Közepes', icon: '⚠️', color: '#f59e0b', category: 'average' },
        { min: 40, label: 'Gyenge', icon: '📉', color: '#f97316', category: 'poor' },
        { min: 0, label: 'Rossz', icon: '❌', color: '#ef4444', category: 'bad' }
    ];
    
    for (const category of categories) {
        if (sustainabilityIndex >= category.min) {
            return {
                label: category.label,
                icon: category.icon,
                color: category.color,
                category: category.category
            };
        }
    }
    
    // Fallback
    return {
        label: 'Rossz',
        icon: '❌',
        color: '#ef4444',
        category: 'bad'
    };
}

/**
 * Kategória meghatározása hozzávalók alapján
 * 
 * @param {string} ingredients - Hozzávalók string
 * @returns {string} Kategória
 */
export function determineCategory(ingredients) {
    if (!ingredients || typeof ingredients !== 'string') {
        return 'egyéb';
    }
    
    const lowerIngredients = ingredients.toLowerCase();
    
    // Kategória kulcsszavak
    const categoryKeywords = {
        'saláta': ['saláta', 'uborka', 'paradicsom', 'paprika', 'hagyma', 'olíva', 'salad'],
        'leves': ['leves', 'soup', 'krém', 'brokkoli', 'sárgarépa', 'zeller'],
        'főétel': ['hús', 'csirke', 'marha', 'sertés', 'hal', 'pasta', 'rizs', 'burgonya'],
        'desszert': ['sütemény', 'torta', 'csokoládé', 'vanília', 'cukor', 'tejszín', 'gyümölcs'],
        'ital': ['smoothie', 'juice', 'tea', 'kávé', 'víz', 'tej', 'drink'],
        'reggeli': ['tojás', 'bacon', 'sonka', 'sajt', 'toast', 'müzli', 'joghurt'],
        'köret': ['krumpli', 'burgonya', 'rizs', 'pasta', 'zöldség', 'bab', 'lencse']
    };
    
    // Pontszámok számítása kategóriánként
    const scores = {};
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        scores[category] = keywords.reduce((score, keyword) => {
            return score + (lowerIngredients.includes(keyword) ? 1 : 0);
        }, 0);
    }
    
    // Legnagyobb pontszámú kategória keresése
    const bestCategory = Object.entries(scores).reduce((best, [category, score]) => {
        return score > best.score ? { category, score } : best;
    }, { category: 'egyéb', score: 0 });
    
    return bestCategory.score > 0 ? bestCategory.category : 'egyéb';
}

/**
 * Kategória ikon lekérése
 * 
 * @param {string} category - Kategória
 * @returns {string} Emoji ikon
 */
export function getCategoryIcon(category) {
    return CONFIG.CATEGORY_ICONS?.[category] || CONFIG.CATEGORY_ICONS?.['egyéb'] || '🍴';
}

/**
 * Hozzávaló fenntarthatósági hatása
 * 
 * @param {string} ingredient - Hozzávaló neve
 * @returns {Object} Hatás információ
 */
export function getIngredientSustainabilityImpact(ingredient) {
    if (!ingredient || typeof ingredient !== 'string') {
        return { impact: 'neutral', score: 0, explanation: 'Ismeretlen hozzávaló' };
    }
    
    const lowerIngredient = ingredient.toLowerCase().trim();
    
    // Fenntarthatósági adatbázis
    const sustainabilityData = {
        // Nagyon jó (alacsony környezeti hatás)
        'saláta': { impact: 'positive', score: 8, explanation: 'Alacsony szén-dioxid kibocsátás és vízigény' },
        'paradicsom': { impact: 'positive', score: 7, explanation: 'Helyi termesztés esetén környezetbarát' },
        'uborka': { impact: 'positive', score: 8, explanation: 'Minimális erőforrás igény' },
        'spenót': { impact: 'positive', score: 9, explanation: 'Magas tápérték, alacsony környezeti hatás' },
        'brokkoli': { impact: 'positive', score: 8, explanation: 'Kiváló tápérték, alacsony szén-lábnyom' },
        'sárgarépa': { impact: 'positive', score: 8, explanation: 'Hosszú tárolhatóság, alacsony hulladék' },
        'zöldség': { impact: 'positive', score: 7, explanation: 'Általában környezetbarát' },
        'gyümölcs': { impact: 'positive', score: 7, explanation: 'Természetes, minimálisan feldolgozott' },
        'bab': { impact: 'positive', score: 9, explanation: 'Magas fehérjetartalom, nitrogén fixálás' },
        'lencse': { impact: 'positive', score: 9, explanation: 'Fenntartható fehérjeforrás' },
        'quinoa': { impact: 'positive', score: 8, explanation: 'Teljes fehérje, alacsony vízigény' },
        
        // Jó (mérsékelt hatás)
        'rizs': { impact: 'neutral', score: 5, explanation: 'Mérsékelt környezeti hatás' },
        'pasta': { impact: 'neutral', score: 5, explanation: 'Gabona alapú, közepes fenntarthatóság' },
        'krumpli': { impact: 'neutral', score: 6, explanation: 'Jó tápérték, közepes erőforrás igény' },
        'burgonya': { impact: 'neutral', score: 6, explanation: 'Jó tápérték, közepes erőforrás igény' },
        'tojás': { impact: 'neutral', score: 4, explanation: 'Jó fehérje, de állattenyésztés hatása' },
        'tej': { impact: 'neutral', score: 3, explanation: 'Tápláló, de tejtermék környezeti hatás' },
        'sajt': { impact: 'neutral', score: 3, explanation: 'Magas tápérték, de jelentős környezeti hatás' },
        'hal': { impact: 'neutral', score: 4, explanation: 'Jó fehérje, de túlhalászat kockázat' },
        
        // Rossz (magas környezeti hatás)
        'csirke': { impact: 'negative', score: -2, explanation: 'Állattenyésztés környezeti hatása' },
        'csirkemell': { impact: 'negative', score: -2, explanation: 'Állattenyésztés környezeti hatása' },
        'sertés': { impact: 'negative', score: -4, explanation: 'Magas szén-dioxid kibocsátás' },
        'marha': { impact: 'negative', score: -6, explanation: 'Nagyon magas környezeti hatás' },
        'marhahús': { impact: 'negative', score: -6, explanation: 'Nagyon magas környezeti hatás' },
        'bacon': { impact: 'negative', score: -5, explanation: 'Feldolgozott hús, magas környezeti hatás' },
        'sonka': { impact: 'negative', score: -4, explanation: 'Feldolgozott hús' },
        'vaj': { impact: 'negative', score: -3, explanation: 'Tejtermék, magas szén-lábnyom' },
        'tejszín': { impact: 'negative', score: -3, explanation: 'Magas zsírtartalmú tejtermék' }
    };
    
    // Pontos egyezés keresése
    if (sustainabilityData[lowerIngredient]) {
        return sustainabilityData[lowerIngredient];
    }
    
    // Részleges egyezés keresése
    for (const [key, data] of Object.entries(sustainabilityData)) {
        if (lowerIngredient.includes(key) || key.includes(lowerIngredient)) {
            return data;
        }
    }
    
    // Alapértelmezett neutral
    return { impact: 'neutral', score: 0, explanation: 'Ismeretlen fenntarthatósági hatás' };
}

/**
 * Recept fenntarthatósági elemzése
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Object} Részletes elemzés
 */
export function analyzeSustainability(recipe) {
    if (!recipe || !recipe.ingredients) {
        return {
            overallScore: 50,
            analysis: 'Nincs elegendő adat az elemzéshez',
            ingredients: [],
            recommendations: []
        };
    }
    
    // Hozzávalók feldolgozása
    const ingredients = recipe.ingredients
        .toLowerCase()
        .replace(/^c\(|\)$/g, '') // R lista formátum eltávolítása
        .replace(/["']/g, '')     // Idézőjelek eltávolítása
        .split(',')
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient.length > 0);
    
    // Hozzávalók elemzése
    const ingredientAnalysis = ingredients.map(ingredient => ({
        name: ingredient,
        ...getIngredientSustainabilityImpact(ingredient)
    }));
    
    // Átlagos hatás számítása
    const totalScore = ingredientAnalysis.reduce((sum, item) => sum + item.score, 0);
    const avgScore = ingredients.length > 0 ? totalScore / ingredients.length : 0;
    
    // Skálázás 0-100 tartományra
    const scaledScore = Math.max(0, Math.min(100, 50 + (avgScore * 5)));
    
    // Javaslatok generálása
    const recommendations = generateSustainabilityRecommendations(ingredientAnalysis);
    
    return {
        overallScore: Math.round(scaledScore * 10) / 10,
        analysis: generateAnalysisText(ingredientAnalysis, scaledScore),
        ingredients: ingredientAnalysis,
        recommendations
    };
}

/**
 * Fenntarthatósági javaslatok generálása
 * 
 * @param {Array} ingredientAnalysis - Hozzávalók elemzése
 * @returns {Array} Javaslatok listája
 */
function generateSustainabilityRecommendations(ingredientAnalysis) {
    const recommendations = [];
    
    // Negatív hatású hozzávalók keresése
    const negativeIngredients = ingredientAnalysis.filter(item => item.impact === 'negative');
    
    if (negativeIngredients.length > 0) {
        recommendations.push('Próbálja csökkenteni a húsfogyasztást a környezeti hatás mérséklése érdekében.');
    }
    
    // Pozitív hozzávalók arányának növelése
    const positiveIngredients = ingredientAnalysis.filter(item => item.impact === 'positive');
    const totalIngredients = ingredientAnalysis.length;
    
    if (positiveIngredients.length / totalIngredients < 0.5) {
        recommendations.push('Növelje a zöldségek és növényi alapú hozzávalók arányát.');
    }
    
    // Specifikus javaslatok
    if (negativeIngredients.some(item => item.name.includes('marha'))) {
        recommendations.push('A marhahús helyett próbáljon babot vagy lencsét használni.');
    }
    
    if (negativeIngredients.some(item => item.name.includes('csirke'))) {
        recommendations.push('A csirkehús helyett próbáljon tofut vagy tempeh-t használni.');
    }
    
    // Ha már jó a recept
    if (recommendations.length === 0) {
        recommendations.push('Ez a recept már jó fenntarthatósági egyensúlyt mutat!');
    }
    
    return recommendations;
}

/**
 * Elemzési szöveg generálása
 * 
 * @param {Array} ingredientAnalysis - Hozzávalók elemzése
 * @param {number} overallScore - Összesített pontszám
 * @returns {string} Elemzési szöveg
 */
function generateAnalysisText(ingredientAnalysis, overallScore) {
    const positive = ingredientAnalysis.filter(item => item.impact === 'positive').length;
    const negative = ingredientAnalysis.filter(item => item.impact === 'negative').length;
    const total = ingredientAnalysis.length;
    
    let text = `Ez a recept ${overallScore.toFixed(1)}/100 fenntarthatósági pontot ért el. `;
    
    if (overallScore >= 80) {
        text += 'Kiváló választás a környezet számára!';
    } else if (overallScore >= 60) {
        text += 'Jó fenntarthatósági profil, néhány javítási lehetőséggel.';
    } else if (overallScore >= 40) {
        text += 'Közepes fenntarthatóság, érdemes lehet módosításokat eszközölni.';
    } else {
        text += 'A fenntarthatóság javítható lenne néhány hozzávaló cseréjével.';
    }
    
    text += ` A recept ${positive} környezetbarát és ${negative} magas környezeti hatású hozzávalót tartalmaz.`;
    
    return text;
}

/**
 * Szezonális pontszám módosító
 * 
 * @param {string} ingredient - Hozzávaló
 * @param {Date} date - Dátum (alapértelmezett: ma)
 * @returns {number} Szezonális módosító (-2 - +2)
 */
export function getSeasonalModifier(ingredient, date = new Date()) {
    const month = date.getMonth() + 1; // 1-12
    const lowerIngredient = ingredient.toLowerCase();
    
    const seasonalData = {
        // Tavaszi (március-május): 3,4,5
        'spárga': { peak: [3, 4, 5], modifier: 2 },
        'retek': { peak: [3, 4, 5], modifier: 1 },
        'saláta': { peak: [3, 4, 5, 6], modifier: 1 },
        
        // Nyári (június-augusztus): 6,7,8  
        'paradicsom': { peak: [6, 7, 8], modifier: 2 },
        'paprika': { peak: [6, 7, 8], modifier: 2 },
        'uborka': { peak: [6, 7, 8], modifier: 2 },
        'cukkini': { peak: [6, 7, 8], modifier: 2 },
        
        // Őszi (szeptember-november): 9,10,11
        'tök': { peak: [9, 10, 11], modifier: 2 },
        'alma': { peak: [9, 10, 11], modifier: 2 },
        'szőlő': { peak: [9, 10], modifier: 2 },
        
        // Téli (december-február): 12,1,2
        'káposzta': { peak: [12, 1, 2], modifier: 2 },
        'répa': { peak: [12, 1, 2], modifier: 1 },
        'krumpli': { peak: [9, 10, 11, 12], modifier: 1 }
    };
    
    for (const [key, data] of Object.entries(seasonalData)) {
        if (lowerIngredient.includes(key)) {
            return data.peak.includes(month) ? data.modifier : -1;
        }
    }
    
    return 0; // Semleges, ha nincs szezonális adat
}
