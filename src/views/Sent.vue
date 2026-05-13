<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-light text-dark text-center">
    <div>
      <!-- Rasm -->
      <img
        src="https://em-content.zobj.net/source/telegram/386/man-technologist_1f468-200d-1f4bb.webp"
        loading="lazy"
        alt="Telemoji (November 2023)"
        class="img-fluid rounded-circle mb-4"
        style="width: 150px; height: 150px;"
      />

      <!-- Xabar -->
      <div class="mb-4">
        <p class="fs-5">{{ t("sentInfo1") }}</p>
        <p class="fs-6">{{ t("sentInfo2") }}</p>
      </div>

      <!-- Tugma -->
      <button class="btn btn-primary btn-lg px-5" @click="closeApp">{{ t("ok") }}</button>
    </div>
  </div>
</template>

<script>
import { useI18n } from "vue-i18n";
export default {
  name: "SentView",
  setup() {
    const { t } = useI18n();
    const closeApp = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.close();
      } else {
        alert("Telegram Web App SDK юкланмаган!");
      }
    };
    return { t, closeApp };
  },
};
</script>

<style scoped>
.img-fluid {
  max-width: 100%;
  height: auto;
}
</style>
