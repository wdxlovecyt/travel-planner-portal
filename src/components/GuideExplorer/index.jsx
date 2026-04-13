import React, { useState } from 'react'
import { Button, Input, List, Spin, Upload, message as antdMessage } from 'antd'
import {
  CompassOutlined,
  PictureOutlined,
  SendOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { routeStore } from '../../stores/routeStore'
import './style.css'

const { TextArea } = Input
const MAX_IMAGE_COUNT = 6

const parseStreamChunk = (rawLine) => {
  const trimmedLine = rawLine.trim()

  if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
    return null
  }

  const jsonStr = trimmedLine.slice(6).trim()

  if (!jsonStr) {
    return null
  }

  return JSON.parse(jsonStr)
}

function GuideExplorer() {
  const navigate = useNavigate()
  const [guideText, setGuideText] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [routes, setRoutes] = useState(null)

  const convertFileToDataUrl = (file) => (
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  )

  const handleBeforeUpload = async (file) => {
    if (images.length >= MAX_IMAGE_COUNT) {
      antdMessage.warning(`最多上传 ${MAX_IMAGE_COUNT} 张图片`)
      return Upload.LIST_IGNORE
    }

    try {
      const dataUrl = await convertFileToDataUrl(file)
      setImages((current) => [
        ...current,
        {
          uid: file.uid,
          name: file.name,
          url: dataUrl
        }
      ])
    } catch (error) {
      console.error('图片读取失败:', error)
      antdMessage.error('图片读取失败，请重试')
    }

    return Upload.LIST_IGNORE
  }

  const handleRemoveImage = (file) => {
    setImages((current) => current.filter((item) => item.uid !== file.uid))
  }

  const handleParseGuide = async () => {
    if (!guideText.trim() && images.length === 0) {
      antdMessage.warning('请先粘贴攻略文案或上传图片')
      return
    }

    setLoading(true)
    setStatus('')
    setRoutes(null)

    try {
      const response = await fetch('/api/guides-to-routes/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guide_text: guideText,
          images: images.map((image) => image.url)
        })
      })

      if (!response.ok || !response.body) {
        throw new Error(`guides-to-routes request failed: ${response.status}`)
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
          try {
            const data = parseStreamChunk(line)

            if (!data) {
              continue
            }

            if (data.stage || data.message) {
              setStatus(data.message || data.stage)
            }

            if (data.result?.type === 'route_plan_batch' && data.result.routes) {
              setRoutes(data.result.routes)
            }

            if (data.type === 'route_plan_batch' && data.routes) {
              setRoutes(data.routes)
            }
          } catch (error) {
            console.error('解析攻略流失败:', error, line)
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = parseStreamChunk(buffer)

          if (data?.stage || data?.message) {
            setStatus(data.message || data.stage)
          }

          if (data?.result?.type === 'route_plan_batch' && data.result.routes) {
            setRoutes(data.result.routes)
          }

          if (data?.type === 'route_plan_batch' && data.routes) {
            setRoutes(data.routes)
          }
        } catch (error) {
          console.error('解析最后一段攻略流失败:', error, buffer)
        }
      }

      antdMessage.success('攻略解析完成')
    } catch (error) {
      console.error('攻略解析失败:', error)
      antdMessage.error('攻略解析失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleRouteSelect = (route, index) => {
    routeStore.setSelectedRoute(route)
    antdMessage.success(`已选择第 ${index + 1} 条路线`)
    navigate('/navigation')
  }

  return (
    <div className="guide-explorer-page">
      <div className="guide-explorer-shell">
        <div className="guide-explorer-header">
          <div className="guide-explorer-badge">
            <CompassOutlined />
            <span>攻略转路线</span>
          </div>
          <div className="guide-explorer-title-row">
            <h2>粘贴攻略</h2>
          </div>
        </div>

        <section className="guide-explorer-editor">
          <TextArea
            value={guideText}
            onChange={(event) => setGuideText(event.target.value)}
            placeholder="把整段攻略文案粘贴到这里，也可以只上传图片让系统一起提取路线。"
            autoSize={{ minRows: 7, maxRows: 14 }}
            maxLength={10000}
          />
          <div className="guide-explorer-upload">
            <div className="guide-explorer-upload-head">
              <span>攻略图片</span>
              <span>{images.length}/{MAX_IMAGE_COUNT}</span>
            </div>
            <Upload
              listType="picture-card"
              accept="image/*"
              multiple
              beforeUpload={handleBeforeUpload}
              onRemove={handleRemoveImage}
              fileList={images}
            >
              {images.length >= MAX_IMAGE_COUNT ? null : (
                <div className="guide-upload-trigger">
                  <PictureOutlined />
                  <span>上传图片</span>
                </div>
              )}
            </Upload>
          </div>
          <div className="guide-explorer-results">
            {loading && status && (
              <div className="guide-status">
                <Spin size="small" />
                <span>{status}</span>
              </div>
            )}

            {routes?.length ? (
              <List
                className="guide-route-list"
                dataSource={routes}
                renderItem={(route, index) => (
                  <List.Item className="guide-route-item">
                    <div className="guide-route-main">
                      <div className="guide-route-avatar">
                        <EnvironmentOutlined />
                      </div>
                      <div className="guide-route-content">
                        <div className="guide-route-flow">
                          {route.segments?.map((segment, segmentIndex) => (
                            <React.Fragment key={segment.segment_id || segmentIndex}>
                              <span className="guide-flow-place">{segment.from_place_name}</span>
                              <span className="guide-flow-arrow">→</span>
                              {segmentIndex === route.segments.length - 1 && (
                                <span className="guide-flow-place">{segment.to_place_name}</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  <Button
                    type="primary"
                    className="guide-route-action"
                    onClick={() => handleRouteSelect(route, index)}
                  >
                    <SendOutlined />
                  </Button>
                  </List.Item>
                )}
              />
            ) : (
              !loading && (
                <div className="guide-empty">
                  <div className="guide-empty-illustration">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>还没有解析结果</p>
                  <p>贴入攻略文案后，系统会从文案里提取行程、地点顺序并生成可导航路线。</p>
                </div>
              )
            )}
          </div>
          <div className="guide-explorer-editor-actions">
            <Button type="primary" onClick={handleParseGuide} loading={loading}>
              {loading ? '解析中' : '生成路线'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default GuideExplorer
