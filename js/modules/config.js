/**
 * config.js
 * Alkalmazás konfigurációs beállítások
 * Verzió: 2025.06.20
 */

const CONFIG = {
    // Alkalmazás alap információk
    APP_NAME: 'Eco-Score Recept Kutató Rendszer',
    VERSION: '2025.06.20',
    
    // ✅ KRITIKUS: Adatforrás beállítása
    DATA_SOURCE: './data/recipes_hungarian_best1000.json',
    
    // A/B/C teszt csoportok
    TEST_GROUPS: {
        'A': 'Kontroll csoport - Nincs pontszám',
        'B': 'Pontszám csoport - Eco-Score látható', 
        'C': 'XAI csoport - Eco-Score + magyarázat'
    },
    
    // Keresési beállítások
    SEARCH: {
        MAX_RESULTS: 10,
        MIN_QUERY_LENGTH: 2,
        CACHE_RESULTS: true,
        DEBOUNCE_DELAY: 300
    },
    
    // Fenntarthatósági beállítások
    SUSTAINABILITY: {
        // Eco-Score tartományok
        ECO_SCORE_RANGES: [
            { min: 80, label: 'Kiváló', color: '#22c55e', icon: '🌟' },
            { min: 60, label: 'Jó', color: '#84cc16', icon: '🌿' },
            { min: 40, label: 'Közepes', color: '#eab308', icon: '⚠️' },
            { min: 20, label: 'Gyenge', color: '#f97316', icon: '🔸' },
            { min: 0, label: 'Rossz', color: '#dc2626', icon: '🔻' }
        ],
        
        // Környezeti pontszám tartományok
        ENV_SCORE_RANGES: [
            { max: 20, label: 'Kiváló', color: '#22c55e' },
            { max: 40, label: 'Jó', color: '#84cc16' },
            { max: 60, label: 'Közepes', color: '#eab308' },
            { max: 80, label: 'Gyenge', color: '#f97316' },
            { max: 100, label: 'Rossz', color: '#dc2626' }
        ],
        
        // Kategória módosítók
        CATEGORY_MODIFIERS: {
            'saláta': 10,
            'leves': 5,
            'főétel': 0,
            'desszert': -5,
            'ital': 0,
            'reggeli': 3,
            'köret': 2,
            'egyéb': 0
        },
        
        // Normalizálási konstansok
        MAX_ENV_SCORE: 100,
        MAX_NUTRI_SCORE: 100,
        
        // Fenntarthatósági súlyok
        WEIGHTS: {
            ENV_SCORE: 0.6,
            NUTRI_SCORE: 0.3,
            CATEGORY_MODIFIER: 0.1
        },
        
        // Értékelés küszöbök
        EVALUATION_THRESHOLDS: [
            { min: 90, label: 'Kivételes', icon: '🌟' },
            { min: 80, label: 'Kiváló', icon: '✨' },
            { min: 70, label: 'Nagyon jó', icon: '🌿' },
            { min: 60, label: 'Jó', icon: '👍' },
            { min: 50, label: 'Megfelelő', icon: '🆗' },
            { min: 40, label: 'Közepes', icon: '⚠️' },
            { min: 30, label: 'Gyenge', icon: '📉' },
            { min: 0, label: 'Rossz', icon: '⚠️' }
        ]
    },
    
    // XAI beállítások - VALÓDI API
    XAI: {
        USE_REAL_API: true,
        
        // ✅ Alapértelmezett értékek - dinamikusan frissülnek
        OPENAI_API_KEY: 'sk-...ExEA',
        PROVIDER: 'openai',
        DEBUG: false,
        
        // ✅ Fallback beállítások
        FALLBACK_ON_ERROR: true,
        CACHE_RESULTS: true,
        
        // ✅ Inicializálási függvény
        init() {
            if (typeof window !== 'undefined' && window.ENV) {
                this.OPENAI_API_KEY = window.ENV.VITE_OPENAI_API_KEY || null;
                this.PROVIDER = window.ENV.VITE_XAI_PROVIDER || 'openai';
                this.DEBUG = window.ENV.VITE_XAI_DEBUG === 'true';
                console.log('🔧 XAI konfiguráció inicializálva:', {
                    hasApiKey: !!this.OPENAI_API_KEY,
                    provider: this.PROVIDER,
                    debug: this.DEBUG
                });
            } else {
                console.warn('⚠️ window.ENV nem elérhető, alapértelmezett értékek használata');
            }
        }
    },
    
    // Kategória ikonok
    CATEGORY_ICONS: {
        'saláta': '🥗',
        'leves': '🍲',
        'főétel': '🍽️',
        'desszert': '🍰',
        'ital': '🥤',
        'reggeli': '🍳',
        'köret': '🥔',
        'egyéb': '🍴'
    },
    
    // Lokális tárolás kulcsai
    STORAGE_KEYS: {
        USER: 'eco-score-user',
        CHOICES: 'eco-score-choices',
        SETTINGS: 'eco-score-settings'
    },
    
    // Analitika beállítások
    ANALYTICS: {
        ENABLED: true,
        TRACK_SEARCH: true,
        TRACK_VIEWS: true,
        TRACK_CHOICES: true,
        TRACK_XAI_INTERACTIONS: true
    }
};

// ✅ DEBUG: CONFIG tartalom ellenőrzése
console.log('🔧 CONFIG betöltve:', {
    DATA_SOURCE: CONFIG.DATA_SOURCE,
    hasDataSource: !!CONFIG.DATA_SOURCE,
    configKeys: Object.keys(CONFIG)
});

export default CONFIG;
