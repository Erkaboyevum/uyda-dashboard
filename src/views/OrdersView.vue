<template>
  <div class="orders-page">
    <OrderList
      :items="data?.items ?? []"
      :total-orders="data?.summary.totalOrders ?? 0"
      :loading="loading"
      :loading-more="loadingMore"
      :error="error"
      :has-more="hasMore"
      @load-more="loadMore"
      @retry="refetch"
    />
    <div class="bottom-space" />
    <BottomBar />
  </div>
</template>

<script setup>
import { useOrderAnalysis } from '@/composables/useOrderAnalysis';
import BottomBar from '@/components/BottomBar.vue';
import OrderList from '@/components/analytics/Orders/OrderList.vue';

const { data, loading, loadingMore, error, hasMore, loadMore, refetch } = useOrderAnalysis();
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: var(--tg-theme-bg-color, #fff);
}
.bottom-space { height: 80px; }
</style>
