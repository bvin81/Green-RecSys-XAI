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
const xaiExplanationCache = new Map();

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
    const safeName = (recipe.name || '').replace(/'/g, '&#39;');
    const safeIngredients = (searchIngredients || '').replace(/'/g, '&#39;');
    
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
            
            ${showXAI ? `
                <div class="eco-xai-container" id="xai-container-${recipe.recipeid}">
                    <div class="eco-xai-loading">
                        <div class="loading-spinner"></div>
                        <span>AI magyarázat betöltése...</span>
                    </div>
                </div>
            ` : ''}
            
            <div class="recipe-actions">
                <button class="btn-primary select-recipe-btn" 
                        data-recipe-id="${recipe.recipeid}"
                        data-recipe-name="${safeName}"
                        data-rank="${index + 1}"
                        data-search-ingredients="${safeIngredients}">
                    🍽️ Ezt választom
                </button>
                <button class="btn-secondary recipe-details-btn" 
                        data-recipe-id="${recipe.recipeid}">
                    📖 Részletek
                </button>
            </div>
        </div>
    `;
}

/**
 * Eco-Score szakasz generálása
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {string} Eco-Score szakasz HTML
 */
function generateEcoScoreSection(recipe) {
    const sustainability = recipe.sustainability_index || 0;
    const envScore = recipe.env_score || 0;
    const nutriScore = recipe.nutri_score || 0;
    
    const envColor = getEnvironmentalColor(envScore);
    const ecoEvaluation = evaluateSustainabilityScore(sustainability);
    
    return `
        <div class="eco-score-section">
            <div class="eco-scores">
                <div class="eco-score-item">
                    <div class="eco-score-value" style="color: ${ecoEvaluation.color};">
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
        
        if (xaiExplanationCache.has(recipe.recipeid) && CONFIG.XAI.CACHE_RESULTS) {
            xaiExplanation = xaiExplanationCache.get(recipe.recipeid);
        } else {
            xaiExplanation = await getExplanation(recipe);
            if (CONFIG.XAI.CACHE_RESULTS) {
                xaiExplanationCache.set(recipe.recipeid, xaiExplanation);
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
    const categoryModifier = CONFIG.SUSTAINABILITY?.CATEGORY_MODIFIERS?.[category] || 0;
    
    // Környezeti tényezők HTML
    const envFactorsHtml = xaiExplanation.environmentalFactors?.map(factor => `
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
    `).join('') || '';
    
    // Táplálkozási tényezők HTML
    const nutriFactorsHtml = xaiExplanation.nutritionalFactors?.map(factor => `
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
    `).join('') || '';
    
    // Javaslatok HTML
    const suggestionsHtml = xaiExplanation.suggestions && xaiExplanation.suggestions.length > 0 
        ? `
            <div class="xai-suggestions">
                <h4>Javaslatok a fenntarthatóság javítására:</h4>
                <ul>
                    ${xaiExplanation.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
                ${CONFIG.XAI?.SUGGEST_ALTERNATIVES ? 
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
                    ${xaiExplanation.summary || 'Részletes elemzés a tényezők alapján.'}
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
                
                ${CONFIG.XAI?.SHOW_CONFIDENCE ? 
                    `<div class="xai-confidence">
                        Megbízhatóság: ${Math.round((xaiExplanation.confidence || 0.85) * 100)}%
                    </div>` : ''
                }
            </div>
        </div>
    `;
}

/**
 * XAI fallback HTML generálása hiba esetén
 * 
 * @param {Object} recipe - Recept objektum
 * @returns {string} Fallback XAI HTML
 */
function generateXaiFallbackHTML(recipe) {
    const sustainability = recipe.sustainability_index || 0;
    const envScore = recipe.env_score || 0;
    const nutriScore = recipe.nutri_score || 0;
    
    return `
        <div class="eco-xai-section fallback">
            <div class="eco-xai-header">
                🧠 AI Magyarázat
            </div>
            <div class="eco-xai-content">
                <p><strong>Egyszerűsített magyarázat:</strong></p>
                <p>Ez a recept ${sustainability.toFixed(1)}/100 Eco-Score pontot kapott.</p>
                <ul>
                    <li>Környezeti hatás: ${envScore.toFixed(1)} pont</li>
                    <li>Táplálkozási érték: ${nutriScore.toFixed(1)} pont</li>
                </ul>
                <p class="xai-note">Részletes AI magyarázat jelenleg nem elérhető.</p>
            </div>
        </div>
    `;
}

/**
 * XAI interaktív elemek inicializálása
 * 
 * @param {Element} container - XAI konténer elem
 * @param {Object} recipe - Recept objektum
 */
function initXaiInteractiveElements(container, recipe) {
    // Alternatívák gomb
    const altBtn = container.querySelector('.btn-alternative-suggestions');
    if (altBtn) {
        altBtn.addEventListener('click', () => {
            showAlternatives(recipe);
        });
    }
    
    // Expandable sections
    const headers = container.querySelectorAll('.xai-factor-header');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const factor = header.closest('.xai-factor');
            factor.classList.toggle('expanded');
        });
    });
}

/**
 * Alternatívák megjelenítése
 * 
 * @param {Object} recipe - Eredeti recept objektum
 */
export function showAlternatives(recipe) {
    try {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            console.error('❌ Modal konténer nem található');
            return;
        }
        
        // Hasonló receptek és helyettesítési javaslatok lekérése
        const allRecipes = window.app?.recipes || [];
        
        // Hasonló, de fenntarthatóbb receptek keresése
        const similarRecipes = findSimilarButMoreSustainableRecipes(recipe, allRecipes);
        
        // Összetevő helyettesítési javaslatok
        const substitutions = suggestIngredientSubstitutions(recipe);
        
        // Modális tartalom frissítése
        modalContainer.innerHTML = generateAlternativesModal(recipe, similarRecipes, substitutions);
        modalContainer.classList.add('active');
        
    } catch (error) {
        console.error('❌ Alternatívák megjelenítési hiba:', error);
    }
}

/**
 * Alternatívák modális ablak generálása
 * 
 * @param {Object} recipe - Eredeti recept
 * @param {Array} similarRecipes - Hasonló receptek
 * @param {Array} substitutions - Helyettesítési javaslatok
 * @returns {string} Alternatívák HTML
 */
function generateAlternativesModal(recipe, similarRecipes, substitutions) {
    let html = `
        <div class="modal-backdrop"></div>
        <div class="modal-content alternatives-modal">
            <div class="modal-header">
                <h2>🌱 Fenntarthatóbb alternatívák</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alternatives-container">
                    <p><strong>Eredeti recept:</strong> ${formatRecipeName(recipe.name)} (Eco-Score: ${formatScore(recipe.sustainability_index)})</p>
                    <p>Az alábbi lehetőségekkel teheti fenntarthatóbbá az étkezését:</p>
    `;
    
    // Hasonló receptek javaslatok
    if (similarRecipes && similarRecipes.length > 0) {
        html += `
            <div class="alternatives-section">
                <h3>🔄 Hasonló, de fenntarthatóbb receptek</h3>
                <div class="similar-recipes-container">
        `;
        
        similarRecipes.forEach(item => {
            const improvementClass = item.sustainabilityImprovement >= 15 ? 'high-improvement' : 
                                     item.sustainabilityImprovement >= 8 ? 'medium-improvement' : 'low-improvement';
            
            html += `
                <div class="similar-recipe-card ${improvementClass}">
                    <div class="recipe-info">
                        <h4>${formatRecipeName(item.recipe.name)}</h4>
                        <p><strong>Hozzávalók:</strong> ${formatIngredients(item.recipe.ingredients)}</p>
                        <div class="improvement-indicator">
                            +${item.sustainabilityImprovement.toFixed(1)} pont javulás
                        </div>
                    </div>
                    <div class="recipe-actions">
                        <button class="btn-primary select-alternative-btn" 
                                data-recipe-id="${item.recipe.recipeid}"
                                data-recipe-name="${item.recipe.name.replace(/'/g, '&#39;')}"
                                data-search-ingredients="">
                            Ezt választom
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Összetevő helyettesítések
    if (substitutions && substitutions.length > 0) {
        html += `
            <div class="alternatives-section">
                <h3>🔄 Hozzávaló helyettesítések</h3>
                <div class="substitutions-container">
                    <table class="substitutions-table">
                        <thead>
                            <tr>
                                <th>Eredeti</th>
                                <th>Helyettesítő</th>
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
            </div>
        `;
    }
    
    // Ha nincs javaslat
    if ((!similarRecipes || similarRecipes.length === 0) && (!substitutions || substitutions.length === 0)) {
        html += `
            <div class="alternatives-empty">
                <p>Jelenleg nincs elérhető alternatíva javaslat ehhez a recepthez.</p>
                <p>Ez lehet, mert a recept már nagyon fenntartható, vagy az AI még tanul a jobb javaslatok készítéséről.</p>
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
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
                <div class="no-results-icon">🔍</div>
                <h3>Nincs találat</h3>
                <p>Sajnos nem találtunk receptet a megadott hozzávalókkal: <strong>"${searchIngredients}"</strong></p>
                <div class="no-results-suggestions">
                    <p>Próbáljon meg:</p>
                    <ul>
                        <li>Más hozzávalókat keresni</li>
                        <li>Általánosabb keresést használni</li>
                        <li>Kevesebb hozzávalót megadni</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    let html = `
        <div class="search-results-header">
            <h3>🍽️ Találatok (${recipes.length})</h3>
            <p>Keresés: <strong>"${searchIngredients}"</strong></p>
        </div>
        <div class="search-results-grid">
    `;
    
    html += recipes.map((recipe, index) => 
        generateRecipeCard(recipe, index, searchIngredients, testGroup)
    ).join('');
    
    html += `</div>`;
    
    return html;
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
        <div class="user-info-card">
            <span class="user-email">👤 ${user.email}</span>
            <span class="user-session">Munkamenet: ${user.sessionCount || 1}</span>
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
    const safeName = (recipe.name || '').replace(/'/g, '&#39;');
    
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
                    <div id="modal-xai-container-${recipe.recipeid}">
                        <div class="eco-xai-loading">
                            <div class="loading-spinner"></div>
                            <span>AI magyarázat betöltése...</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div class="recipe-details-actions">
                    <button class="btn-primary select-from-modal-btn" 
                            data-recipe-id="${recipe.recipeid}"
                            data-recipe-name="${safeName}"
                            data-search-ingredients="">
                        🍽️ Ezt választom
                    </button>
                    ${showXAI ? `
                        <button class="btn-secondary btn-alternative-suggestions" 
                                data-recipe-id="${recipe.recipeid}">
                            🌱 Alternatívák
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Választás megerősítése komponens
 * 
 * @param {Object} recipe - Kiválasztott recept
 * @param {Object} choiceData - Választási adatok
 * @returns {string} Megerősítő üzenet HTML
 */
export function generateSelectionConfirmation(recipe, choiceData) {
    return `
        <div class="selection-confirmation">
            <div class="confirmation-icon">✅</div>
            <h3>Köszönjük a választását!</h3>
            <div class="selected-recipe">
                <h4>${formatRecipeName(recipe.name)}</h4>
                <p>Döntési idő: ${choiceData.decisionTime}s</p>
                <p>Eco-Score: ${formatScore(recipe.sustainability_index)}/100</p>
            </div>
        </div>
    `;
}
