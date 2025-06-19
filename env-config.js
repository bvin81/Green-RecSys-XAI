/**
 * env-config.js
 * Környezeti változók konfigurációja
 * Ez a fájl GitHub Actions által generált környezeti változókat tartalmazza
 */

// Biztosítjuk, hogy a window.ENV objektum létezik
if (typeof window !== 'undefined') {
    window.ENV = window.ENV || {};
    
    // Ha GitHub Actions környezetben futunk, a változók itt lesznek beállítva
    // A buildfolyamat során ezek a változók helyettesítődnek a valós értékekkel
    
    // Alapértelmezett értékek beállítása, ha még nincsenek definiálva
    window.ENV.VITE_OPENAI_API_KEY = window.ENV.VITE_OPENAI_API_KEY || null;
    window.ENV.VITE_XAI_PROVIDER = window.ENV.VITE_XAI_PROVIDER || 'openai';
    window.ENV.VITE_XAI_DEBUG = window.ENV.VITE_XAI_DEBUG || 'false';
    
    console.log('📁 env-config.js betöltve');
    console.log('🔧 ENV objektum inicializálva:', Object.keys(window.ENV));
    console.log('🔑 API Key van beállítva:', !!(window.ENV.VITE_OPENAI_API_KEY));
} else {
    console.warn('⚠️ window objektum nem elérhető');
}
