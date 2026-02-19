<script setup lang="ts">
import { Button } from '@/components/ui';
import { GraduationCap, Github, LifeBuoy } from 'lucide-vue-next';
import { authClient } from '@/lib/auth-client';
import { RouterView, RouterLink } from 'vue-router';

const { data: session } = authClient.useSession();

async function handleLogout() {
  await authClient.signOut();
}
</script>

<template>
  <div class="min-h-screen bg-background font-sans text-foreground antialiased">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-16 items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2">
          <GraduationCap class="h-6 w-6 text-primary" />
          <span class="text-xl font-bold tracking-tight">AlumniManager</span>
        </RouterLink>

        <nav class="flex items-center gap-4">
          <Button variant="ghost" size="sm" class="hidden sm:flex items-center gap-2">
            <LifeBuoy class="h-4 w-4" />
            Support
          </Button>
          <Button variant="ghost" size="icon" class="hidden sm:flex">
            <Github class="h-5 w-5" />
          </Button>
          <div class="h-6 w-px bg-border hidden sm:block"></div>
          <template v-if="session?.user">
            <Button variant="outline" size="sm" @click="handleLogout">Logout</Button>
          </template>
          <template v-else>
            <RouterLink to="/login">
              <Button variant="default" size="sm">Login</Button>
            </RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Content -->
    <main class="relative">
      <!-- Background pattern -->
      <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <RouterView />
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
