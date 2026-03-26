import React from 'react'
import { HomeOutlined, CompassOutlined, UserOutlined } from '@ant-design/icons'
import './style.css'

function TabBar({ activeTab, onTabChange }) {
  const tabs = [
    { key: 'home', label: '首页', icon: <HomeOutlined /> },
    { key: 'explore', label: '探索', icon: <CompassOutlined /> },
    { key: 'profile', label: '我的', icon: <UserOutlined /> }
  ]

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <div
          key={tab.key}
          className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          <div className="tab-icon">{tab.icon}</div>
          <div className="tab-label">{tab.label}</div>
        </div>
      ))}
    </div>
  )
}

export default TabBar