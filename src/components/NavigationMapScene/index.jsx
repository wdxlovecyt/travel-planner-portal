import React, { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import BaseMap from '../BaseMap'
import NavigationPanel from '../NavigationPanel'
import { getRouteModeState, routeStore, useRouteStore } from '../../stores/routeStore'

const TRANSPORT_MODES = [
  { key: 'walking', label: '步行', amapMode: 'walk' },
  { key: 'driving', label: '驾车', amapMode: 'car' },
  { key: 'riding', label: '骑行', amapMode: 'ride' },
  { key: 'transit', label: '公交', amapMode: 'bus' }
]

const getRouteCity = (route) => route?.city || '深圳'

const mergeRouteSegments = (route, incomingSegments = []) => {
  const segmentMap = new globalThis.Map(
    incomingSegments.map((segment, index) => [
      segment.segment_id || `segment_${index + 1}`,
      segment
    ])
  )

  return {
    ...route,
    segments: route.segments.map((segment, index) => {
      const segmentId = segment.segment_id || `segment_${index + 1}`
      const incomingSegment = segmentMap.get(segmentId)

      if (!incomingSegment) {
        return segment
      }

      return {
        ...segment,
        ...incomingSegment,
        segment_id: segmentId,
        mode: incomingSegment.mode || segment.mode || 'walking'
      }
    })
  }
}

const normalizeSegmentMode = (segment) => {
  return segment.mode || 'walking'
}

function NavigationMapScene({ onBack }) {
  const requestIdRef = useRef(0)
  const previousRouteKeyRef = useRef('')
  const dragRef = useRef({ startY: 0 })
  const [loading, setLoading] = useState(false)
  const [isPanelExpanded, setIsPanelExpanded] = useState(false)
  const selectedRoute = useRouteStore((snapshot) => snapshot.selectedRoute)
  const currentRoute = useRouteStore((snapshot) => snapshot.currentRoute)
  const routeToDisplay = currentRoute || selectedRoute
  const activeTravelMode = getRouteModeState(routeToDisplay)

  useEffect(() => {
    if (!selectedRoute?.segments?.length) {
      requestIdRef.current += 1
      previousRouteKeyRef.current = ''
      setLoading(false)
      return
    }

    const routeKey = selectedRoute.segments
      .map((segment, index) => {
        return [
          segment.segment_id || `segment_${index + 1}`,
          segment.from_place_name,
          segment.to_place_name
        ].join(':')
      })
      .join('|')

    if (previousRouteKeyRef.current !== routeKey) {
      setIsPanelExpanded(false)
      previousRouteKeyRef.current = routeKey
    }
  }, [selectedRoute])

  useEffect(() => {
    if (!selectedRoute?.segments?.length || currentRoute?.segments?.length) {
      return
    }

    requestRoutePlanUpdate(selectedRoute, selectedRoute.segments, {
      errorMessage: '路线详情加载失败，请稍后重试',
      onSuccess: (nextRoute) => {
        routeStore.replaceRoute(nextRoute)
      }
    })
  }, [selectedRoute, currentRoute])

  const reportMissingCoordinates = (segments) => {
    const missingCoordinateSegments = segments.filter((segment) => {
      return !segment.route_plan?.origin?.location || !segment.route_plan?.destination?.location
    })

    if (missingCoordinateSegments.length === 0) {
      return
    }

    const firstInvalidSegment = missingCoordinateSegments[0]
    const invalidSegmentText = `${firstInvalidSegment.from_place_name} -> ${firstInvalidSegment.to_place_name}`

    message.error(
      missingCoordinateSegments.length > 1
        ? `后端返回的部分地点缺少坐标，无法导航。首个异常路段：${invalidSegmentText}`
        : `后端返回的地点缺少坐标，无法导航。异常路段：${invalidSegmentText}`,
      4
    )
  }

  const requestRoutePlan = async (route, segments) => {
    const response = await fetch('/api/route-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        city: getRouteCity(route),
        segments: segments.map((segment, index) => ({
          segment_id: segment.segment_id || `segment_${index + 1}`,
          from_place_name: segment.from_place_name,
          to_place_name: segment.to_place_name,
          mode: normalizeSegmentMode(segment)
        }))
      })
    })

    if (!response.ok) {
      throw new Error(`route-plan request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.segments || []
  }

  const requestRoutePlanUpdate = async (baseRoute, segmentsToRequest, options = {}) => {
    if (!baseRoute?.segments?.length || segmentsToRequest.length === 0) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setLoading(true)

    try {
      const responseSegments = await requestRoutePlan(baseRoute, segmentsToRequest)

      if (requestIdRef.current !== requestId) {
        return
      }

      const nextRoute = mergeRouteSegments(baseRoute, responseSegments)

      if (options.onSuccess) {
        options.onSuccess(nextRoute)
      } else {
        routeStore.replaceRoute(nextRoute)
      }

      reportMissingCoordinates(responseSegments)
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return
      }

      console.error('获取路线数据失败:', error)
      message.error(options.errorMessage || '路线更新失败，请稍后重试')
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }

  const handleDragStart = (event) => {
    dragRef.current.startY = event.type.includes('mouse') ? event.clientY : event.touches[0].clientY
  }

  const handleDragEnd = (event) => {
    if (!dragRef.current.startY) return

    const endY = event.type.includes('mouse') ? event.clientY : event.changedTouches[0].clientY
    const deltaY = dragRef.current.startY - endY

    if (deltaY > 30) {
      setIsPanelExpanded(true)
    } else if (deltaY < -30) {
      setIsPanelExpanded(false)
    }

    dragRef.current.startY = 0
  }

  const buildAmapNavUrl = (segment) => {
    const routePlan = segment.route_plan
    const originName = routePlan?.origin?.name || segment.from_place_name
    const destinationName = routePlan?.destination?.name || segment.to_place_name
    const originLocation = routePlan?.origin?.location
    const destinationLocation = routePlan?.destination?.location
    const segmentMode = TRANSPORT_MODES.find((mode) => mode.key === normalizeSegmentMode(segment))?.amapMode || 'walk'

    if (originLocation && destinationLocation) {
      return `https://uri.amap.com/navigation?from=${encodeURIComponent(`${originLocation},${originName}`)}&to=${encodeURIComponent(`${destinationLocation},${destinationName}`)}&mode=${encodeURIComponent(segmentMode)}&policy=1&src=${encodeURIComponent('travel-plan-portal')}&coordinate=gaode&callnative=1`
    }

    return null
  }

  const getWaypointStatus = (index) => {
    if (!routeToDisplay?.segments?.length) return ''

    if (index === 0) {
      return routeToDisplay.segments[0].route_plan?.origin?.location ? '' : 'missing'
    }

    if (index === routeToDisplay.segments.length) {
      const lastSegment = routeToDisplay.segments[routeToDisplay.segments.length - 1]
      return lastSegment.route_plan?.destination?.location ? '' : 'missing'
    }

    const previousSegment = routeToDisplay.segments[index - 1]
    const currentSegment = routeToDisplay.segments[index]
    const hasDestination = !!previousSegment?.route_plan?.destination?.location
    const hasOrigin = !!currentSegment?.route_plan?.origin?.location

    return hasDestination && hasOrigin ? '' : 'missing'
  }

  const handleSegmentNav = (segment) => {
    const navUrl = buildAmapNavUrl(segment)

    if (!navUrl) {
      message.error('当前路段缺少高德坐标，已阻止跳转到模糊搜索页。请先确保该路段已成功生成路线。')
      return
    }

    window.open(navUrl, '_blank', 'noopener,noreferrer')
  }

  const handleStartNav = () => {
    if (!routeToDisplay?.segments?.length) return

    const firstSegment = routeToDisplay.segments[0]
    const navUrl = buildAmapNavUrl(firstSegment)

    if (!navUrl) {
      message.error('当前首段缺少高德坐标，已阻止跳转到模糊搜索页。请先确保该路段已成功生成路线。')
      return
    }

    if (routeToDisplay.segments.length > 1) {
      message.info(`当前按分段导航处理，已打开第 1 / ${routeToDisplay.segments.length} 段。`, 4)
    }

    window.open(navUrl, '_blank', 'noopener,noreferrer')
  }

  const handleTravelModeChange = (travelMode) => {
    if (travelMode === 'custom' || travelMode === activeTravelMode || !routeToDisplay?.segments?.length) {
      return
    }

    const nextRoute = {
      ...routeToDisplay,
      segments: routeToDisplay.segments.map((segment) => ({
        ...segment,
        mode: travelMode
      }))
    }

    routeStore.replaceRoute(nextRoute)
    requestRoutePlanUpdate(nextRoute, nextRoute.segments, {
      errorMessage: '更新路线交通方式失败，请稍后重试'
    })
  }

  const handleSegmentModeChange = (segmentId, mode) => {
    if (!routeToDisplay?.segments?.length) {
      return
    }

    const targetSegment = routeToDisplay.segments.find((segment) => segment.segment_id === segmentId)

    if (!targetSegment || targetSegment.mode === mode) {
      return
    }

    const nextRoute = {
      ...routeToDisplay,
      segments: routeToDisplay.segments.map((segment) => {
        if (segment.segment_id !== segmentId) {
          return segment
        }

        return {
          ...segment,
          mode
        }
      })
    }

    routeStore.replaceRoute(nextRoute)
    requestRoutePlanUpdate(
      nextRoute,
      nextRoute.segments.filter((segment) => segment.segment_id === segmentId),
      {
        errorMessage: '更新该路段交通方式失败，请稍后重试'
      }
    )
  }

  return (
    <BaseMap route={routeToDisplay} loading={loading}>
      <NavigationPanel
        currentRoute={routeToDisplay}
        isExpanded={isPanelExpanded}
        activeTravelMode={activeTravelMode}
        transportModes={[...TRANSPORT_MODES, { key: 'custom', label: '自定义' }]}
        onBack={onBack}
        onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTravelModeChange={handleTravelModeChange}
        onSegmentModeChange={handleSegmentModeChange}
        onSegmentNav={handleSegmentNav}
        onStartNav={handleStartNav}
        getWaypointStatus={getWaypointStatus}
      />
    </BaseMap>
  )
}

export default NavigationMapScene
