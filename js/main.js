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
    getTestGroupDescription
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
        
        // Alkalmazás inicializálása
        this.initializeApp();
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
            alert('Az alkalmazás indítása sikertelen. Kérjük, töltse újra az oldalt.');
        }
    }
    
    /**
     * Event listenerek beállítása
     */
    setupEventListeners() {
        // Regisztrációs űrlap
        const registrationForm = document.getElementById('registration-form');
        if (registrationForm) {
            registrationForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleRegistration();
            });
        }
        
        // Keresés gomb
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        
        // Keresési mező Enter esemény
        const searchInput = document.getElementById('ingredient-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleSearch();
                }
            });
        }
        
        // Új keresés gomb
        const newSearchBtn = document.getElementById('new-search-btn');
        if (newSearchBtn) {
            newSearchBtn.addEventListener('click', () => this.showSection('search-section'));
        }
        
        // Statisztikák gomb
        const viewStatsBtn = document.getElementById('view-stats-btn');
        if (viewStatsBtn) {
            viewStatsBtn.addEventListener('click', () => {
                this.showUserStats();
                this.showSection('stats-section');
            });
        }
        
        // Vissza gomb a statisztikáknál
        const backToSearchBtn = document.getElementById('back-to-search-btn');
        if (backToSearchBtn) {
            backToSearchBtn.addEventListener('click', () => this.showSection('search-section'));
        }
        
        // Globális klikk esemény a modális ablakokhoz
        document.addEventListener('click', (event) => {
            // Modális ablak bezárása a háttérre kattintva
            if (event.target.matches('.modal-backdrop')) {
                this.closeModal();
            }
            
            // Modális ablak bezárása a bezárás gombra kattintva
            if (event.target.matches('.modal-close') || event.target.matches('.modal-close-btn')) {
                this.closeModal();
            }
        });
        
        console.log('✅ Event listenerek beállítva');
    }
    
    /**
     * Meglévő felhasználó ellenőrzése
     */
    checkExistingUser() {
        this.currentUser = checkExistingUser();
        
        if (this.currentUser) {
            this.testGroup = this.currentUser.testGroup;
            this.showSection('search-section');
            this.updateUserDisplay();
        } else {
            this.showSection('registration-section');
        }
    }
    
    /**
     * Regisztráció kezelése
     */
    handleRegistration() {
        try {
            const emailInput = document.getElementById('email');
            if (!emailInput) {
                throw new Error('Email mező nem található');
            }
            
            const email = emailInput.value.trim();
            if (!email || !email.includes('@')) {
                alert('Kérjük, adjon meg egy érvényes email címet!');
                return;
            }
            
            // Felhasználó regisztrálása
            this.currentUser = registerUser(email);
            this.testGroup = this.currentUser.testGroup;
            
            // UI átváltás
            this.showSection('search-section');
            this.updateUserDisplay();
            
        } catch (error) {
            console.error('❌ Regisztrációs hiba:', error);
            alert('Regisztrációs hiba történt. Kérjük, próbálja újra!');
        }
    }
    
    /**
     * Felhasználói adatok megjelenítése
     */
    updateUserDisplay() {
        try {
            const userInfoContainer = document.querySelector('.user-info');
            if (userInfoContainer) {
                userInfoContainer.innerHTML = generateUserInfo(this.currentUser);
            }
        } catch (error) {
            console.error('❌ Felhasználói adatok megjelenítési hiba:', error);
        }
    }
    
    /**
     * Keresés kezelése
     */
    handleSearch() {
        try {
            const searchInput = document.getElementById('ingredient-search');
            if (!searchInput) {
                throw new Error('Keresési mező nem található');
            }
            
            const ingredients = searchInput.value.trim();
            if (!ingredients) {
                alert('Kérjük, adjon meg legalább egy hozzávalót!');
                return;
            }
            
            // Keresési idő mérés kezdése
            this.searchStartTime = Date.now();
            
            // Receptek keresése
            const searchResults = searchRecipes(this.recipes, ingredients, this.testGroup);
            
            // Eredmények megjelenítése
            this.displayResults(searchResults, ingredients);
            
        } catch (error) {
            console.error('❌ Keresési hiba:', error);
            alert('Keresési hiba történt. Kérjük, próbálja újra!');
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
        if (this.testGroup === 'C') {
            // Késleltetett betöltés, hogy a kártyák már megjelenjenek
            setTimeout(() => {
                recipes.forEach(async (recipe) => {
                    await generateAndDisplayXAI(recipe);
                });
            }, 100);
        }
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
            
            // Köszönőoldal megjelenítése
            this.showSection('thank-you-section');
            
            console.log('✅ Recept kiválasztva:', recipeName);
            
        } catch (error) {
            console.error('❌ Recept kiválasztási hiba:', error);
            alert('Hiba történt a recept kiválasztása során.');
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
            
        } catch (error) {
            console.error('❌ Recept részletek megjelenítési hiba:', error);
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
            
            Object.entries(stats.categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    const icon = CONFIG.CATEGORY_ICONS[category] || CONFIG.CATEGORY_ICONS['egyéb'];
                    const percent = Math.round(count / stats.totalChoices * 100);
                    
                    html += `
                        <div class="category-stat-item">
                            <div class="category-icon">${icon}</div>
                            <div class="category-name">${category}</div>
                            <div class="category-count">${count}x</div>
                            <div class="category-percent">${percent}%</div>
                        </div>
                    `;
                });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        // Teszt csoport információ
        html += `
            <div class="stats-group-info">
                <p>Ön a következő tesztcsoportban van: <strong>${this.testGroup} (${getTestGroupDescription(this.testGroup)})</strong></p>
                <p>Ez a csoport ${this.testGroup === 'A' ? 'nem lát' : this.testGroup === 'B' ? 'lát' : 'lát részletes'} fenntarthatósági információkat.</p>
            </div>
        `;
        
        // Frissítés
        statsContainer.innerHTML = html;
    }
    
    /**
     * Szekció megjelenítése
     * 
     * @param {string} sectionId - Szekció azonosító
     */
    showSection(sectionId) {
        try {
            // Minden szakasz elrejtése
            document.querySelectorAll('.section').forEach(section => {
                section.classList.add('hidden');
            });
            
            // Cél szakasz megjelenítése
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                console.log('📄 Szakasz váltás:', sectionId);
            } else {
                console.error('❌ Szakasz nem található:', sectionId);
            }
        } catch (error) {
            console.error('❌ Szakasz megjelenítési hiba:', error);
        }
    }
}

// Alkalmazás globális példánya
let app;

// Alkalmazás indítása a DOM betöltése után
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log(`🌟 ${CONFIG.APP_NAME} indítása...`);
        
        // Kis késleltetés, hogy biztosan betöltődjön a window.ENV
        setTimeout(() => {
            app = new EcoScoreRecipeApp();
            
            // Globális elérhetőség a window objektumon keresztül
            window.app = app;
        }, 100);
        
    } catch (error) {
        console.error('❌ Alkalmazás indítási hiba:', error);
        alert('Az alkalmazás indítása sikertelen. Kérjük, töltse újra az oldalt.');
    }
});
