/**
 * sustainability.js
 * Fenntarthatósági számítások a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';

/**
 * Normalizált környezeti pontszám számítása
 * Az eredeti env_score alacsonyabb értéke jobb (kevésbé környezetszennyező),
 * a normalizált pontszám 0-100 között van, ahol magasabb = jobb
 * 
 * @param {number} rawScore - Eredeti környezeti pontszám
 * @returns {number} Normalizált környezeti pontszám (0-100)
 */
export function normalizeEnvScore(rawScore) {
    if (rawScore <= 0) return 0;
    
    // Maximális érték, amire normalizálunk
    const maxEnvScore = 100;
    
    // Fordított skála: alacsonyabb érték -> magasabb pontszám
    return Math.max(0, Math.min(100, 100 - (rawScore / maxEnvScore * 100)));
}

/**
 * Normalizált táplálkozási pontszám számítása
 * 
 * @param {number} nutriScore - Eredeti táplálkozási pontszám
 * @returns {number} Normalizált táplálkozási pontszám (0-100)
 */
export function normalizeNutriScore(nutriScore) {
    if (nutriScore <= 0) return 0;
    return Math.min(100, nutriScore);
}

/**
 * Fenntarthatósági pontszám számítása
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {number} Fenntarthatósági pontszám (0-100)
 */
export function calculateSustainabilityScore(recipe) {
    const envScore = recipe.env_score || 0;
    const nutriScore = recipe.nutri_score || 0;
    
    // Ha valamelyik 0, akkor nem számítható
    if (envScore <= 0 || nutriScore <= 0) {
        return 0;
    }
    
    // Környezeti komponens (fordított, mert alacsony env_score = jobb)
    const environmentalComponent = Math.max(0, 100 - envScore);
    
    // Táplálkozási komponens
    const nutritionalComponent = Math.min(100, nutriScore);
    
    // Súlyozott átlag a konfigurációban megadott súlyokkal
    const sustainabilityScore = 
        (environmentalComponent * CONFIG.SUSTAINABILITY.ENVIRONMENT_WEIGHT) + 
        (nutritionalComponent * CONFIG.SUSTAINABILITY.NUTRITION_WEIGHT);
    
    // Kategória bónusz/malus
    const categoryModifier = getCategoryModifier(recipe.category);
    
    // Végső pontszám (0-100 közé korlátozva)
    return Math.max(0, Math.min(100, sustainabilityScore + categoryModifier));
}

/**
 * Kategória alapú módosító érték
 * 
 * @param {string} category - Recept kategória
 * @returns {number} Módosító érték
 */
export function getCategoryModifier(category) {
    return CONFIG.SUSTAINABILITY.CATEGORY_MODIFIERS[category] || 0;
}

/**
 * Környezeti pontszám színkódja
 * 
 * @param {number} score - Környezeti pontszám
 * @returns {string} Színkód (HEX)
 */
export function getEnvironmentalColor(score) {
    for (const range of CONFIG.SUSTAINABILITY.ENV_SCORE_RANGES) {
        if (score <= range.max) {
            return range.color;
        }
    }
    return CONFIG.SUSTAINABILITY.ENV_SCORE_RANGES[
        CONFIG.SUSTAINABILITY.ENV_SCORE_RANGES.length - 1
    ].color;
}

/**
 * Környezeti pontszám címkéje
 * 
 * @param {number} score - Környezeti pontszám
 * @returns {string} Leíró címke
 */
export function getEnvironmentalLabel(score) {
    for (const range of CONFIG.SUSTAINABILITY.ENV_SCORE_RANGES) {
        if (score <= range.max) {
            return range.label;
        }
    }
    return CONFIG.SUSTAINABILITY.ENV_SCORE_RANGES[
        CONFIG.SUSTAINABILITY.ENV_SCORE_RANGES.length - 1
    ].label;
}

/**
 * Fenntarthatósági pontszám értékelése
 * 
 * @param {number} score - Fenntarthatósági pontszám
 * @returns {Object} Értékelés objektum (label, icon)
 */
export function evaluateSustainabilityScore(score) {
    for (const range of CONFIG.SUSTAINABILITY.ECO_SCORE_RANGES) {
        if (score >= range.min) {
            return {
                label: range.label,
                icon: range.icon
            };
        }
    }
    return {
        label: CONFIG.SUSTAINABILITY.ECO_SCORE_RANGES[
            CONFIG.SUSTAINABILITY.ECO_SCORE_RANGES.length - 1
        ].label,
        icon: CONFIG.SUSTAINABILITY.ECO_SCORE_RANGES[
            CONFIG.SUSTAINABILITY.ECO_SCORE_RANGES.length - 1
        ].icon
    };
}

/**
 * Recept kategóriájának meghatározása
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {string} Meghatározott kategória
 */
export function determineCategory(recipe) {
    const name = (recipe.name || '').toLowerCase();
    const ingredients = (recipe.ingredients || '').toLowerCase();
    const text = name + ' ' + ingredients;
    
    // Kategória szabályok (magyar nyelvre optimalizálva)
    const categoryRules = {
        'leves': ['leves', 'húslé', 'alaplé', 'soup', 'broth'],
        'saláta': ['saláta', 'salad', 'uborka', 'lettuce', 'vegyes'],
        'főétel': ['csirke', 'chicken', 'marhahús', 'beef', 'hal', 'fish', 'sertéshús', 'pork', 'tészta', 'pasta', 'rizs', 'rice', 'steak', 'schnitzel'],
        'desszert': ['cukor', 'sugar', 'méz', 'honey', 'csokoládé', 'chocolate', 'sütemény', 'cake', 'torta', 'keksz'],
        'ital': ['smoothie', 'juice', 'tea', 'coffee', 'ital', 'shake', 'koktél'],
        'reggeli': ['tojás', 'egg', 'omlett', 'pancake', 'müzli', 'cereal', 'zabkása', 'pirítós'],
        'köret': ['burgonya', 'potato', 'sárgarépa', 'carrot', 'brokkoli', 'spárga', 'zöldség köret']
    };
    
    // Keresés a szövegben kategória kulcsszavak alapján
    for (const [category, keywords] of Object.entries(categoryRules)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return category;
        }
    }
    
    return 'egyéb';
}

/**
 * Kategória ikon lekérése
 * 
 * @param {string} category - Kategória
 * @returns {string} Kategória ikon
 */
export function getCategoryIcon(category) {
    return CONFIG.CATEGORY_ICONS[category] || CONFIG.CATEGORY_ICONS['egyéb'];
}
