import React from 'react'
import { EnvironmentOutlined, HeartOutlined, StarOutlined } from '@ant-design/icons'
import './style.css'

function ProfilePage() {
  const shortcuts = [
    { title: '收藏路线', description: '把常用行程收进自己的旅行夹', icon: <HeartOutlined /> },
    { title: '想去清单', description: '记录下一次想去的城市与地点', icon: <StarOutlined /> },
    { title: '常驻城市', description: '同步你最常搜索和规划的城市', icon: <EnvironmentOutlined /> }
  ]

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-avatar">旅</div>
        <div className="profile-hero-content">
          <span className="profile-badge">旅行档案</span>
          <h2>把路线、灵感和想去的地方都收在这里</h2>
          <p>这里会慢慢成为你的个人旅行主页，现在先把常用入口摆出来。</p>
        </div>
      </div>

      <div className="profile-shortcuts">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.title} className="profile-card">
            <div className="profile-card-icon">{shortcut.icon}</div>
            <div className="profile-card-title">{shortcut.title}</div>
            <div className="profile-card-description">{shortcut.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfilePage
