/**
 * analytics.js
 * Analitika és statisztikák a Recept Kutatási Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { safeJsonParse, formatDate } from '../utils/helpers.js';

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
            testGroupCounts: {},
            sourceCounts: {},
            timeDistribution: {},
            sustainabilityTrend: []
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
    
    // Forrás statisztikák (search, details, ai-recommendation)
    const sourceCounts = {};
    userChoices.forEach(choice => {
        const source = choice.source || 'search';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    // Időbeli eloszlás
    const timeDistribution = calculateTimeDistribution(userChoices);
    
    // Fenntarthatósági trend
    const sustainabilityTrend = calculateSustainabilityTrend(userChoices);
    
    return {
        totalChoices: userChoices.length,
        avgDecisionTime: Math.round(avgDecisionTime * 10) / 10,
        avgSustainabilityIndex: Math.round(avgSustainabilityIndex * 10) / 10,
        avgEnvScore: Math.round(avgEnvScore * 10) / 10,
        avgNutriScore: Math.round(avgNutriScore * 10) / 10,
        categoryCounts,
        testGroupCounts,
        sourceCounts,
        timeDistribution,
        sustainabilityTrend,
        firstChoice: userChoices[0]?.timestamp,
        lastChoice: userChoices[userChoices.length - 1]?.timestamp
    };
}

/**
 * Időbeli eloszlás számítása
 * 
 * @param {Array} choices - Választások tömbje
 * @returns {Object} Időbeli eloszlás
 */
function calculateTimeDistribution(choices) {
    const distribution = {
        hourly: {},
        daily: {},
        weekly: {}
    };
    
    choices.forEach(choice => {
        if (!choice.timestamp) return;
        
        const date = new Date(choice.timestamp);
        const hour = date.getHours();
        const day = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const week = getWeekNumber(date);
        
        // Óránkénti eloszlás
        distribution.hourly[hour] = (distribution.hourly[hour] || 0) + 1;
        
        // Napi eloszlás
        distribution.daily[day] = (distribution.daily[day] || 0) + 1;
        
        // Heti eloszlás
        distribution.weekly[week] = (distribution.weekly[week] || 0) + 1;
    });
    
    return distribution;
}

/**
 * Fenntarthatósági trend számítása
 * 
 * @param {Array} choices - Választások tömbje
 * @returns {Array} Trend adatok
 */
function calculateSustainabilityTrend(choices) {
    if (choices.length < 2) return [];
    
    // Időrend szerint rendezés
    const sortedChoices = choices
        .filter(choice => choice.timestamp && choice.sustainabilityIndex)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Mozgóátlag számítása (3-as ablak)
    const trend = [];
    const windowSize = Math.min(3, sortedChoices.length);
    
    for (let i = 0; i <= sortedChoices.length - windowSize; i++) {
        const window = sortedChoices.slice(i, i + windowSize);
        const avgSustainability = window.reduce((sum, choice) => 
            sum + choice.sustainabilityIndex, 0) / windowSize;
        
        trend.push({
            date: window[Math.floor(windowSize / 2)].timestamp,
            sustainabilityIndex: Math.round(avgSustainability * 10) / 10,
            choiceCount: windowSize
        });
    }
    
    return trend;
}

/**
 * Hét számának meghatározása
 * 
 * @param {Date} date - Dátum
 * @returns {string} Hét szám (YYYY-WW)
 */
function getWeekNumber(date) {
    const onejan = new Date(date.getFullYear(), 0, 1);
    const millisecsInDay = 86400000;
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOfYear = ((today - onejan) / millisecsInDay) + 1;
    const weekNum = Math.ceil(dayOfYear / 7);
    
    return `${date.getFullYear()}-${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Teszt csoport teljesítmény elemzése
 * 
 * @returns {Object} Teszt csoport összehasonlítás
 */
export function getTestGroupPerformance() {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    
    const groupStats = {
        A: { choices: [], avgSustainability: 0, avgDecisionTime: 0 },
        B: { choices: [], avgSustainability: 0, avgDecisionTime: 0 },
        C: { choices: [], avgSustainability: 0, avgDecisionTime: 0 }
    };
    
    // Választások csoportosítása
    choices.forEach(choice => {
        const group = choice.testGroup;
        if (groupStats[group]) {
            groupStats[group].choices.push(choice);
        }
    });
    
    // Statisztikák számítása csoportonként
    Object.keys(groupStats).forEach(group => {
        const groupChoices = groupStats[group].choices;
        
        if (groupChoices.length > 0) {
            groupStats[group].avgSustainability = groupChoices.reduce((sum, choice) => 
                sum + (choice.sustainabilityIndex || 0), 0) / groupChoices.length;
            
            groupStats[group].avgDecisionTime = groupChoices.reduce((sum, choice) => 
                sum + (choice.decisionTime || 0), 0) / groupChoices.length;
                
            groupStats[group].totalChoices = groupChoices.length;
            
            // Kategória eloszlás
            groupStats[group].categoryDistribution = {};
            groupChoices.forEach(choice => {
                const category = choice.recipeCategory || 'egyéb';
                groupStats[group].categoryDistribution[category] = 
                    (groupStats[group].categoryDistribution[category] || 0) + 1;
            });
        }
    });
    
    return groupStats;
}

/**
 * Fenntarthatósági hatásosság mérése
 * 
 * @param {string} userId - Felhasználó azonosító
 * @returns {Object} Hatásosság metrikák
 */
export function getSustainabilityImpact(userId) {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), [])
        .filter(choice => !userId || choice.userId === userId);
    
    if (choices.length === 0) {
        return {
            totalImpact: 0,
            avgImpact: 0,
            improvementTrend: 0,
            carbonFootprintSaved: 0,
            recommendationAcceptance: 0
        };
    }
    
    // Alapvető hatás számítás
    const totalSustainabilityPoints = choices.reduce((sum, choice) => 
        sum + (choice.sustainabilityIndex || 50), 0);
    
    const avgImpact = totalSustainabilityPoints / choices.length;
    
    // Javulási trend (első és utolsó 20% összehasonlítása)
    const trendSize = Math.max(1, Math.floor(choices.length * 0.2));
    const firstChoices = choices.slice(0, trendSize);
    const lastChoices = choices.slice(-trendSize);
    
    const firstAvg = firstChoices.reduce((sum, choice) => 
        sum + (choice.sustainabilityIndex || 50), 0) / firstChoices.length;
    const lastAvg = lastChoices.reduce((sum, choice) => 
        sum + (choice.sustainabilityIndex || 50), 0) / lastChoices.length;
    
    const improvementTrend = lastAvg - firstAvg;
    
    // Becsült szén-lábnyom megtakarítás (modell alapú)
    const carbonFootprintSaved = calculateCarbonSavings(choices);
    
    // AI ajánlások elfogadási aránya
    const aiRecommendations = choices.filter(choice => choice.source === 'ai-recommendation');
    const recommendationAcceptance = choices.length > 0 ? 
        (aiRecommendations.length / choices.length) * 100 : 0;
    
    return {
        totalImpact: Math.round(totalSustainabilityPoints),
        avgImpact: Math.round(avgImpact * 10) / 10,
        improvementTrend: Math.round(improvementTrend * 10) / 10,
        carbonFootprintSaved: Math.round(carbonFootprintSaved * 100) / 100,
        recommendationAcceptance: Math.round(recommendationAcceptance * 10) / 10
    };
}

/**
 * Szén-lábnyom megtakarítás becslése
 * 
 * @param {Array} choices - Választások tömbje
 * @returns {number} Becsült CO2 megtakarítás kg-ban
 */
function calculateCarbonSavings(choices) {
    // Egyszerűsített modell: magasabb fenntarthatóság = alacsonyabb CO2
    const baselineEmission = 2.5; // kg CO2 per átlagos étel
    let totalSavings = 0;
    
    choices.forEach(choice => {
        const sustainabilityIndex = choice.sustainabilityIndex || 50;
        // Linearisan arányosítjuk: 100 pont = 50% megtakarítás
        const savingsPercentage = (sustainabilityIndex - 50) / 100;
        const mealSavings = baselineEmission * savingsPercentage;
        totalSavings += Math.max(0, mealSavings); // Csak pozitív megtakarítások
    });
    
    return totalSavings;
}

/**
 * Keresési analitika
 * 
 * @returns {Object} Keresési statisztikák
 */
export function getSearchAnalytics() {
    // Keresési adatok a localStorage-ból (ha implementálva van)
    const searches = safeJsonParse(localStorage.getItem('search_history'), []);
    
    if (searches.length === 0) {
        return {
            totalSearches: 0,
            popularIngredients: [],
            avgResultsPerSearch: 0,
            conversionRate: 0
        };
    }
    
    // Népszerű hozzávalók
    const ingredientCounts = {};
    searches.forEach(search => {
        if (search.ingredients) {
            const ingredients = search.ingredients.toLowerCase().split(/[,\s]+/);
            ingredients.forEach(ingredient => {
                if (ingredient.length > 2) {
                    ingredientCounts[ingredient] = (ingredientCounts[ingredient] || 0) + 1;
                }
            });
        }
    });
    
    const popularIngredients = Object.entries(ingredientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ingredient, count]) => ({ ingredient, count }));
    
    // Átlagos találatok száma
    const avgResultsPerSearch = searches.reduce((sum, search) => 
        sum + (search.resultsCount || 0), 0) / searches.length;
    
    // Konverziós ráta (keresés -> választás)
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    const conversionRate = searches.length > 0 ? (choices.length / searches.length) * 100 : 0;
    
    return {
        totalSearches: searches.length,
        popularIngredients,
        avgResultsPerSearch: Math.round(avgResultsPerSearch * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10
    };
}

/**
 * Felhasználói viselkedés elemzése
 * 
 * @param {string} userId - Felhasználó azonosító
 * @returns {Object} Viselkedési mintázatok
 */
export function getUserBehaviorAnalysis(userId) {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), [])
        .filter(choice => !userId || choice.userId === userId);
    
    if (choices.length === 0) {
        return {
            preferredCategories: [],
            decisionPatterns: {},
            sustainabilityAwareness: 'low',
            engagementLevel: 'low'
        };
    }
    
    // Előnyben részesített kategóriák
    const categoryCounts = {};
    choices.forEach(choice => {
        const category = choice.recipeCategory || 'egyéb';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    const preferredCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => ({
            category,
            count,
            percentage: Math.round((count / choices.length) * 100)
        }));
    
    // Döntési mintázatok
    const decisionTimes = choices.map(choice => choice.decisionTime || 0);
    const avgDecisionTime = decisionTimes.reduce((sum, time) => sum + time, 0) / decisionTimes.length;
    
    const decisionPatterns = {
        avgTime: Math.round(avgDecisionTime * 10) / 10,
        quickDecisions: decisionTimes.filter(time => time < 10).length,
        slowDecisions: decisionTimes.filter(time => time > 30).length,
        consistency: calculateDecisionConsistency(decisionTimes)
    };
    
    // Fenntarthatósági tudatosság
    const avgSustainability = choices.reduce((sum, choice) => 
        sum + (choice.sustainabilityIndex || 50), 0) / choices.length;
    
    let sustainabilityAwareness = 'low';
    if (avgSustainability > 70) {
        sustainabilityAwareness = 'high';
    } else if (avgSustainability > 55) {
        sustainabilityAwareness = 'medium';
    }
    
    // Elkötelezettségi szint
    let engagementLevel = 'low';
    if (choices.length > 10) {
        engagementLevel = 'high';
    } else if (choices.length > 3) {
        engagementLevel = 'medium';
    }
    
    return {
        preferredCategories,
        decisionPatterns,
        sustainabilityAwareness,
        engagementLevel,
        totalInteractions: choices.length
    };
}

/**
 * Döntési konzisztencia számítása
 * 
 * @param {Array} decisionTimes - Döntési idők tömbje
 * @returns {number} Konzisztencia pontszám (0-1)
 */
function calculateDecisionConsistency(decisionTimes) {
    if (decisionTimes.length < 2) return 1;
    
    const mean = decisionTimes.reduce((sum, time) => sum + time, 0) / decisionTimes.length;
    const variance = decisionTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / decisionTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Alacsonyabb szórás = magasabb konzisztencia
    const consistencyScore = Math.max(0, 1 - (standardDeviation / mean));
    return Math.round(consistencyScore * 100) / 100;
}

/**
 * Exportálható analitikai jelentés generálása
 * 
 * @param {string} userId - Felhasználó azonosító
 * @returns {Object} Teljes analitikai jelentés
 */
export function generateAnalyticsReport(userId) {
    const userStats = getUserChoiceStats(userId);
    const behaviorAnalysis = getUserBehaviorAnalysis(userId);
    const impactMetrics = getSustainabilityImpact(userId);
    const testGroupPerformance = getTestGroupPerformance();
    
    const report = {
        metadata: {
            generatedAt: new Date().toISOString(),
            userId: userId || 'all_users',
            reportVersion: '1.0'
        },
        summary: {
            totalChoices: userStats.totalChoices,
            avgSustainabilityScore: userStats.avgSustainabilityIndex,
            preferredCategory: behaviorAnalysis.preferredCategories[0]?.category || 'N/A',
            engagementLevel: behaviorAnalysis.engagementLevel,
            improvementTrend: impactMetrics.improvementTrend
        },
        detailed: {
            userStatistics: userStats,
            behaviorAnalysis: behaviorAnalysis,
            impactMetrics: impactMetrics,
            testGroupComparison: testGroupPerformance
        },
        insights: generateInsights(userStats, behaviorAnalysis, impactMetrics),
        recommendations: generateRecommendations(userStats, behaviorAnalysis)
    };
    
    return report;
}

/**
 * Felhasználói insight-ok generálása
 * 
 * @param {Object} userStats - Felhasználói statisztikák
 * @param {Object} behaviorAnalysis - Viselkedés elemzés
 * @param {Object} impactMetrics - Hatás metrikák
 * @returns {Array} Insight-ok
 */
function generateInsights(userStats, behaviorAnalysis, impactMetrics) {
    const insights = [];
    
    // Fenntarthatóság insight
    if (userStats.avgSustainabilityIndex > 70) {
        insights.push({
            type: 'positive',
            title: 'Kiváló fenntarthatósági tudatosság',
            description: `Átlagosan ${userStats.avgSustainabilityIndex.toFixed(1)} pontos fenntarthatósági választásokat hoz.`
        });
    } else if (userStats.avgSustainabilityIndex < 50) {
        insights.push({
            type: 'improvement',
            title: 'Fenntarthatóság fejlesztési lehetőség',
            description: 'A fenntarthatóbb választások javíthatják a környezeti hatását.'
        });
    }
    
    // Döntési sebesség insight
    if (userStats.avgDecisionTime < 15) {
        insights.push({
            type: 'neutral',
            title: 'Gyors döntéshozó',
            description: `Átlagosan ${userStats.avgDecisionTime.toFixed(1)} másodperc alatt dönt.`
        });
    } else if (userStats.avgDecisionTime > 45) {
        insights.push({
            type: 'neutral',
            title: 'Megfontolt döntéshozó',
            description: 'Időt szán a választások átgondolására.'
        });
    }
    
    // Javulási trend insight
    if (impactMetrics.improvementTrend > 5) {
        insights.push({
            type: 'positive',
            title: 'Pozitív fejlődési trend',
            description: `${impactMetrics.improvementTrend.toFixed(1)} pontos javulás a fenntarthatóságban.`
        });
    }
    
    // Kategória preferencia insight
    const topCategory = behaviorAnalysis.preferredCategories[0];
    if (topCategory && topCategory.percentage > 50) {
        insights.push({
            type: 'neutral',
            title: 'Erős kategória preferencia',
            description: `A választások ${topCategory.percentage}%-a ${topCategory.category} kategóriából származik.`
        });
    }
    
    return insights;
}

/**
 * Személyre szabott ajánlások generálása
 * 
 * @param {Object} userStats - Felhasználói statisztikák
 * @param {Object} behaviorAnalysis - Viselkedés elemzés
 * @returns {Array} Ajánlások
 */
function generateRecommendations(userStats, behaviorAnalysis) {
    const recommendations = [];
    
    // Fenntarthatóság alapú ajánlások
    if (userStats.avgSustainabilityIndex < 60) {
        recommendations.push({
            priority: 'high',
            title: 'Próbáljon több növényi alapú receptet',
            description: 'A zöldség-központú ételek jelentősen javíthatják a fenntarthatósági pontszámot.',
            action: 'search_vegetarian'
        });
    }
    
    // Diverzitás ajánlás
    const topCategory = behaviorAnalysis.preferredCategories[0];
    if (topCategory && topCategory.percentage > 70) {
        recommendations.push({
            priority: 'medium',
            title: 'Próbáljon új kategóriákat felfedezni',
            description: `Túl gyakran választ ${topCategory.category} kategóriából. Változatosság javítja a táplálkozást.`,
            action: 'explore_categories'
        });
    }
    
    // Döntési idő optimalizálás
    if (userStats.avgDecisionTime > 60) {
        recommendations.push({
            priority: 'low',
            title: 'Használja az AI magyarázatokat',
            description: 'Az AI magyarázatok segíthetnek gyorsabb, de tudatos döntések meghozatalában.',
            action: 'use_xai_features'
        });
    }
    
    // Engagement növelés
    if (behaviorAnalysis.engagementLevel === 'low') {
        recommendations.push({
            priority: 'medium',
            title: 'Fedezze fel a platform további funkcióit',
            description: 'További keresések segíthetnek jobb receptek megtalálásában.',
            action: 'increase_usage'
        });
    }
    
    return recommendations;
}

/**
 * Valós idejű analitika metrikák
 * 
 * @returns {Object} Valós idejű adatok
 */
export function getRealTimeMetrics() {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentChoices = choices.filter(choice => 
        choice.timestamp && new Date(choice.timestamp) > oneHourAgo
    );
    
    const todayChoices = choices.filter(choice =>
        choice.timestamp && new Date(choice.timestamp) > oneDayAgo
    );
    
    return {
        lastHour: {
            choices: recentChoices.length,
            avgSustainability: recentChoices.length > 0 ? 
                recentChoices.reduce((sum, choice) => sum + (choice.sustainabilityIndex || 0), 0) / recentChoices.length : 0
        },
        today: {
            choices: todayChoices.length,
            avgSustainability: todayChoices.length > 0 ?
                todayChoices.reduce((sum, choice) => sum + (choice.sustainabilityIndex || 0), 0) / todayChoices.length : 0
        },
        total: {
            choices: choices.length,
            users: new Set(choices.map(choice => choice.userId)).size
        }
    };
}

/**
 * Adatok tisztítása és karbantartása
 * 
 * @param {number} maxAge - Maximum életkor napokban
 * @returns {Object} Tisztítási eredmények
 */
export function cleanupAnalyticsData(maxAge = 90) {
    const choices = safeJsonParse(localStorage.getItem(CONFIG.STORAGE_KEYS.CHOICES), []);
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    
    const initialCount = choices.length;
    const cleanedChoices = choices.filter(choice => {
        if (!choice.timestamp) return false;
        return new Date(choice.timestamp) > cutoffDate;
    });
    
    localStorage.setItem(CONFIG.STORAGE_KEYS.CHOICES, JSON.stringify(cleanedChoices));
    
    const removedCount = initialCount - cleanedChoices.length;
    
    console.log(`🧹 Analytics cleanup: ${removedCount} régi rekord törölve`);
    
    return {
        initialCount,
        cleanedCount: cleanedChoices.length,
        removedCount,
        success: true
    };
}
