import React, { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import { Spin, message } from 'antd'
import './style.css'

const darkenColor = (hexColor, ratio = 0.3) => {
  const normalized = hexColor.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized

  const rgb = value.match(/.{2}/g)?.map((part) => parseInt(part, 16)) || [0, 0, 0]
  const darker = rgb.map((channel) => {
    return Math.max(0, Math.round(channel * (1 - ratio)))
  })

  return `#${darker.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const createPolylineStyle = (strokeColor) => ({
  strokeColor,
  strokeWeight: 5,
  strokeOpacity: 0.9,
  strokeStyle: 'solid',
  showDir: true,
  dirColor: '#ffffff',
  isOutline: true,
  borderWeight: 1,
  outlineColor: darkenColor(strokeColor, 0.32)
})

const POLYLINE_STYLES = {
  walking: createPolylineStyle('#52c41a'),
  driving: createPolylineStyle('#1677ff'),
  riding: createPolylineStyle('#fa8c16'),
  transit: createPolylineStyle('#722ed1'),
  taxi: createPolylineStyle('#eb2f96')
}

const LEG_TYPE_TO_STYLE = {
  walking: 'walking',
  driving: 'driving',
  cycling: 'riding',
  riding: 'riding',
  transit: 'transit',
  subway: 'transit',
  bus: 'transit',
  train: 'transit',
  railway: 'transit',
  taxi: 'taxi'
}

const getPolylineStyle = (travelMode) => {
  return POLYLINE_STYLES[travelMode] || POLYLINE_STYLES.driving
}

const getLegPolylineStyle = (legType, fallbackMode) => {
  const styleKey = LEG_TYPE_TO_STYLE[legType] || fallbackMode
  return getPolylineStyle(styleKey)
}

const normalizeSegmentMode = (segment) => {
  return segment.mode || 'walking'
}

const parsePolyline = (polyline) => {
  if (!polyline) return []

  return polyline.split(';').map((point) => point.split(',').map(Number))
}

function BaseMap({
  route = null,
  loading = false,
  children = null,
  showMapType = false,
  showZoomControls = true
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isBootLoading, setIsBootLoading] = useState(true)

  useEffect(() => {
    const initMap = async () => {
      try {
        setIsBootLoading(true)

        await AMapLoader.load({
          key: '5c4e7bd6506f9d89b13bccd1b2a0324e',
          version: '2.0',
          plugins: showMapType
            ? ['AMap.Scale', 'AMap.MapType']
            : ['AMap.Scale']
        })

        if (window.AMap && mapRef.current) {
          mapInstance.current = new window.AMap.Map(mapRef.current, {
            zoom: 13,
            center: [113.946542, 22.543099],
            viewMode: '3D'
          })

          mapInstance.current.addControl(new window.AMap.Scale())

          if (showMapType && window.AMap.MapType) {
            mapInstance.current.addControl(new window.AMap.MapType())
          }

          setIsMapReady(true)
        }
      } catch (error) {
        console.error('地图加载失败:', error)
        message.error('地图加载失败，请检查 API Key 是否正确')
      } finally {
        setIsBootLoading(false)
      }
    }

    initMap()

    return () => {
      setIsMapReady(false)
      if (mapInstance.current) {
        mapInstance.current.destroy()
      }
    }
  }, [showMapType])

  useEffect(() => {
    if (!isMapReady || !mapInstance.current) {
      return
    }

    if (!route?.segments?.length) {
      mapInstance.current.clearMap()
      return
    }

    mapInstance.current.clearMap()
    const allMarkers = []
    const allPolylines = []

    route.segments.forEach((segment) => {
      const segmentMode = normalizeSegmentMode(segment)
      const routePlan = segment.route_plan

      if (!routePlan) {
        return
      }

      const { origin, destination, steps, legs } = routePlan

      if (origin?.location) {
        const originMarker = new window.AMap.Marker({
          position: origin.location.split(',').map(Number),
          title: origin.name,
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
          })
        })
        originMarker.setMap(mapInstance.current)
        allMarkers.push(originMarker)
      }

      if (destination?.location) {
        const destinationMarker = new window.AMap.Marker({
          position: destination.location.split(',').map(Number),
          title: destination.name,
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(32, 32),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
          })
        })
        destinationMarker.setMap(mapInstance.current)
        allMarkers.push(destinationMarker)
      }

      if (legs?.length) {
        legs.forEach((leg) => {
          const legPath = parsePolyline(leg.polyline)

          if (!legPath.length) {
            return
          }

          const polyline = new window.AMap.Polyline({
            path: legPath,
            ...getLegPolylineStyle(leg.type, segmentMode)
          })
          polyline.setMap(mapInstance.current)
          allPolylines.push(polyline)
        })
        return
      }

      if (steps?.length) {
        let path = []

        steps.forEach((step) => {
          if (step.polyline) {
            path = path.concat(parsePolyline(step.polyline))
          }
        })

        if (!path.length) {
          return
        }

        const polyline = new window.AMap.Polyline({
          path,
          ...getPolylineStyle(segmentMode)
        })
        polyline.setMap(mapInstance.current)
        allPolylines.push(polyline)
      }
    })

    if (allMarkers.length > 0 || allPolylines.length > 0) {
      mapInstance.current.setFitView([...allMarkers, ...allPolylines])
    }
  }, [route, isMapReady])

  const handleZoomIn = () => {
    if (!mapInstance.current) return
    mapInstance.current.zoomIn()
  }

  const handleZoomOut = () => {
    if (!mapInstance.current) return
    mapInstance.current.zoomOut()
  }

  return (
    <div className="map-wrapper">
      {(isBootLoading || loading) && (
        <div className="map-loading">
          <Spin size="large" tip="路线加载中..." />
        </div>
      )}
      <div ref={mapRef} className="map" id="map"></div>
      {showZoomControls && (
        <div className="map-zoom-controls">
          <button
            type="button"
            className="map-control-button"
            onClick={handleZoomIn}
            disabled={!isMapReady}
            aria-label="放大地图"
          >
            +
          </button>
          <div className="map-control-divider"></div>
          <button
            type="button"
            className="map-control-button"
            onClick={handleZoomOut}
            disabled={!isMapReady}
            aria-label="缩小地图"
          >
            -
          </button>
        </div>
      )}
      {children}
    </div>
  )
}

export default BaseMap
