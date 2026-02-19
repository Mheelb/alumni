<script setup lang="ts">
import CreateAccountForm from '@/features/admin/components/CreateAccountForm.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-slate-900">Administration Alumni</h1>
      <p class="text-slate-600">Portail de gestion des accès utilisateurs</p>
    </div>
    
    <CreateAccountForm />
  </div>
</template>
