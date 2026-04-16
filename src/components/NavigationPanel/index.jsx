import React from 'react';
import { CompassOutlined, LeftOutlined } from '@ant-design/icons';
import './style.css';

const TRANSPORT_TYPE_TO_MODE = {
  步行: 'walking',
  驾车: 'driving',
  骑行: 'riding',
  公交: 'transit',
  walking: 'walking',
  driving: 'driving',
  riding: 'riding',
  transit: 'transit'
};

const formatDistance = (distance) => {
  if (typeof distance !== 'number' || Number.isNaN(distance)) {
    return '';
  }

  if (distance < 1000) {
    return `${Math.round(distance)}米`;
  }

  const kilometers = distance / 1000;
  return `${Number.isInteger(kilometers) ? kilometers : kilometers.toFixed(1)}公里`;
};

const formatDuration = (duration) => {
  if (typeof duration !== 'number' || Number.isNaN(duration)) {
    return '';
  }

  const totalMinutes = Math.max(1, Math.round(duration / 60));

  if (totalMinutes < 60) {
    return `${totalMinutes}分钟`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}小时`;
  }

  return `${hours}小时${minutes}分钟`;
};

function NavigationPanel({
  currentRoute,
  isExpanded,
  activeTravelMode,
  transportModes,
  onBack,
  onToggleExpand,
  onDragStart,
  onDragEnd,
  onTravelModeChange,
  onSegmentModeChange,
  onSegmentNav,
  onStartNav,
  getWaypointStatus
}) {
  if (!currentRoute?.segments?.length) {
    return null;
  }

  const { segments } = currentRoute;
  const lastSegment = segments[segments.length - 1];
  const editableTransportModes = transportModes.filter((mode) => mode.key !== 'custom');

  return (
    <>
      <div className={`map-top-panel ${isExpanded ? 'hidden' : ''}`}>
        <div className="map-top-header">
          <LeftOutlined className="map-back-icon" onClick={onBack} />
          <div className="map-route-inputs">
            <div className="route-input-row">
              <span className="dot start-dot"></span>
              <div className="route-input-box">{segments[0].from}</div>
            </div>
            <div className="route-input-row">
              <span className="dot end-dot"></span>
              <div className="route-input-box">{lastSegment.to}</div>
            </div>
          </div>
        </div>
        <div className="map-travel-modes">
          {transportModes.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={`mode-tab ${activeTravelMode === mode.key ? 'active' : ''}`}
              onClick={() => onTravelModeChange(mode.key)}
              disabled={mode.key === 'custom'}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`map-bottom-panel ${isExpanded ? 'expanded' : ''}`}>
        <div
          className="panel-drag-area"
          onTouchStart={onDragStart}
          onTouchEnd={onDragEnd}
          onMouseDown={onDragStart}
          onMouseUp={onDragEnd}
          onClick={onToggleExpand}
        >
          <div className="panel-drag-handle"></div>
        </div>

        <div className="waypoints-list">
          {segments.map((segment, index) => (
            <React.Fragment key={segment.segment_id || index}>
              <div className="waypoint-item">
                <div className="waypoint-marker">
                  <div className={`waypoint-dot ${index === 0 ? 'start-dot' : 'mid-dot'} ${getWaypointStatus(index)}`}></div>
                  <div className="waypoint-line"></div>
                </div>
                <div className="waypoint-content">
                  <div className={`waypoint-name ${getWaypointStatus(index)}`}>{segment.from}</div>
                </div>
              </div>

              <div className="segment-nav-row">
                <div className="segment-nav-rail">
                  <div className="segment-nav-rail-line"></div>
                </div>
                <div className="segment-nav-content">
                  <div className="segment-mode-switcher">
                    {editableTransportModes.map((mode) => (
                      <button
                        key={`${segment.segment_id}-${mode.key}`}
                        type="button"
                        className={`segment-mode-chip ${TRANSPORT_TYPE_TO_MODE[segment.transportType] === mode.key ? 'active' : ''}`}
                        onClick={() => onSegmentModeChange(segment.segment_id, mode.key)}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <div className="segment-nav-main">
                    <div className="segment-nav-info">
                      {(segment.route_plan?.summary?.distance_m || segment.route_plan?.summary?.duration_s) && (
                        <div className="segment-nav-meta">
                          {[
                            formatDistance(segment.route_plan?.summary?.distance_m),
                            segment.route_plan?.summary?.walking_distance_m
                              ? `步行${formatDistance(segment.route_plan.summary.walking_distance_m)}`
                              : '',
                            formatDuration(segment.route_plan?.summary?.duration_s)
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="segment-nav-icon-btn"
                      onClick={() => onSegmentNav(segment)}
                      aria-label={`导航 ${segment.from} 到 ${segment.to}`}
                    >
                      <CompassOutlined />
                      <span>导航</span>
                    </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
          <div className="waypoint-item">
            <div className="waypoint-marker">
              <div className={`waypoint-dot end-dot ${getWaypointStatus(segments.length)}`}></div>
            </div>
            <div className="waypoint-content">
              <div className={`waypoint-name ${getWaypointStatus(segments.length)}`}>
                {lastSegment.to}
              </div>
            </div>
          </div>
        </div>

        <div className="route-bottom-actions">
          <div className="nav-btn" onClick={onStartNav}>
            开始导航
          </div>
        </div>
      </div>
    </>
  );
}

export default NavigationPanel;
