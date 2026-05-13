import { reactive } from "vue";

const config = reactive({});

export async function loadConfig() {
  const response = await fetch("/config.json");
  const data = await response.json();
  Object.assign(config, data);
}

export function useConfig() {
  return config;
}
