import { createApp } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import './style.css'
import App from './App.vue'

const app = createApp(App)
const queryClient = new QueryClient()

app.use(VueQueryPlugin, { queryClient })
app.mount('#app')
