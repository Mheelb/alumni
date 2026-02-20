<script setup lang="ts">
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Avatar,
  AvatarFallback,
} from '@/components/ui';
import { 
  GraduationCap, 
  Github, 
  LifeBuoy, 
  Users, 
  ShieldCheck, 
  UserCircle, 
  LogOut,
  User
} from 'lucide-vue-next';
import { authClient } from '@/lib/auth-client';
import { RouterView, RouterLink, useRouter } from 'vue-router';

const router = useRouter();
const session = authClient.useSession();

async function handleLogout() {
  await authClient.signOut();
  router.push('/login');
}

function getInitials(name: string = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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
          <template v-if="session.data?.user">
            <RouterLink to="/annuaire">
              <Button variant="ghost" size="sm" class="hidden sm:flex items-center gap-2">
                <Users class="h-4 w-4" />
                Annuaire
              </Button>
            </RouterLink>
            <!-- @ts-ignore - role exists on user -->
            <RouterLink v-if="session.data.user.role === 'admin'" to="/admin/users">
              <Button variant="ghost" size="sm" class="hidden sm:flex items-center gap-2">
                <ShieldCheck class="h-4 w-4" />
                Comptes
              </Button>
            </RouterLink>
          </template>
          <Button variant="ghost" size="sm" class="hidden sm:flex items-center gap-2">
            <LifeBuoy class="h-4 w-4" />
            Support
          </Button>
          <Button variant="ghost" size="icon" class="hidden sm:flex">
            <Github class="h-5 w-5" />
          </Button>
          
          <div class="h-6 w-px bg-border hidden sm:block"></div>
          
          <template v-if="session.data?.user">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" class="relative h-9 w-9 rounded-full p-0">
                  <Avatar class="h-9 w-9 border border-border">
                    <AvatarFallback class="text-xs bg-primary/5 text-primary">
                      {{ getInitials(session.data.user.name) }}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-56" align="end">
                <DropdownMenuLabel class="font-normal">
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium leading-none">{{ session.data.user.name }}</p>
                    <p class="text-xs leading-none text-muted-foreground">{{ session.data.user.email }}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="router.push('/account')">
                  <User class="mr-2 h-4 w-4" />
                  <span>Mon compte</span>
                </DropdownMenuItem>
                <DropdownMenuItem v-if="session.data.user.alumniId" @click="router.push('/annuaire/' + session.data.user.alumniId)">
                  <UserCircle class="mr-2 h-4 w-4" />
                  <span>Mon profil alumni</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="handleLogout" class="text-destructive focus:text-destructive">
                  <LogOut class="mr-2 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>
          <template v-else>
            <RouterLink to="/login">
              <Button variant="default" size="sm">Connexion</Button>
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
