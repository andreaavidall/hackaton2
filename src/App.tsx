import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NewsDetailPage } from './pages/NewsDetailPage'
import { NewsFeedPage } from './pages/NewsFeedPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { SagaStoryPage } from './pages/SagaStoryPage'
import { SagasPage } from './pages/SagasPage'
import { WantedDetailPage } from './pages/WantedDetailPage'
import { WantedListPage } from './pages/WantedListPage'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Publicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Privadas: RequireAuth decide si pasan, y Layout pinta el marco. */}
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/wanted" element={<WantedListPage />} />
            <Route path="/wanted/:id" element={<WantedDetailPage />} />

            {/* Grand Line: requiere el Log Pose (CP3). Hasta entonces la API
                responde 423 y estas pantallas lo explican. */}
            <Route path="/news" element={<NewsFeedPage />} />
            <Route path="/news/:id" element={<NewsDetailPage />} />
            <Route path="/sagas" element={<SagasPage />} />
            <Route path="/sagas/:id" element={<SagaStoryPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
