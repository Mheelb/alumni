import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import LoginPage from './pages/LoginPage.vue'
import RegisterPage from './pages/RegisterPage.vue'
import CreateAccountPage from './pages/admin/CreateAccountPage.vue'
import { authClient } from './lib/auth-client'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/login', component: LoginPage },
    { 
      path: '/register', 
      component: RegisterPage,
      meta: { requiresAdmin: true }
    },
    { 
      path: '/admin/create-account/:alumniId', 
      component: CreateAccountPage,
      meta: { requiresAdmin: true }
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAdmin) {
    const { data: session } = await authClient.getSession()
    
    if (!session) {
      return next('/login')
    }

    // @ts-ignore - role is an additional field
    if (session.user.role !== 'admin') {
      return next('/')
    }
  }
  next()
})

export default router
