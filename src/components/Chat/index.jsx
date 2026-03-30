import React, { useState, useEffect } from 'react'
import { Input, Button, message, List, Tag, Spin } from 'antd'
import { SearchOutlined, EnvironmentOutlined, CloseOutlined } from '@ant-design/icons'
import './style.css'

function Chat({ onRouteSelect, onFocusChange }) {
  const [searchMessage, setSearchMessage] = useState('给我一份城市旅游攻略并规划路线')
  const [routes, setRoutes] = useState(null)
  const [assistantReply, setAssistantReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false)
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    if (onFocusChange) {
      onFocusChange(isSearchPanelOpen)
    }
  }, [isSearchPanelOpen, onFocusChange])

  useEffect(() => {
    return () => {
      if (onFocusChange) {
        onFocusChange(false)
      }
    }
  }, [onFocusChange])

  const saveSearchHistory = (keyword) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    
    setSearchHistory(prev => {
      const newHistory = [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 10)
      localStorage.setItem('searchHistory', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('searchHistory')
  }

  const handleHistoryClick = (keyword) => {
    setSearchMessage(keyword)
    // 立即触发搜索，但在React中状态更新是异步的，所以我们需要直接用keyword调用一次类似handleSearch的逻辑
    // 为了简单，我们先设置值，然后用户可以直接点击搜索或回车
  }

  const handleSearch = async () => {
    if (!searchMessage.trim()) {
      message.warning('请输入搜索内容')
      return
    }

    saveSearchHistory(searchMessage)
    setLoading(true)
    setRoutes(null)
    setAssistantReply('')
    setStatus('')
    
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: searchMessage
        })
      })

      if (!response.ok) {
        throw new Error('请求失败')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          
          if (trimmedLine === '') continue
          
          if (!trimmedLine.startsWith('data: ')) continue
          
          const jsonStr = trimmedLine.substring(6).trim()
          
          if (jsonStr === '') continue
          
          try {
            const data = JSON.parse(jsonStr)
            
            if (data.stage || data.message) {
              const statusText = data.message || data.stage
              setStatus(statusText)
            }

            if (data.reply) {
              setAssistantReply(data.reply)
            }

            if (data.content) {
              setAssistantReply((prevReply) => prevReply || data.content)
            }
            
            if (data.result) {
              if (data.result.type === 'route_plan_batch' && data.result.routes) {
                setRoutes(data.result.routes)
              }
            }
            
            if (data.type === 'route_plan_batch' && data.routes) {
              setRoutes(data.routes)
            }
          } catch (e) {
            console.error('解析JSON失败:', e, jsonStr)
          }
        }
      }

      if (buffer.trim() && buffer.trim().startsWith('data: ')) {
        const jsonStr = buffer.trim().substring(6).trim()
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr)
            if (data.stage || data.message) {
              setStatus(data.message || data.stage)
            }
            if (data.reply) {
              setAssistantReply(data.reply)
            }
            if (data.content) {
              setAssistantReply((prevReply) => prevReply || data.content)
            }
            if (data.result && data.result.type === 'route_plan_batch' && data.result.routes) {
              setRoutes(data.result.routes)
            }
            if (data.type === 'route_plan_batch' && data.routes) {
              setRoutes(data.routes)
            }
          } catch (e) {
            console.error('解析最后的数据失败:', e)
          }
        }
      }

      message.success('路线规划完成')
    } catch (err) {
      console.error('搜索失败:', err)
      message.error('搜索失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleRouteSelect = (route, index) => {
    setIsSearchPanelOpen(false)
    message.success(`已选择第 ${index + 1} 条路线`)
    if (onRouteSelect) {
      onRouteSelect(route)
    }
  }

  const handleInputFocus = () => {
    setIsSearchPanelOpen(true)
  }

  const handleCloseSearchPanel = () => {
    setIsSearchPanelOpen(false)
  }

  return (
    <div className={`chat-layer ${isSearchPanelOpen ? 'search-active' : ''}`}>
      <div className="search-bar">
        <div className="search-shell">
          <Input
            placeholder="输入您的需求，例如：给我一份周末出游攻略并规划路线"
            value={searchMessage}
            onChange={(e) => setSearchMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            prefix={<SearchOutlined style={{ color: '#8c8c8c', marginRight: '8px' }} />}
            suffix={
              <Button 
                type="primary" 
                onClick={handleSearch}
                loading={loading}
              >
                {loading ? '搜索中' : '搜索'}
              </Button>
            }
            size="large"
          />
          <div className="search-shell-copy">
            <div className="search-shell-badge">城市路线灵感</div>
            <div className="search-shell-title">一句话生成游玩路线</div>
            <div className="search-shell-subtitle">输入你的偏好、天数或出发地，我们会直接整理路线并给出导航。</div>
          </div>
        </div>
      </div>

      {/* 从底部弹出的搜索结果面板 */}
      <div className={`search-panel ${isSearchPanelOpen ? 'open' : ''}`}>
        <div className="search-panel-header">
          <h3>搜索与结果</h3>
          <CloseOutlined className="close-icon" onClick={handleCloseSearchPanel} />
        </div>
        <div className="search-panel-content">
          {loading && status && (
            <div className="status-bar">
              <Spin size="small" />
              <span style={{ marginLeft: '8px' }}>{status}</span>
            </div>
          )}
          
          {routes && routes.length > 0 ? (
            <div className="route-list-container">
              <List
                dataSource={routes}
                renderItem={(route, index) => (
                  <List.Item
                    className="route-list-item"
                    onClick={() => handleRouteSelect(route, index)}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className="route-avatar">
                          <EnvironmentOutlined />
                        </div>
                      }
                      title={`路线 ${index + 1}`}
                      description={
                        <div className="route-segments-flow">
                          {route.segments && route.segments.map((seg, segIndex) => (
                            <React.Fragment key={segIndex}>
                              <div className="flow-place">{seg.from_place_name}</div>
                              <div className="flow-arrow">→</div>
                              {segIndex === route.segments.length - 1 && (
                                <div className="flow-place">{seg.to_place_name}</div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          ) : assistantReply ? (
            <div className="assistant-reply-card">
              <div className="assistant-reply-label">助手回复</div>
              <div className="assistant-reply-text">{assistantReply}</div>
            </div>
          ) : (
            !loading && (
              <div className="empty-state">
                {searchHistory.length > 0 && (
                  <div className="search-history">
                    <div className="history-header">
                      <span>历史搜索</span>
                      <span className="clear-history" onClick={clearHistory}>清空</span>
                    </div>
                    <div className="history-tags">
                      {searchHistory.map((item, index) => (
                        <Tag 
                          key={index} 
                          className="history-tag"
                          onClick={() => handleHistoryClick(item)}
                        >
                          {item}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                <div className="empty-tip">
                  <p>您也可以尝试搜索：</p>
                  <Tag color="blue" onClick={() => setSearchMessage('杭州周末一日游路线')} style={{ cursor: 'pointer', margin: '4px' }}>杭州周末一日游路线</Tag>
                  <Tag color="blue" onClick={() => setSearchMessage('从西湖到灵隐寺怎么走')} style={{ cursor: 'pointer', margin: '4px' }}>从西湖到灵隐寺怎么走</Tag>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat
