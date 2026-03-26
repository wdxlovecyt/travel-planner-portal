import React, { useState } from 'react'
import Chat from './components/Chat'
import Map from './components/Map'
import TabBar from './components/TabBar'
import './App.css'

function App() {
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const handleRouteSelect = (route) => {
    setSelectedRoute(route)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <>
            <Chat onRouteSelect={handleRouteSelect} onFocusChange={setIsSearchFocused} isNavigating={!!selectedRoute} />
            <Map selectedRoute={selectedRoute} onBack={() => setSelectedRoute(null)} />
          </>
        )
      case 'explore':
        return (
          <div className="page-placeholder">
            <h2>探索页面</h2>
            <p>正在开发中...</p>
          </div>
        )
      case 'profile':
        return (
          <div className="page-placeholder">
            <h2>我的页面</h2>
            <p>正在开发中...</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`app-container ${selectedRoute ? 'navigating' : ''}`}>
      <div className="page-content">
        {renderContent()}
      </div>
      {!isSearchFocused && !selectedRoute && (
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      )}
    </div>
  )
}

export default App