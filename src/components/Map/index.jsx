import React, { useRef, useEffect, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Spin, message, Card } from 'antd';
import { EnvironmentOutlined, FlagOutlined, CarOutlined, LeftOutlined, SwapOutlined, PlusCircleOutlined } from '@ant-design/icons';
import './style.css';

const MAX_AMAP_VIA_POINTS = 15;

const Map = ({ selectedRoute, onBack }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const dragRef = useRef({ startY: 0 });

  useEffect(() => {
    const initMap = async () => {
      try {
        setLoading(true);
        
        await AMapLoader.load({
          key: '5c4e7bd6506f9d89b13bccd1b2a0324e',
          version: '2.0',
          plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.MapType']
        });

        if (window.AMap && mapRef.current) {
          mapInstance.current = new window.AMap.Map(mapRef.current, {
            zoom: 13,
            center: [113.946542, 22.543099],
            viewMode: '3D'
          });

          mapInstance.current.addControl(new window.AMap.Scale());
          mapInstance.current.addControl(new window.AMap.ToolBar());
          mapInstance.current.addControl(new window.AMap.MapType());
        }
      } catch (err) {
        console.error('地图加载失败:', err);
        message.error('地图加载失败，请检查 API Key 是否正确');
      } finally {
        setLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedRoute && selectedRoute.segments && mapInstance.current) {
      drawRouteSegments(selectedRoute.segments);
      setCurrentRoute(selectedRoute);
      setIsPanelExpanded(false);
    } else if (!selectedRoute) {
      setCurrentRoute(null);
      if (mapInstance.current) {
        mapInstance.current.clearMap();
      }
    }
  }, [selectedRoute]);

  const drawRouteSegments = async (segments) => {
    if (!segments || segments.length === 0) return;

    setLoading(true);
    mapInstance.current.clearMap();
    const allMarkers = [];
    const allPolylines = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      try {
        const response = await fetch('/api/route-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            "city": "深圳",
            "segments": [segment]
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        if (data.segments && data.segments.length > 0) {
          const routePlan = data.segments[0].route_plan;
          if (routePlan) {
            const { origin, destination, steps } = routePlan;

            const originMarker = new window.AMap.Marker({
              position: origin.location.split(',').map(Number),
              title: origin.name,
              icon: new window.AMap.Icon({
                size: new window.AMap.Size(32, 32),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
              })
            });
            originMarker.setMap(mapInstance.current);
            allMarkers.push(originMarker);

            const destMarker = new window.AMap.Marker({
              position: destination.location.split(',').map(Number),
              title: destination.name,
              icon: new window.AMap.Icon({
                size: new window.AMap.Size(32, 32),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
              })
            });
            destMarker.setMap(mapInstance.current);
            allMarkers.push(destMarker);

            if (steps && steps.length > 0) {
              let path = [];
              
              steps.forEach(step => {
                if (step.polyline) {
                  const points = step.polyline.split(';').map(point => {
                    return point.split(',').map(Number);
                  });
                  path = path.concat(points);
                }
              });

              if (path.length > 0) {
                const polyline = new window.AMap.Polyline({
                  path: path,
                  strokeColor: '#3366FF',
                  strokeWeight: 5,
                  strokeOpacity: 0.8,
                  strokeStyle: 'solid'
                });
                polyline.setMap(mapInstance.current);
                allPolylines.push(polyline);
              }
            }
          }
        }
      } catch (err) {
        console.error('获取路线数据失败:', err);
      }
    }

    if (allMarkers.length > 0 || allPolylines.length > 0) {
      mapInstance.current.setFitView([...allMarkers, ...allPolylines]);
    }
    
    setLoading(false);
  };

  const handleDragStart = (e) => {
    dragRef.current.startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
  };

  const handleDragEnd = (e) => {
    if (!dragRef.current.startY) return;
    const endY = e.type.includes('mouse') ? e.clientY : e.changedTouches[0].clientY;
    const deltaY = dragRef.current.startY - endY;
    
    // 如果向上滑动的距离超过 30px，则展开面板
    if (deltaY > 30) {
      setIsPanelExpanded(true);
    } 
    // 如果向下滑动的距离超过 30px，则收起面板
    else if (deltaY < -30) {
      setIsPanelExpanded(false);
    }
    
    dragRef.current.startY = 0;
  };

  const handleStartNav = () => {
    if (!currentRoute || !currentRoute.segments || currentRoute.segments.length === 0) return;

    const allStops = [
      currentRoute.segments[0].from_place_name,
      ...currentRoute.segments.map((segment) => segment.to_place_name)
    ];

    const navBatches = [];
    let startIndex = 0;

    while (startIndex < allStops.length - 1) {
      const endIndex = Math.min(
        startIndex + MAX_AMAP_VIA_POINTS + 1,
        allStops.length - 1
      );

      navBatches.push(allStops.slice(startIndex, endIndex + 1));
      startIndex = endIndex;
    }

    const currentBatch = navBatches[0];
    const [startPoint, ...restPoints] = currentBatch;
    const endPoint = restPoints[restPoints.length - 1];
    const viaPoints = restPoints.slice(0, -1);

    let navUrl = `https://www.amap.com/dir?from[name]=${encodeURIComponent(startPoint)}&to[name]=${encodeURIComponent(endPoint)}`;

    viaPoints.forEach((via, index) => {
      navUrl += `&via[${index}][name]=${encodeURIComponent(via)}`;
    });

    navUrl += `&type=car`;

    if (navBatches.length > 1) {
      message.info(
        `该路线共 ${allStops.length} 个点，已按高德限制拆成 ${navBatches.length} 段，当前打开第 1 段导航。`,
        4
      );
    }

    window.open(navUrl, '_blank');
  };

  return (
    <div className="map-wrapper">
      {loading && (
        <div className="map-loading">
          <Spin size="large" tip="路线加载中..." />
        </div>
      )}
      <div ref={mapRef} className="map" id="map"></div>
      {currentRoute && currentRoute.segments && currentRoute.segments.length > 0 && (
        <>
          <div className={`map-top-panel ${isPanelExpanded ? 'hidden' : ''}`}>
            <div className="map-top-header">
              <LeftOutlined className="map-back-icon" onClick={onBack} />
              <div className="map-route-inputs">
                <div className="route-input-row">
                  <span className="dot start-dot"></span>
                  <div className="route-input-box">{currentRoute.segments[0].from_place_name}</div>
                </div>
                <div className="route-input-row">
                  <span className="dot end-dot"></span>
                  <div className="route-input-box">{currentRoute.segments[currentRoute.segments.length - 1].to_place_name}</div>
                </div>
              </div>
            </div>
            <div className="map-travel-modes">
              <div className="mode-tab active">步行</div>
              <div className="mode-tab">驾车</div>
              <div className="mode-tab">骑行</div>
              <div className="mode-tab">公交</div>
              <div className="mode-tab">打车</div>
            </div>
          </div>

          <div className={`map-bottom-panel ${isPanelExpanded ? 'expanded' : ''}`}>
            <div 
              className="panel-drag-area"
              onTouchStart={handleDragStart}
              onTouchEnd={handleDragEnd}
              onMouseDown={handleDragStart}
              onMouseUp={handleDragEnd}
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            >
              <div className="panel-drag-handle"></div>
            </div>

            <div className="waypoints-list">
              {currentRoute.segments.map((seg, idx) => (
                <div key={idx} className="waypoint-item">
                  <div className="waypoint-marker">
                    <div className={`waypoint-dot ${idx === 0 ? 'start-dot' : 'mid-dot'}`}></div>
                    <div className="waypoint-line"></div>
                  </div>
                  <div className="waypoint-content">
                    <div className="waypoint-name">{seg.from_place_name}</div>
                  </div>
                </div>
              ))}
              <div className="waypoint-item">
                <div className="waypoint-marker">
                  <div className="waypoint-dot end-dot"></div>
                </div>
                <div className="waypoint-content">
                  <div className="waypoint-name">{currentRoute.segments[currentRoute.segments.length - 1].to_place_name}</div>
                </div>
              </div>
            </div>

            <div className="route-bottom-actions">
              <div className="nav-btn" onClick={handleStartNav}>
                {currentRoute.segments.length > MAX_AMAP_VIA_POINTS + 1 ? '开始分段导航' : '开始导航'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Map;
