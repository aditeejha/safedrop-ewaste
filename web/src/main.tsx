import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { reloadOnce } from './components/RouteError'
import { configureAuth } from './lib/auth'
import { loadConfig } from './lib/config'
import { router } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault()
})

const root = createRoot(document.getElementById('root')!)

loadConfig()
  .then(() => {
    configureAuth()
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    )
  })
  .catch((err: Error) => {
    root.render(<p style={{ padding: 24, fontFamily: 'sans-serif' }}>{err.message}</p>)
  })
