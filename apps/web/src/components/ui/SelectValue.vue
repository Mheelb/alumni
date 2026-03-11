<script setup lang="ts">
import { SelectValue, type SelectValueProps } from 'radix-vue'

defineProps<SelectValueProps>()
</script>

<template>
  <SelectValue v-bind="$props">
    <slot />
  </SelectValue>
</template>
