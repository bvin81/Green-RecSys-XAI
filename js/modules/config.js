/**
 * config.js
 * Konfigurációs beállítások az Eco-Score Recept Kutató Rendszerhez
 * Verzió: 2025.06.20
 */

const CONFIG = {
    // Alkalmazás beállítások
    VERSION: '2025.06.20',
    APP_NAME: 'Eco-Score Recept Kutató Rendszer',
    
    // Adatforrás
    DATA_SOURCE: './data/recipes_hungarian_best1000.json',
    
    // Keresési beállítások
    SEARCH: {
        MAX_RESULTS: 6,              // Maximális megjelenített találatok száma
        MIN_INGREDIENT_LENGTH: 2,    // Minimális keresési kifejezés hossza
        INCLUDE_TOP_SUSTAINABLE: true // Hozzáadjon-e legjobb fenntarthatóságú recepteket, ha kevés a találat
    },
    
    // Tesztcsoportok
    TEST_GROUPS: {
        A: 'Kontroll csoport',
        B: 'Fenntarthatósági pontszámokkal',
        C: 'Fenntarthatósági pontszámok és XAI magyarázatok'
    },
    
    // Fenntarthatósági számítások
    SUSTAINABILITY: {
        // Eco-Score súlyozás
        ENVIRONMENT_WEIGHT: 0.6,     // Környezeti komponens súlya (60%)
        NUTRITION_WEIGHT: 0.4,       // Táplálkozási komponens súlya (40%)
        
        // Kategória módosítók a fenntarthatósági pontszámhoz
        CATEGORY_MODIFIERS: {
            'saláta': +5,      // Zöldségek fenntarthatóak
            'leves': +3,       // Kevés feldolgozás
            'ital': +2,        // Általában gyümölcsök
            'reggeli': +1,     // Változó
            'köret': 0,        // Semleges
            'egyéb': 0,        // Semleges
            'főétel': -2,      // Gyakran hús
            'desszert': -3     // Cukor, feldolgozás
        },
        
        // Környezeti pontszám értékelési kategóriák
        ENV_SCORE_RANGES: [
            { max: 20, label: 'Kiváló környezetbarát', color: '#4CAF50' },
            { max: 40, label: 'Környezetbarát', color: '#8BC34A' },
            { max: 60, label: 'Közepes környezeti hatás', color: '#FF9800' },
            { max: 100, label: 'Nagy környezeti terhelés', color: '#F44336' }
        ],
        
        // Fenntarthatósági pontszám értékelési kategóriák
        ECO_SCORE_RANGES: [
            { min: 75, label: 'Kiváló fenntartható választás', icon: '🌟' },
            { min: 60, label: 'Jó fenntartható választás', icon: '✅' },
            { min: 40, label: 'Közepes fenntarthatóságú választás', icon: '⚖️' },
            { min: 0, label: 'Kevésbé fenntartható választás', icon: '⚠️' }
        ]
    },
    
    // XAI beállítások
    XAI: {
        USE_REAL_API: false,  // Valódi API használata (false = szimulált)
        API_ENDPOINT: 'https://api.example.com/xai/explain',
        API_KEY: 'demo-key',
        MODEL_VERSION: 'eco-score-xai-v1',
        CACHE_RESULTS: true,
        SHOW_CONFIDENCE: true,
        SUGGEST_ALTERNATIVES: true
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

export default CONFIG;
