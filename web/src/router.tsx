import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import Home from './pages/Home'

function page(load: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(load)
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6"><Spinner /></div>}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/wipe', element: page(() => import('./pages/Guides')) },
      { path: '/wipe/:guideId', element: page(() => import('./pages/GuidePage')) },
      { path: '/recyclers', element: page(() => import('./pages/Recyclers')) },
      { path: '/ask', element: page(() => import('./pages/Ask')) },
      { path: '/impact', element: page(() => import('./pages/Impact')) },
      { path: '/signin', element: page(() => import('./pages/SignIn')) },
      { path: '/signup', element: page(() => import('./pages/SignUp')) },
      { path: '/drawer', element: page(() => import('./pages/Drawer')) },
      { path: '/drawer/add', element: page(() => import('./pages/AddDevice')) },
      { path: '/drawer/:deviceId', element: page(() => import('./pages/DevicePage')) },
      { path: '/book', element: page(() => import('./pages/Book')) },
      { path: '/bookings/:bookingId', element: page(() => import('./pages/BookingPage')) },
      { path: '/certificate/:certificateId', element: page(() => import('./pages/CertificatePage')) },
      { path: '/partner', element: page(() => import('./pages/Partner')) },
      { path: '/collect', element: page(() => import('./pages/Collect')) },
      { path: '*', element: page(() => import('./pages/NotFound')) },
    ],
  },
])
