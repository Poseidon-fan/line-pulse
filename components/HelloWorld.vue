<script lang="ts" setup>
import init, { sum, greet } from "../wasm/pkg/line_pulse_wasm";
const wasmResult = ref<number>(0);

const a = ref(2);
const b = ref(5);

const sumWasm = () => {
  const result = sum(a.value, b.value);
  wasmResult.value = result;
};

const greetWasm = () => {
  greet("WASM");
};

onMounted(async () => {
  await init();
});
</script>

<template>
  <div>click below to sum {{ a }} and {{ b }}</div>
  <button type="button" @click="sumWasm">result is {{ wasmResult }}</button>
</template>

<style scoped>

</style>
