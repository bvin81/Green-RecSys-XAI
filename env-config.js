window.ENV = window.ENV || {};
// Fejlesztési célra - NE commitolja a valós API kulcsot!
window.ENV.VITE_OPENAI_API_KEY = null; // vagy a saját API kulcsa teszteléshez
window.ENV.VITE_XAI_PROVIDER = 'openai';
window.ENV.VITE_XAI_DEBUG = 'false';
