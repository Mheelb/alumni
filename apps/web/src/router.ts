import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import LoginPage from './pages/LoginPage.vue'
import RegisterPage from './pages/RegisterPage.vue'
import AnnuairePage from './pages/AnnuairePage.vue'
import ProfilDetailPage from './pages/ProfilDetailPage.vue'
import { authClient } from './lib/auth-client'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
    { path: '/annuaire', component: AnnuairePage, meta: { requiresAuth: true } },
    { path: '/annuaire/:id', component: ProfilDetailPage, meta: { requiresAuth: true } },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const { data } = await authClient.getSession()
    if (!data?.user) {
      return '/login'
    }
  }
})

export default router
