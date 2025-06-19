/**
 * ui-components.js
 * Felhasználói felület komponensek az Eco-Score Recept Kutató Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './config.js';
import { formatIngredients, formatRecipeName, formatScore, formatTime, highlightSearchTerms } from '../utils/formatter.js';
import { getEnvironmentalColor, getEnvironmentalLabel, evaluateSustainabilityScore } from './sustainability.js';
import { getExplanation, findSimilarButMoreSustainableRecipes, suggestIngredientSubstitutions } from './xai-explainer.js';

// XAI magyarázat cache a gyorsabb betöltéshez
const xaiExplanationCache = {};

/**
 * Receptkártya HTML generálása
 * 
 * @param {Object} recipe - Recept objektum
 * @param {number} index - Recept indexe a listában
 * @param {string} searchIngredients - Keresési kifejezés
 * @param {string} testGroup - Teszt csoport (A, B, C)
 * @returns {string} Receptkártya HTML
 */
export function generateRecipeCard(recipe, index, searchIngredients, testGroup) {
    const showScores = ['B', 'C'].includes(testGroup);
    const showXAI = testGroup === 'C';
    
    const categoryIcon = recipe.categoryIcon || CONFIG.CATEGORY_ICONS['egyéb'];
    const safeName = (recipe.name || '').replace(/'/g, '');
    const safeIngredients = (searchIngredients || '').replace(/'/g, '');
    
    return `
        <div class="recipe-card" data-recipe-id="${recipe.recipeid}">
            <div class="recipe-header">
                <h3>${categoryIcon} ${formatRecipeName(recipe.name)}</h3>
                <span class="rank-badge">#${index + 1}</span>
            </div>
            
            <div class="recipe-ingredients">
                <strong>Hozzávalók:</strong> ${highlightSearchTerms(formatIngredients(recipe.ingredients), searchIngredients)}
            </div>
            
            ${showScores ? generateEcoScoreSection(recipe) : ''}
            
            ${showXAI ? `<div class="xai-container" id="xai-container-${recipe.recipeid}">
                <div class="eco-xai-section loading">
                    <div class="eco-xai-header">
                        🧠 AI Magyarázat betöltése...
                    </div>
                    <div class="eco-xai-content">
                        <div class="loading-spinner"></div>
                        <p>AI elemzés folyamatban...</p>
                    </div>
                </div>
            </div>` : ''}
            
            <div class="recipe-actions">
                <button onclick="app.viewRecipeDetails(${recipe.recipeid})" class="btn-secondary">Részletek</button>
                <button onclick="app.selectRecipe(${recipe.recipeid}, '${safeName}', ${index + 1}, '${safeIngredients}')" class="btn-primary">Ezt választom</button>
            </div>
        </div>
    `;
}

/**
 * Fenntarthatósági pontszám szekció generálása
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {string} Fenntarthatósági szekció HTML
 */
function generateEcoScoreSection(recipe) {
    const sustainability = recipe.sustainability_index || 0;
    const envScore = recipe.env_score || 0;
    const nutriScore = recipe.nutri_score || 0;
    
    const envColor = getEnvironmentalColor(envScore);
    const envLabel = getEnvironmentalLabel(envScore);
    const ecoEvaluation = evaluateSustainabilityScore(sustainability);
    
    return `
        <div class="eco-score-section">
            <div class="eco-score-header">
                🌱 Fenntarthatósági információk
            </div>
            <div class="eco-score-container">
                <div class="eco-score-item">
                    <div class="eco-score-value" style="color: ${envColor};">
                        ${formatScore(sustainability)}
                    </div>
                    <div class="eco-score-label">
                        Eco-Score
                    </div>
                </div>
                <div class="eco-score-item">
                    <div class="eco-score-value" style="color: ${envColor};">
                        ${formatScore(envScore)}
                    </div>
                    <div class="eco-score-label">
                        Környezeti hatás
                    </div>
                </div>
                <div class="eco-score-item">
                    <div class="eco-score-value">
                        ${formatScore(nutriScore)}
                    </div>
                    <div class="eco-score-label">
                        Táplálkozási érték
                    </div>
                </div>
            </div>
            <div class="eco-score-evaluation">
                ${ecoEvaluation.icon} ${ecoEvaluation.label}
            </div>
        </div>
    `;
}

/**
 * XAI magyarázatok generálása és megjelenítése
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {Promise<string>} XAI magyarázat HTML
 */
export async function generateAndDisplayXAI(recipe) {
    const containerId = `xai-container-${recipe.recipeid}`;
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.warn(`⚠️ XAI konténer nem található: ${containerId}`);
        return '';
    }
    
    try {
        // XAI magyarázat lekérése (cache-el)
        let xaiExplanation;
        
        if (xaiExplanationCache[recipe.recipeid] && CONFIG.XAI.CACHE_RESULTS) {
            xaiExplanation = xaiExplanationCache[recipe.recipeid];
        } else {
            xaiExplanation = await getExplanation(recipe);
            if (CONFIG.XAI.CACHE_RESULTS) {
                xaiExplanationCache[recipe.recipeid] = xaiExplanation;
            }
        }
        
        const xaiHtml = generateXaiHTML(recipe, xaiExplanation);
        
        // Frissítjük a tartalmat
        container.innerHTML = xaiHtml;
        container.classList.add('loaded');
        
        // Interaktív elemek inicializálása
        initXaiInteractiveElements(container, recipe);
        
        return xaiHtml;
        
    } catch (error) {
        console.error('❌ XAI magyarázat generálási hiba:', error);
        
        // Hiba esetén egyszerűsített magyarázat
        const fallbackHtml = generateXaiFallbackHTML(recipe);
        container.innerHTML = fallbackHtml;
        
        return fallbackHtml;
    }
}

/**
 * XAI magyarázat HTML generálása
 * 
 * @param {Object} recipe - Recept objektum
 * @param {Object} xaiExplanation - XAI magyarázat objektum
 * @returns {string} XAI HTML
 */
function generateXaiHTML(recipe, xaiExplanation) {
    const sustainability = recipe.sustainability_index || 0;
    const envScore = recipe.env_score || 0;
    const nutriScore = recipe.nutri_score || 0;
    const category = recipe.category || 'egyéb';
    
    // Számítás részleteinek megjelenítése
    const environmentalComponent = Math.max(0, 100 - envScore);
    const nutritionalComponent = Math.min(100, nutriScore);
    const categoryModifier = CONFIG.SUSTAINABILITY.CATEGORY_MODIFIERS[category] || 0;
    
    // Környezeti tényezők HTML
    const envFactorsHtml = xaiExplanation.environmentalFactors.map(factor => `
        <div class="xai-factor ${factor.impact === 'pozitív' ? 'positive' : factor.impact === 'negatív' ? 'negative' : 'neutral'}">
            <div class="factor-header">
                <span class="factor-name">${factor.name}</span>
                <span class="factor-impact ${factor.impact}">${factor.impact === 'pozitív' ? '✅' : factor.impact === 'negatív' ? '⚠️' : '⚖️'}</span>
            </div>
            <div class="factor-explanation">${factor.explanation || ''}</div>
            <div class="factor-importance-bar">
                <div class="importance-fill" style="width: ${Math.round(factor.importance * 100)}%;"></div>
            </div>
        </div>
    `).join('');
    
    // Táplálkozási tényezők HTML
    const nutriFactorsHtml = xaiExplanation.nutritionalFactors.map(factor => `
        <div class="xai-factor ${factor.impact === 'pozitív' ? 'positive' : factor.impact === 'negatív' ? 'negative' : 'neutral'}">
            <div class="factor-header">
                <span class="factor-name">${factor.name}</span>
                <span class="factor-impact ${factor.impact}">${factor.impact === 'pozitív' ? '✅' : factor.impact === 'negatív' ? '⚠️' : '⚖️'}</span>
            </div>
            <div class="factor-explanation">${factor.explanation || ''}</div>
            <div class="factor-importance-bar">
                <div class="importance-fill" style="width: ${Math.round(factor.importance * 100)}%;"></div>
            </div>
        </div>
    `).join('');
    
    // Javaslatok HTML
    const suggestionsHtml = xaiExplanation.suggestions && xaiExplanation.suggestions.length > 0 
        ? `
            <div class="xai-suggestions">
                <h4>Javaslatok a fenntarthatóság javítására:</h4>
                <ul>
                    ${xaiExplanation.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
                ${CONFIG.XAI.SUGGEST_ALTERNATIVES ? 
                    `<button class="btn-alternative-suggestions" data-recipe-id="${recipe.recipeid}">
                        Fenntarthatóbb alternatívák
                    </button>` : ''
                }
            </div>
        ` 
        : '';
    
    // Teljes XAI magyarázat HTML
    return `
        <div class="eco-xai-section">
            <div class="eco-xai-header">
                🧠 AI Magyarázat - Miért ez a pontszám?
            </div>
            <div class="eco-xai-content">
                <p><strong>Számítás részletei:</strong></p>
                <ul>
                    <li>Környezeti komponens (100-${envScore.toFixed(1)}): <strong>${environmentalComponent.toFixed(1)}</strong> × 60% = ${(environmentalComponent * 0.6).toFixed(1)}</li>
                    <li>Táplálkozási komponens: <strong>${nutritionalComponent.toFixed(1)}</strong> × 40% = ${(nutritionalComponent * 0.4).toFixed(1)}</li>
                    ${categoryModifier !== 0 ? 
                        `<li>Kategória bónusz (${category}): <strong>${categoryModifier > 0 ? '+' : ''}${categoryModifier}</strong></li>` : ''}
                    <li><strong>Végső Eco-Score: ${sustainability.toFixed(1)}/100</strong></li>
                </ul>
                
                <div class="xai-summary">
                    ${xaiExplanation.summary}
                </div>
                
                <div class="xai-factors-container">
                    <div class="xai-factors-column">
                        <h4>Környezeti tényezők</h4>
                        ${envFactorsHtml}
                    </div>
                    <div class="xai-factors-column">
                        <h4>Táplálkozási tényezők</h4>
                        ${nutriFactorsHtml}
                    </div>
                </div>
                
                ${suggestionsHtml}
                
                ${CONFIG.XAI.SHOW_CONFIDENCE ? `
                <div class="xai-footer">
                    <span class="xai-model">AI Modell: ${xaiExplanation.model || 'Eco-XAI'}</span>
                    <span class="xai-confidence">Pontosság: ${Math.round((xaiExplanation.confidence || 0.8) * 100)}%</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * XAI interaktív elemek inicializálása
 * 
 * @param {HTMLElement} container - XAI konténer elem
 * @param {Object} recipe - Recept objektum
 */
function initXaiInteractiveElements(container, recipe) {
    if (!container) return;
    
    // Fenntarthatóbb alternatívák gomb
    const alternativesBtn = container.querySelector('.btn-alternative-suggestions');
    if (alternativesBtn) {
        alternativesBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            showAlternativeSuggestions(recipe);
        });
    }
}

/**
 * Fenntarthatóbb alternatívák megjelenítése
 * 
 * @param {Object} recipe - Recept objektum
 */
async function showAlternativeSuggestions(recipe) {
    try {
        // Modális ablak létrehozása
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return;
        
        // Betöltő indikátor
        modalContainer.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Fenntarthatóbb alternatívák</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="loading-spinner"></div>
                    <p>Alternatívák keresése...</p>
                </div>
            </div>
        `;
        
        modalContainer.classList.add('active');
        
        // Bezárás gomb eseménykezelő
        const closeBtn = modalContainer.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modalContainer.classList.remove('active');
            });
        }
        
        // Háttér kattintás eseménykezelő
        const backdrop = modalContainer.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                modalContainer.classList.remove('active');
            });
        }
        
        // Összes recept lekérése az app példányról
        const allRecipes = window.app ? window.app.recipes : [];
        
        // Hasonló, de fenntarthatóbb receptek keresése
        const similarRecipes = findSimilarButMoreSustainableRecipes(recipe, allRecipes);
        
        // Összetevő helyettesítési javaslatok
        const substitutions = suggestIngredientSubstitutions(recipe);
        
        // Modális tartalom frissítése
        const modalBody = modalContainer.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = generateAlternativesHTML(recipe, similarRecipes, substitutions);
        }
        
    } catch (error) {
        console.error('❌ Alternatívák megjelenítési hiba:', error);
    }
}

/**
 * Alternatívák HTML generálása
 * 
 * @param {Object} recipe - Eredeti recept
 * @param {Array} similarRecipes - Hasonló receptek
 * @param {Array} substitutions - Helyettesítési javaslatok
 * @returns {string} Alternatívák HTML
 */
function generateAlternativesHTML(recipe, similarRecipes, substitutions) {
    let html = `
        <div class="alternatives-container">
            <p>Az alábbi lehetőségekkel teheti fenntarthatóbbá az étkezését:</p>
    `;
    
    // Hasonló receptek javaslatok
    if (similarRecipes && similarRecipes.length > 0) {
        html += `
            <div class="alternatives-section">
                <h3>Hasonló, de fenntarthatóbb receptek</h3>
                <div class="similar-recipes-container">
        `;
        
        similarRecipes.forEach(item => {
            const improvementClass = item.sustainabilityImprovement >= 15 ? 'high-improvement' : 
                                     item.sustainabilityImprovement >= 8 ? 'medium-improvement' : 'low-improvement';
            
            const safeName = (item.recipe.name || '').replace(/'/g, '');
            
            html += `
                <div class="similar-recipe-card">
                    <div class="similar-recipe-header">
                        <h4>${item.recipe.categoryIcon || CONFIG.CATEGORY_ICONS['egyéb']} ${formatRecipeName(item.recipe.name)}</h4>
                    </div>
                    <div class="similar-recipe-metrics">
                        <div class="similar-recipe-metric">
                            <span class="metric-label">Hasonlóság</span>
                            <span class="metric-value">${item.similarity}%</span>
                        </div>
                        <div class="similar-recipe-metric ${improvementClass}">
                            <span class="metric-label">Eco-Score javulás</span>
                            <span class="metric-value">+${item.sustainabilityImprovement}</span>
                        </div>
                    </div>
                    <div class="similar-recipe-footer">
                        <button onclick="app.viewRecipeDetails(${item.recipe.recipeid})" class="btn-secondary btn-sm">Részletek</button>
                        <button onclick="app.selectRecipe(${item.recipe.recipeid}, '${safeName}', 0, 'alternatíva')" class="btn-primary btn-sm">Ezt választom</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Összetevő helyettesítési javaslatok
    if (substitutions && substitutions.length > 0) {
        html += `
            <div class="alternatives-section">
                <h3>Összetevő helyettesítési javaslatok</h3>
                <table class="substitutions-table">
                    <thead>
                        <tr>
                            <th>Eredeti összetevő</th>
                            <th>Fenntarthatóbb alternatíva</th>
                            <th>Javulás</th>
                            <th>Magyarázat</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        substitutions.forEach(sub => {
            const improvementClass = sub.improvementPercent >= 50 ? 'high-improvement' : 
                                     sub.improvementPercent >= 25 ? 'medium-improvement' : 'low-improvement';
            
            html += `
                <tr>
                    <td>${sub.original}</td>
                    <td>${sub.substitute}</td>
                    <td class="${improvementClass}">+${sub.improvementPercent}%</td>
                    <td>${sub.explanation}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // Ha nincs javaslat
    if ((!similarRecipes || similarRecipes.length === 0) && (!substitutions || substitutions.length === 0)) {
        html += `
            <div class="alternatives-empty">
                <p>Jelenleg nincs elérhető alternatíva javaslat ehhez a recepthez.</p>
            </div>
        `;
    }
    
    html += `
        </div>
    `;
    
    return html;
}

/**
 * Keresési eredmények megjelenítése
 * 
 * @param {Array} recipes - Receptek tömbje
 * @param {string} searchIngredients - Keresési kifejezés
 * @param {string} testGroup - Teszt csoport (A, B, C)
 * @returns {string} Keresési eredmények HTML
 */
export function generateSearchResults(recipes, searchIngredients, testGroup) {
    if (!recipes || recipes.length === 0) {
        return `
            <div class="no-results">
                <p>Sajnos nem találtunk receptet a megadott hozzávalókkal.</p>
                <p>Próbáljon meg más hozzávalókat keresni vagy általánosabb keresést használni.</p>
            </div>
        `;
    }
    
    return recipes.map((recipe, index) => 
        generateRecipeCard(recipe, index, searchIngredients, testGroup)
    ).join('');
}

/**
 * Felhasználói információk megjelenítése
 * 
 * @param {Object} user - Felhasználó objektum
 * @returns {string} Felhasználói információk HTML
 */
export function generateUserInfo(user) {
    if (!user) return '';
    
    // Nem mutatjuk a teszt csoport azonosítót és leírást a felhasználói felületen
    return `
        <div class="user-info">
            <span>${user.email}</span>
        </div>
    `;
}

/**
 * Recept részletek modális ablak generálása
 * 
 * @param {Object} recipe - Recept objektum
 * @param {string} testGroup - Teszt csoport (A, B, C)
 * @returns {string} Modális ablak HTML
 */
export function generateRecipeDetailsModal(recipe, testGroup) {
    if (!recipe) return '';
    
    const showScores = ['B', 'C'].includes(testGroup);
    const showXAI = testGroup === 'C';
    
    const categoryIcon = recipe.categoryIcon || CONFIG.CATEGORY_ICONS['egyéb'];
    const ingredients = formatIngredients(recipe.ingredients);
    const safeName = (recipe.name || '').replace(/'/g, '');
    
    // Elkészítési utasítások formázása
    let instructions = 'Nincs elérhető utasítás';
    if (recipe.instructions) {
        instructions = formatIngredients(recipe.instructions)
            .split('.')
            .filter(step => step.trim().length > 0)
            .map(step => `<li>${step.trim()}</li>`)
            .join('');
    }
    
    return `
        <div class="modal-backdrop"></div>
        <div class="modal-content recipe-details-modal">
            <div class="modal-header">
                <h2>${categoryIcon} ${formatRecipeName(recipe.name)}</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="recipe-details-section">
                    <h3>🥗 Hozzávalók</h3>
                    <p>${ingredients}</p>
                </div>
                
                <div class="recipe-details-section">
                    <h3>👨‍🍳 Elkészítés</h3>
                    <ol>${instructions}</ol>
                </div>
                
                ${showScores ? `
                <div class="recipe-details-section">
                    <h3>🌱 Fenntarthatósági adatok</h3>
                    <div class="eco-details">
                        <div class="eco-detail-item">
                            <span class="eco-detail-label">Eco-Score:</span>
                            <span class="eco-detail-value">${formatScore(recipe.sustainability_index)}/100</span>
                        </div>
                        <div class="eco-detail-item">
                            <span class="eco-detail-label">Környezeti hatás:</span>
                            <span class="eco-detail-value">${formatScore(recipe.env_score)}</span>
                        </div>
                        <div class="eco-detail-item">
                            <span class="eco-detail-label">Táplálkozási érték:</span>
                            <span class="eco-detail-value">${formatScore(recipe.nutri_score)}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${showXAI ? `
                <div class="recipe-details-section">
                    <h3>🧠 Fenntarthatósági elemzés</h3>
                    <div class="xai-container-detail" id="xai-container-detail-${recipe.recipeid}">
                        <div class="eco-xai-section loading">
                            <div class="eco-xai-header">
                                AI Magyarázat betöltése...
                            </div>
                            <div class="eco-xai-content">
                                <div class="loading-spinner"></div>
                                <p>AI elemzés folyamatban...</p>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary modal-close-btn">Bezárás</button>
                <button class="btn-primary" onclick="app.selectRecipe(${recipe.recipeid}, '${safeName}', 0, 'részletek')">Ezt választom</button>
            </div>
        </div>
    `;
}

/**
 * Választás visszaigazolás megjelenítése
 * 
 * @param {Object} recipe - Kiválasztott recept
 * @param {number} decisionTime - Döntési idő másodpercekben
 * @returns {string} Visszaigazolás üzenet
 */
export function generateSelectionConfirmation(recipe, decisionTime) {
    if (!recipe) return 'Köszönjük a választását!';
    
    const formattedTime = formatTime(decisionTime);
    
    let message = `Köszönjük a választását!\n\n`;
    message += `🍽️ Választott recept: ${recipe.name}`;
    
    if (recipe.category) {
        message += `\n📂 Kategória: ${recipe.category}`;
    }
    
    if (recipe.sustainability_index) {
        message += `\n🌱 Eco-Score: ${formatScore(recipe.sustainability_index)}/100`;
    }
    
    if (recipe.env_score) {
        message += `\n🌍 Környezeti hatás: ${formatScore(recipe.env_score)}`;
    }
    
    message += `\n⏱️ Döntési idő: ${formattedTime}`;
    message += `\n\n✅ A választás sikeresen rögzítve a kutatáshoz!`;
    
    return message;
}

/**
 * Fallback XAI HTML generálása
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {string} Fallback HTML
 */
function generateXaiFallbackHTML(recipe) {
    const sustainability = recipe.sustainability_index || 0;
    const envScore = recipe.env_score || 0;
    const nutriScore = recipe.nutri_score || 0;
    const category = recipe.category || 'egyéb';
    
    // Számítás részleteinek megjelenítése
    const environmentalComponent = Math.max(0, 100 - envScore);
    const nutritionalComponent = Math.min(100, nutriScore);
    const categoryModifier = CONFIG.SUSTAINABILITY.CATEGORY_MODIFIERS[category] || 0;
    
    return `
        <div class="eco-xai-section">
            <div class="eco-xai-header">
                🧠 Fenntarthatósági magyarázat
            </div>
            <div class="eco-xai-content">
                <p><strong>Számítás részletei:</strong></p>
                <ul>
                    <li>Környezeti komponens (100-${envScore.toFixed(1)}): <strong>${environmentalComponent.toFixed(1)}</strong> × 60% = ${(environmentalComponent * 0.6).toFixed(1)}</li>
                    <li>Táplálkozási komponens: <strong>${nutritionalComponent.toFixed(1)}</strong> × 40% = ${(nutritionalComponent * 0.4).toFixed(1)}</li>
                    ${categoryModifier !== 0 ? 
                        `<li>Kategória bónusz (${category}): <strong>${categoryModifier > 0 ? '+' : ''}${categoryModifier}</strong></li>` : ''}
                    <li><strong>Végső Eco-Score: ${sustainability.toFixed(1)}/100</strong></li>
                </ul>
                
                <div class="xai-basic-explanation">
                    ${envScore <= 40 ? 
                        'Ez a recept viszonylag alacsony környezeti hatással rendelkezik.' : 
                        'Ez a recept magasabb környezeti hatással jár.'}
                    ${nutriScore >= 60 ? 
                        ' Táplálkozási értéke jó.' : 
                        ' Táplálkozási értéke fejleszthető.'}
                </div>
                
                <div class="xai-loading-error">
                    <p>A részletes AI magyarázat jelenleg nem érhető el. Kérjük, próbálja újra később.</p>
                </div>
            </div>
        </div>
    `;
}
