import React from 'react'
import { NavLink } from 'react-router-dom'
import { HomeOutlined, CompassOutlined, UserOutlined } from '@ant-design/icons'
import './style.css'

function TabBar({ pathname }) {
  const tabs = [
    { key: 'home', path: '/', label: '首页', icon: <HomeOutlined /> },
    { key: 'explore', path: '/explore', label: '探索', icon: <CompassOutlined /> },
    { key: 'profile', path: '/profile', label: '我的', icon: <UserOutlined /> }
  ]

  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <NavLink
          key={tab.key}
          className={`tab-item ${pathname === tab.path ? 'active' : ''}`}
          to={tab.path}
        >
          <div className="tab-item-content">
            <div className="tab-icon">{tab.icon}</div>
            <div className="tab-label">{tab.label}</div>
          </div>
        </NavLink>
      ))}
    </div>
  )
}

export default TabBar
