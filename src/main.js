import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import '@twa-dev/sdk';
import { loadConfig } from "./composables/useConfig";
import i18n from "./i18n"; 

// import './assets/css/style.css'; // Barcha sahifalar uchun CSS

// Konfiguratsiyani yuklash
loadConfig().then(() => {
    const app = createApp(App);
    app.use(router);
    app.use(i18n);
    app.mount('#app');
});
