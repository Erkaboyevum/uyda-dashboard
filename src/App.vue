<template>
  <div class="app container">
    <transition :name="transitionName" mode="out-in">
      <router-view />
    </transition>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';


const router = useRouter();
const isTg = ref(false);
const transitionName = ref("slide-right"); // Default transition

onMounted(async() => {
  // Telegram muhitida ishlayotganimizni tekshirish
  if (window.Telegram?.WebApp) {
    isTg.value = true;
    initTelegramWebApp();
  }

  const getHeaders = () => ({
      "Authorization": "Basic " + btoa("admin:57325732"),
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    });
});

function initTelegramWebApp() {
  const tg = window.Telegram.WebApp;

  // WebAppni ishga tushirish
  tg.ready();
  tg.expand();
  

  // Orqaga tugmasi uchun handler
  tg.BackButton.onClick(() => {
    transitionName.value = "slide-left"; // Chapga qaytish animatsiyasi
    if (window.history.state.back) {
      router.go(-1);
    } else {
      tg.close();
    }
  });
}
</script>

<style>
* {
  font-family: sans-serif;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  text-decoration: none;
  outline: none;
}

/* O'ngga harakatlanadigan transition */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.5s ease, opacity 0.5s ease;
}

.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Chapga harakatlanadigan transition */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.5s ease, opacity 0.5s ease;
}

.slide-left-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
