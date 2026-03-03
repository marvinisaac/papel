<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>Papel Offline MVP</h1>
    </header>
    <main class="app-main">
      <!-- Phase 1 UI will be implemented here -->
      <p>Offline note-taking MVP scaffold.</p>
    </main>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.app-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.app-main {
  flex: 1;
  padding: 1.5rem;
}
</style>
