<script setup lang="ts">
import AlumniForm from '@/features/alumni/components/AlumniForm.vue'
import { Button } from '@/components/ui'
</script>

<template>
  <div class="container py-12 md:py-24 lg:py-32">
    <div class="flex flex-col items-center gap-4 text-center mb-16">
      <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 mb-4">
        New Version 2.0 is out
      </div>
      <h1 class="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
        Streamline your <span class="text-primary">Alumni Network</span>
      </h1>
      <p class="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
        A professional grade platform for universities to manage, track and connect with their graduates. Built with the best modern technologies.
      </p>
      <div class="flex gap-4 mt-4">
        <Button size="lg">Explore Features</Button>
        <Button variant="outline" size="lg">View Demo</Button>
      </div>
    </div>

    <!-- Form Section -->
    <div class="mx-auto max-w-lg">
      <AlumniForm />
    </div>
  </div>
</template>
