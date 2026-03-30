import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Chat from './components/Chat'
import GuideExplorer from './components/GuideExplorer'
import HomeMapScene from './components/HomeMapScene'
import NavigationMapScene from './components/NavigationMapScene'
import ProfilePage from './components/ProfilePage'
import TabBar from './components/TabBar'
import { routeStore, useRouteStore } from './stores/routeStore'
import './App.css'

function App() {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const selectedRoute = useRouteStore((snapshot) => snapshot.selectedRoute)
  const pathname = location.pathname
  const isNavigationPage = pathname === '/navigation'
  const isNavigating = useMemo(
    () => isNavigationPage && Boolean(selectedRoute),
    [isNavigationPage, selectedRoute]
  )

  useEffect(() => {
    if (pathname === '/explore' || pathname === '/profile') {
      routeStore.clearRoute()
      setIsSearchFocused(false)
    }
  }, [pathname])

  useEffect(() => {
    if (pathname === '/navigation' && !selectedRoute) {
      navigate('/', { replace: true })
    }
  }, [pathname, selectedRoute, navigate])

  const handleRouteSelect = (route) => {
    routeStore.setSelectedRoute(route)
    setIsSearchFocused(false)
    navigate('/navigation')
  }

  const handleBackFromNavigation = () => {
    routeStore.clearRoute()
    navigate('/')
  }

  return (
    <div className={`app-container ${isNavigating ? 'navigating' : ''}`}>
      <div className="page-content">
        <Routes>
          <Route
            path="/"
            element={(
              <>
                <HomeMapScene />
                {!isNavigating && (
                  <Chat onRouteSelect={handleRouteSelect} onFocusChange={setIsSearchFocused} />
                )}
              </>
            )}
          />
          <Route
            path="/navigation"
            element={<NavigationMapScene onBack={handleBackFromNavigation} />}
          />
          <Route path="/explore" element={<GuideExplorer />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isSearchFocused && !isNavigating && (
        <TabBar pathname={pathname} />
      )}
    </div>
  )
}

export default App
