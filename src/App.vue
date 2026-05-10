<template>
  <MainLayout />
</template>

<script setup lang="ts">
import MainLayout from './components/Layout/MainLayout.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #1e1e1e;
  color: #d4d4d4;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>
