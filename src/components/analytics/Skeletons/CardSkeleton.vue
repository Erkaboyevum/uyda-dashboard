<template>
  <div class="skeleton-shimmer" style="min-width:150px;height:80px;border-radius:14px;flex-shrink:0;" />
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
