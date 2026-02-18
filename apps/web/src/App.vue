<script setup lang="ts">
import AlumniForm from './features/alumni/components/AlumniForm.vue';
import { Button } from '@/components/ui';
import { GraduationCap, Github, LifeBuoy } from 'lucide-vue-next';
</script>

<template>
  <div class="min-h-screen bg-background font-sans text-foreground antialiased">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-16 items-center justify-between">
        <div class="flex items-center gap-2">
          <GraduationCap class="h-6 w-6 text-primary" />
          <span class="text-xl font-bold tracking-tight">AlumniManager</span>
        </div>
        
        <nav class="flex items-center gap-4">
          <Button variant="ghost" size="sm" class="hidden sm:flex items-center gap-2">
            <LifeBuoy class="h-4 w-4" />
            Support
          </Button>
          <Button variant="ghost" size="icon" class="hidden sm:flex">
            <Github class="h-5 w-5" />
          </Button>
          <div class="h-6 w-px bg-border hidden sm:block"></div>
          <Button variant="default" size="sm">Get Started</Button>
        </nav>
      </div>
    </header>

    <!-- Hero / Content -->
    <main class="relative">
      <!-- Background pattern -->
      <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
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
    </main>

    <!-- Footer -->
    <footer class="border-t py-6 md:py-0">
      <div class="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p class="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built by <a href="#" class="font-medium underline underline-offset-4">Alumni Team</a>. The source code is available on <a href="#" class="font-medium underline underline-offset-4">GitHub</a>.
        </p>
        <div class="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <a href="#" class="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" class="hover:text-foreground transition-colors">Terms</a>
          <a href="#" class="hover:text-foreground transition-colors">Cookies</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Container utility if not provided by tailwind-animate or similar */
.container {
  width: 100%;
  margin-right: auto;
  margin-left: auto;
  padding-right: 2rem;
  padding-left: 2rem;
}

@media (min-width: 1400px) {
  .container {
    max-width: 1400px;
  }
}
</style>

<style>
@import "tailwindcss";
</style>
