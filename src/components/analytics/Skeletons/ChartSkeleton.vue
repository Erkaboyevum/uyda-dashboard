<template>
  <div style="padding:0 16px 16px">
    <div class="skeleton-shimmer" style="height:230px;border-radius:14px;" />
  </div>
</template>

<style scoped>
.skeleton-shimmer {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
