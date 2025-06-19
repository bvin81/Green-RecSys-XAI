/**
 * main.js
 * Fő alkalmazás modul az Eco-Score Recept Kutató Rendszerhez
 * Verzió: 2025.06.20
 */

import CONFIG from './modules/config.js';
import { loadRecipeData, prepareRecipes } from './modules/data-loader.js';
import { searchRecipes } from './modules/recipe-search.js';
import { 
    checkExistingUser, 
    registerUser, 
    recordUserChoice,
    getTestGroupDescription,
    loginUser,
    exportUserData
} from './modules/user-manager.js';
import { 
    generateSearchResults, 
    generateUserInfo, 
    generateRecipeDetailsModal,
    generateSelectionConfirmation,
    generateAndDisplayXAI
} from './modules/ui-components.js';
import { getUserChoiceStats } from './modules/analytics.js';

/**
 * Eco-Score Recept Kutató Rendszer alkalmazás
 */
class EcoScoreRecipeApp {
    /**
     * Konstruktor
     */
    constructor() {
        this.recipes = [];
        this.currentUser = null;
        this.testGroup = null;
        this.searchStartTime = null;
        this.currentRecipeDetails = null;
        this.abortController = new AbortController();
        
        // Alkalmazás inicializálása async módon
        this.initializeApp().catch(error => {
            console.error('❌ Alkalmazás inicializálási hiba:', error);
            this.showError('Az alkalmazás indítása sikertelen. Kérjük, töltse újra az oldalt.');
        });
    }
    
    /**
     * Alkalmazás inicializálása
     */
    async initializeApp() {
        console.log(`🚀 ${CONFIG.APP_NAME} - ${CONFIG.VERSION} verzió indítása...`);
        
        try {
            // ✅ CONFIG inicializálása a környezeti változókkal
            if (CONFIG.XAI && typeof CONFIG.XAI.init === 'function') {
                CONFIG.XAI.init();
            }
            
            // ✅ DEBUG: CONFIG állapot ellenőrzése
            console.log('🔧 CONFIG állapot:', {
                DATA_SOURCE: CONFIG.DATA_SOURCE,
                hasDataSource: !!CONFIG.DATA_SOURCE,
                configKeys: Object.keys(CONFIG)
            });
            
            // Adatok betöltése
            const rawData = await loadRecipeData();
            this.recipes = prepareRecipes(rawData);
            
            // Event listenerek beállítása
            this.setupEventListeners();
            
            // Felhasználó ellenőrzése
            this.checkExistingUser();
            
            console.log('✅ Alkalmazás inicializálása kész!');
            console.log(`📊 Betöltött receptek: ${this.recipes.length}`);
        } catch (error) {
            console.error('❌ Alkalmazás inicializálási hiba:', error);
            this.showError('Az alkalmazás indítása sikertelen. Kérjük, töltse újra az oldalt.');
        }
    }
    
    /**
     * Event listenerek beállítása
     */
    setupEventListeners() {
        const signal = this.abortController.signal;
        
        // Regisztrációs form
        const registrationForm = document.getElementById('registration-form');
        if (registrationForm) {
            registrationForm.addEventListener('submit', this.handleRegistration.bind(this), { signal });
        }
        
        // Keresés gomb
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', this.handleSearch.bind(this), { signal });
        }
        
        // Keresési input - Enter billentyű
        const searchInput = document.getElementById('ingredient-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            }, { signal });
        }
        
        // Globális click handler
        document.addEventListener('click', this.handleClick.bind(this), { signal });
        
        // Új keresés gomb
        const newSearchBtn = document.getElementById('new-search-btn');
        if (newSearchBtn) {
            newSearchBtn.addEventListener('click', this.startNewSearch.bind(this), { signal });
        }
        
        // Statisztikák gomb
        const viewStatsBtn = document.getElementById('view-stats-btn');
        if (viewStatsBtn) {
            viewStatsBtn.addEventListener('click', this.showStats.bind(this), { signal });
        }
        
        // Vissza a kereséshez gomb
        const backToSearchBtn = document.getElementById('back-to-search-btn');
        if (backToSearchBtn) {
            backToSearchBtn.addEventListener('click', this.backToSearch.bind(this), { signal });
        }
        
        // Adatok exportálása gomb
        const exportDataBtn = document.getElementById('export-data-btn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', this.exportData.bind(this), { signal });
        }
        
        console.log('✅ Event listenerek beállítva');
    }
    
    /**
     * Globális click handler
     * 
     * @param {Event} event - Click esemény
     */
    handleClick(event) {
        const target = event.target;
        
        // Recept kiválasztás
        if (target.classList.contains('select-recipe-btn')) {
            event.preventDefault();
            const recipeId = target.dataset.recipeId;
            const recipeName = target.dataset.recipeName;
            const rank = parseInt(target.dataset.rank);
            const searchIngredients = target.dataset.searchIngredients;
            this.selectRecipe(recipeId, recipeName, rank, searchIngredients, 'search');
        }
        
        // Recept részletek
        if (target.classList.contains('recipe-details-btn')) {
            event.preventDefault();
            const recipeId = target.dataset.recipeId;
            this.showRecipeDetails(recipeId);
        }
        
        // Modal bezárás
        if (target.classList.contains('modal-close') || target.classList.contains('modal-backdrop')) {
            event.preventDefault();
            this.closeModal();
        }
        
        // Recept kiválasztás modal-ból
        if (target.classList.contains('select-from-modal-btn')) {
            event.preventDefault();
            const recipeId = target.dataset.recipeId;
            const recipeName = target.dataset.recipeName;
            const searchIngredients = target.dataset.searchIngredients;
            this.selectRecipe(recipeId, recipeName, 0, searchIngredients, 'details');
        }
        
        // Alternatív javaslatok
        if (target.classList.contains('btn-alternative-suggestions')) {
            event.preventDefault();
            const recipeId = target.dataset.recipeId;
            this.showAlternatives(recipeId);
        }
    }
    
    /**
     * Regisztráció kezelése
     * 
     * @param {Event} event - Submit esemény
     */
    handleRegistration(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const email = formData.get('email');
        
        try {
            this.currentUser = registerUser(email);
            this.testGroup = this.currentUser.testGroup;
            
            // Felhasználói interfész frissítése
            this.updateUserInterface();
            
            // Keresési szakaszra váltás
            this.showSection('search-section');
            
        } catch (error) {
            console.error('❌ Regisztrációs hiba:', error);
            this.showError('Regisztráció sikertelen: ' + error.message);
        }
    }
    
    /**
     * Meglévő felhasználó ellenőrzése
     */
    checkExistingUser() {
        const existingUser = checkExistingUser();
        
        if (existingUser) {
            this.currentUser = loginUser(existingUser);
            this.testGroup = this.currentUser.testGroup;
            
            // Felhasználói interfész frissítése
            this.updateUserInterface();
            
            // Keresési szakaszra váltás
            this.showSection('search-section');
        } else {
            // Regisztrációs szakasz megjelenítése
            this.showSection('registration-section');
        }
    }
    
    /**
     * Felhasználói interfész frissítése
     */
    updateUserInterface() {
        // Felhasználói információk megjelenítése
        const userInfoContainer = document.querySelector('.user-info');
        if (userInfoContainer && this.currentUser) {
            userInfoContainer.innerHTML = generateUserInfo(this.currentUser);
        }
        
        console.log(`👤 Felhasználó: ${this.currentUser.email} (${this.currentUser.testGroup} csoport)`);
    }
    
    /**
     * Szakasz megjelenítése
     * 
     * @param {string} sectionId - Megjelenítendő szakasz ID
     */
    showSection(sectionId) {
        // Összes szakasz elrejtése
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => section.classList.add('hidden'));
        
        // Kiválasztott szakasz megjelenítése
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        console.log(`🔄 Szakasz váltás: ${sectionId}`);
    }
    
    /**
     * Keresés kezelése
     */
    handleSearch() {
        const searchInput = document.getElementById('ingredient-search');
        const ingredients = searchInput?.value?.trim();
        
        if (!ingredients) {
            this.showError('Kérjük, adjon meg legalább egy hozzávalót!');
            return;
        }
        
        try {
            console.log('🔍 Keresés indítása:', ingredients);
            
            // Keresési idő mérés kezdése
            this.searchStartTime = Date.now();
            
            // Receptek keresése
            const searchResults = searchRecipes(this.recipes, ingredients, this.testGroup);
            
            // Eredmények megjelenítése
            this.displayResults(searchResults, ingredients);
            
        } catch (error) {
            console.error('❌ Keresési hiba:', error);
            this.showError('Keresési hiba történt. Kérjük, próbálja újra!');
        }
    }
    
    /**
     * Keresési eredmények megjelenítése
     * 
     * @param {Array} recipes - Találati receptek
     * @param {string} searchIngredients - Keresési kifejezés
     */
    displayResults(recipes, searchIngredients) {
        const resultsDiv = document.getElementById('search-results');
        
        if (!resultsDiv) {
            console.error('❌ Eredmények div nem található');
            return;
        }
        
        resultsDiv.innerHTML = generateSearchResults(recipes, searchIngredients, this.testGroup);
        
        // Ha C csoport, akkor töltsük be az XAI magyarázatokat
        if (this.testGroup === 'C' && recipes.length > 0) {
            // Késleltetett betöltés, hogy a kártyák már megjelenjenek
            setTimeout(() => {
                recipes.forEach(async (recipe) => {
                    await generateAndDisplayXAI(recipe);
                });
            }, 100);
        }
        
        console.log(`📋 ${recipes.length} recept megjelenítve`);
    }
    
    /**
     * Recept kiválasztása
     * 
     * @param {number} recipeId - Recept azonosító
     * @param {string} recipeName - Recept név
     * @param {number} rank - Találati lista pozíció
     * @param {string} searchIngredients - Keresési kifejezés
     * @param {string} source - Forrás (search/details/alternative/ai-recommendation)
     */
    selectRecipe(recipeId, recipeName, rank, searchIngredients, source = 'search') {
        try {
            // Döntési idő számítása
            const decisionTime = this.searchStartTime ? 
                Math.round((Date.now() - this.searchStartTime) / 1000) : 0;
            
            // Recept objektum keresése
            const recipe = this.recipes.find(r => r.recipeid == recipeId);
            if (!recipe) {
                throw new Error('A recept nem található');
            }
            
            // Választás rögzítése
            const choiceData = recordUserChoice(
                this.currentUser, 
                recipe, 
                rank, 
                searchIngredients, 
                decisionTime,
                source
            );
            
            // Modal bezárása ha nyitva van
            this.closeModal();
            
            // Köszönőoldal megjelenítése
            this.showSection('thank-you-section');
            
            console.log('✅ Recept kiválasztva:', recipeName);
            
        } catch (error) {
            console.error('❌ Recept kiválasztási hiba:', error);
            this.showError('Hiba történt a recept kiválasztása során.');
        }
    }
    
    /**
     * Recept részletek megjelenítése modális ablakban
     * 
     * @param {number} recipeId - Recept azonosító
     */
    showRecipeDetails(recipeId) {
        try {
            const recipe = this.recipes.find(r => r.recipeid == recipeId);
            if (!recipe) {
                throw new Error('A recept nem található');
            }
            
            this.currentRecipeDetails = recipe;
            
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) {
                throw new Error('Modális konténer nem található');
            }
            
            modalContainer.innerHTML = generateRecipeDetailsModal(recipe, this.testGroup);
            modalContainer.classList.add('active');
            
            console.log('📖 Recept részletek megjelenítve:', recipe.name);
            
        } catch (error) {
            console.error('❌ Recept részletek megjelenítési hiba:', error);
            this.showError('Hiba történt a recept részletek betöltése során.');
        }
    }
    
    /**
     * Modális ablak bezárása
     */
    closeModal() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.classList.remove('active');
            modalContainer.innerHTML = '';
        }
        this.currentRecipeDetails = null;
        console.log('❌ Modal bezárva');
    }
    
    /**
     * Új keresés indítása
     */
    startNewSearch() {
        // Keresési mező tisztítása
        const searchInput = document.getElementById('ingredient-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        // Eredmények törlése
        const resultsDiv = document.getElementById('search-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '';
        }
        
        // Keresési szakasz megjelenítése
        this.showSection('search-section');
        
        // Időmérés visszaállítása
        this.searchStartTime = null;
        
        console.log('🔄 Új keresés indítva');
    }
    
    /**
     * Statisztikák megjelenítése
     */
    showStats() {
        this.showSection('stats-section');
        this.showUserStats();
    }
    
    /**
     * Vissza a kereséshez
     */
    backToSearch() {
        this.showSection('search-section');
    }
    
    /**
     * Felhasználói statisztikák megjelenítése
     */
    showUserStats() {
        const statsContainer = document.getElementById('user-stats');
        if (!statsContainer) return;
        
        const stats = getUserChoiceStats(this.currentUser?.id);
        
        // Statisztikák HTML
        let html = `
            <div class="stats-container">
                <div class="stats-summary">
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalChoices}</div>
                        <div class="stat-label">Összes választás</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.avgSustainabilityIndex.toFixed(1)}</div>
                        <div class="stat-label">Átlagos Eco-Score</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.avgDecisionTime.toFixed(1)}s</div>
                        <div class="stat-label">Átlagos döntési idő</div>
                    </div>
                </div>
        `;
        
        // Kategória statisztikák
        if (Object.keys(stats.categoryCounts).length > 0) {
            html += `
                <div class="stats-section">
                    <h3>Kategória választások</h3>
                    <div class="category-stats">
            `;
            
            for (const [category, count] of Object.entries(stats.categoryCounts)) {
                const percentage = ((count / stats.totalChoices) * 100).toFixed(1);
                html += `
                    <div class="category-stat-item">
                        <span class="category-name">${CONFIG.CATEGORY_ICONS[category] || '🍴'} ${category}</span>
                        <span class="category-count">${count} (${percentage}%)</span>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
        statsContainer.innerHTML = html;
        
        console.log('📊 Statisztikák megjelenítve');
    }
    
    /**
     * Adatok exportálása
     */
    exportData() {
        if (!this.currentUser) {
            this.showError('Nincs bejelentkezett felhasználó!');
            return;
        }
        
        try {
            const exportData = exportUserData(this.currentUser.id);
            if (!exportData) {
                throw new Error('Adatok exportálása sikertelen');
            }
            
            // JSON fájl letöltése
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `eco-score-data-${this.currentUser.id}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('✅ Adatok exportálva');
            this.showSuccess('Adatok sikeresen exportálva!');
            
        } catch (error) {
            console.error('❌ Export hiba:', error);
            this.showError('Hiba történt az adatok exportálása során.');
        }
    }
    
    /**
     * Alternatívák megjelenítése
     * 
     * @param {number} recipeId - Recept azonosító
     */
    showAlternatives(recipeId) {
        // Ez a funkció a ui-components.js-ben van implementálva
        const recipe = this.recipes.find(r => r.recipeid == recipeId);
        if (recipe) {
            console.log('🔄 Alternatívák megjelenítése:', recipe.name);
            // A showAlternatives funkció meghívása a ui-components modulból
        }
    }
    
    /**
     * Hiba üzenet megjelenítése
     * 
     * @param {string} message - Hiba üzenet
     */
    showError(message) {
        alert('❌ ' + message);
        console.error('❌ UI Hiba:', message);
    }
    
    /**
     * Siker üzenet megjelenítése
     * 
     * @param {string} message - Siker üzenet
     */
    showSuccess(message) {
        // Egyszerű alert, de későbbi fejlesztésben toast notification
        alert('✅ ' + message);
        console.log('✅ UI Siker:', message);
    }
    
    /**
     * Alkalmazás takarítása (memory leak prevention)
     */
    destroy() {
        this.abortController.abort();
        this.recipes = null;
        this.currentUser = null;
        this.currentRecipeDetails = null;
        console.log('🧹 Alkalmazás megtakarítva');
    }
}

// Alkalmazás indítása amikor a DOM betöltődött
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM betöltve, alkalmazás indítása...');
    window.app = new EcoScoreRecipeApp();
});

// Takarítás az oldal elhagyásakor
window.addEventListener('beforeunload', () => {
    if (window.app && typeof window.app.destroy === 'function') {
        window.app.destroy();
    }
});

// Export az alkalmazás osztálynak fejlesztéshez
export default EcoScoreRecipeApp;
