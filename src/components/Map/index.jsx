import React, { useRef, useEffect, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { Spin, message, Card } from 'antd';
import { EnvironmentOutlined, FlagOutlined, CarOutlined, LeftOutlined, SwapOutlined, PlusCircleOutlined } from '@ant-design/icons';
import './style.css';

const Map = ({ selectedRoute, onBack }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [activeNavSegmentIndex, setActiveNavSegmentIndex] = useState(0);
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
      drawRouteSegments(selectedRoute);
      setIsPanelExpanded(false);
      setActiveNavSegmentIndex(0);
    } else if (!selectedRoute) {
      setCurrentRoute(null);
      if (mapInstance.current) {
        mapInstance.current.clearMap();
      }
    }
  }, [selectedRoute]);

  const drawRouteSegments = async (route) => {
    const { segments } = route;
    if (!segments || segments.length === 0) return;

    setLoading(true);
    mapInstance.current.clearMap();
    const allMarkers = [];
    const allPolylines = [];
    const enrichedSegments = [];
    const missingCoordinateSegments = [];

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
            if (!routePlan.origin?.location || !routePlan.destination?.location) {
              missingCoordinateSegments.push(segment);
            }

            enrichedSegments.push({
              ...segment,
              route_plan: routePlan
            });

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
          } else {
            missingCoordinateSegments.push(segment);
            enrichedSegments.push(segment);
          }
        } else {
          missingCoordinateSegments.push(segment);
          enrichedSegments.push(segment);
        }
      } catch (err) {
        console.error('获取路线数据失败:', err);
        missingCoordinateSegments.push(segment);
        enrichedSegments.push(segment);
      }
    }

    if (allMarkers.length > 0 || allPolylines.length > 0) {
      mapInstance.current.setFitView([...allMarkers, ...allPolylines]);
    }

    setCurrentRoute({
      ...route,
      segments: enrichedSegments
    });

    if (missingCoordinateSegments.length > 0) {
      const firstInvalidSegment = missingCoordinateSegments[0];
      const hasMultipleInvalidSegments = missingCoordinateSegments.length > 1;
      const invalidSegmentText = `${firstInvalidSegment.from_place_name} -> ${firstInvalidSegment.to_place_name}`;

      message.error(
        hasMultipleInvalidSegments
          ? `后端返回的部分地点缺少坐标，无法导航。首个异常路段：${invalidSegmentText}`
          : `后端返回的地点缺少坐标，无法导航。异常路段：${invalidSegmentText}`,
        4
      );
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

  const buildAmapNavUrl = (segment) => {
    const routePlan = segment.route_plan;
    const originName = routePlan?.origin?.name || segment.from_place_name;
    const destinationName = routePlan?.destination?.name || segment.to_place_name;
    const originLocation = routePlan?.origin?.location;
    const destinationLocation = routePlan?.destination?.location;

    if (originLocation && destinationLocation) {
      return `https://uri.amap.com/navigation?from=${encodeURIComponent(`${originLocation},${originName}`)}&to=${encodeURIComponent(`${destinationLocation},${destinationName}`)}&mode=car&policy=1&src=${encodeURIComponent('travel-plan-portal')}&coordinate=gaode&callnative=0`;
    }

    return null;
  };

  const handleStartNav = () => {
    if (!currentRoute || !currentRoute.segments || currentRoute.segments.length === 0) return;
    const segment = currentRoute.segments[activeNavSegmentIndex];
    const navUrl = buildAmapNavUrl(segment);

    if (!navUrl) {
      message.error('当前路段缺少高德坐标，已阻止跳转到模糊搜索页。请先确保该路段已成功生成路线。');
      return;
    }

    if (currentRoute.segments.length > 1) {
      message.info(
        `高德暂不稳定支持整条多途经点直达，当前打开第 ${activeNavSegmentIndex + 1} / ${currentRoute.segments.length} 段导航。`,
        4
      );
    }

    window.location.href = navUrl;
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
              {currentRoute.segments.length > 1 && (
                <div className="nav-segment-switcher">
                  <button
                    type="button"
                    className="segment-switch-btn"
                    onClick={() => setActiveNavSegmentIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={activeNavSegmentIndex === 0}
                  >
                    上一段
                  </button>
                  <div className="nav-segment-label">
                    {`第 ${activeNavSegmentIndex + 1} 段`}
                    <span className="nav-segment-route">
                      {`${currentRoute.segments[activeNavSegmentIndex].from_place_name} -> ${currentRoute.segments[activeNavSegmentIndex].to_place_name}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="segment-switch-btn"
                    onClick={() => setActiveNavSegmentIndex((prev) => Math.min(prev + 1, currentRoute.segments.length - 1))}
                    disabled={activeNavSegmentIndex === currentRoute.segments.length - 1}
                  >
                    下一段
                  </button>
                </div>
              )}
              <div className="nav-btn" onClick={handleStartNav}>
                {currentRoute.segments.length > 1 ? '导航当前路段' : '开始导航'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Map;
