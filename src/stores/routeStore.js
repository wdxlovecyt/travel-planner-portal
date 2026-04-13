import { useSyncExternalStore } from 'react'

const DEFAULT_SEGMENT_MODE = 'transit'

const hasCompleteRoutePlan = (route) => {
  return Boolean(route?.segments?.length) && route.segments.every((segment) => segment.route_plan)
}

const createNormalizedRoute = (route) => {
  if (!route?.segments?.length) {
    return null
  }

  return {
    ...route,
    segments: route.segments.map((segment, index) => ({
      ...segment,
      segment_id: segment.segment_id || `segment_${index + 1}`,
      mode: segment.mode || DEFAULT_SEGMENT_MODE
    }))
  }
}

let state = {
  selectedRoute: null,
  currentRoute: null
}

const listeners = new Set()

const emitChange = () => {
  listeners.forEach((listener) => listener())
}

const setState = (updater) => {
  state = typeof updater === 'function' ? updater(state) : updater
  emitChange()
}

const syncRouteSegments = (route, updater) => {
  if (!route?.segments?.length) {
    return route
  }

  return {
    ...route,
    segments: route.segments.map(updater)
  }
}

export const routeStore = {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getSnapshot() {
    return state
  },

  setSelectedRoute(route) {
    const normalizedRoute = createNormalizedRoute(route)
    setState((prevState) => ({
      ...prevState,
      selectedRoute: normalizedRoute,
      currentRoute: hasCompleteRoutePlan(normalizedRoute) ? normalizedRoute : null
    }))
  },

  clearRoute() {
    setState((prevState) => ({
      ...prevState,
      selectedRoute: null,
      currentRoute: null
    }))
  },

  setCurrentRoute(route) {
    const normalizedRoute = createNormalizedRoute(route)
    setState((prevState) => ({
      ...prevState,
      currentRoute: normalizedRoute
    }))
  },

  replaceRoute(route) {
    const normalizedRoute = createNormalizedRoute(route)
    setState((prevState) => ({
      ...prevState,
      selectedRoute: normalizedRoute,
      currentRoute: normalizedRoute
    }))
  },

  updateSegmentMode(segmentId, mode) {
    setState((prevState) => ({
      ...prevState,
      selectedRoute: syncRouteSegments(prevState.selectedRoute, (segment) => {
        if (segment.segment_id !== segmentId) return segment
        return { ...segment, mode }
      }),
      currentRoute: syncRouteSegments(prevState.currentRoute, (segment) => {
        if (segment.segment_id !== segmentId) return segment
        return { ...segment, mode }
      })
    }))
  },

  setAllSegmentModes(mode) {
    setState((prevState) => ({
      ...prevState,
      selectedRoute: syncRouteSegments(prevState.selectedRoute, (segment) => ({ ...segment, mode })),
      currentRoute: syncRouteSegments(prevState.currentRoute, (segment) => ({ ...segment, mode }))
    }))
  }
}

export const getRouteModeState = (route) => {
  const modes = route?.segments?.map((segment) => segment.mode).filter(Boolean) || []

  if (modes.length === 0) {
    return DEFAULT_SEGMENT_MODE
  }

  return new Set(modes).size === 1 ? modes[0] : 'custom'
}

export const useRouteStore = (selector = (snapshot) => snapshot) => {
  return useSyncExternalStore(
    routeStore.subscribe,
    () => selector(routeStore.getSnapshot()),
    () => selector(routeStore.getSnapshot())
  )
}
