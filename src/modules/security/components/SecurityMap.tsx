import React, { useEffect, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocation } from '../../../hooks/useLocation';
import { Card } from '../../../components/common/Card';

const normalize = (str: string) => 
  str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';

const GeoJsonLayer: React.FC<{ 
  geoJsonData: any; 
  province: any; 
  canton: any;
}> = ({ geoJsonData, province, canton }) => {
  const map = useMap();

  useEffect(() => {
    if (!geoJsonData || !geoJsonData.features) return;

    // Force map size update
    map.invalidateSize();

    // Helper to determine style
    const getFeatureStyle = (feature: any) => {
      let isSelected = false;
      let isParentSelected = false;

      const fProvName = normalize(feature.properties.NAME_1);
      const fCantName = normalize(feature.properties.NAME_2);

      const matchProv = province && fProvName === normalize(province.name);
      const matchCant = canton && fCantName === normalize(canton.name);

      if (province && canton) {
        if (matchProv && matchCant) isSelected = true;
        else if (matchProv) isParentSelected = true;
      } else if (province) {
        if (matchProv) isSelected = true;
      }

      let fillColor = '#475569';
      let color = '#334155';
      let weight = 1;
      let fillOpacity = 0.4;

      if (isSelected) {
        fillColor = '#3b82f6';
        color = '#2563eb';
        weight = 2;
        fillOpacity = 0.7;
      } else if (isParentSelected) {
        fillColor = '#3b82f6';
        color = '#334155';
        fillOpacity = 0.15;
      }

      return { fillColor, weight, color, fillOpacity };
    };

    // Create new layer
    const layer = L.geoJSON(geoJsonData, {
      style: getFeatureStyle,
      onEachFeature: (feature, l: any) => {
        const provName = feature.properties.NAME_1 || '';
        const cantName = feature.properties.NAME_2 || '';
        
        l.bindTooltip(`<strong>${provName}</strong><br/>${cantName}`, {
          className: 'security-map-tooltip',
          sticky: true,
          direction: 'auto'
        });

        l.on({
          mouseover: (e: any) => {
            const target = e.target;
            target.setStyle({ fillOpacity: 0.8, weight: 2 });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              target.bringToFront();
            }
          },
          mouseout: (e: any) => {
            const target = e.target;
            target.setStyle(getFeatureStyle(feature));
          }
        });
      }
    });

    layer.addTo(map);

    // Filter features for bounding box zooming
    let targetFeatures = geoJsonData.features;
    if (canton && province) {
      targetFeatures = geoJsonData.features.filter((f: any) => {
        const nameMatch = normalize(f.properties.NAME_2) === normalize(canton.name);
        const provMatch = normalize(f.properties.NAME_1) === normalize(province.name);
        return provMatch && nameMatch;
      });
    } else if (province) {
      targetFeatures = geoJsonData.features.filter((f: any) => {
        return normalize(f.properties.NAME_1) === normalize(province.name);
      });
    }

    const boundsLayer = L.geoJSON(targetFeatures.length > 0 ? targetFeatures : geoJsonData.features);
    const bounds = boundsLayer.getBounds();

    if (bounds.isValid()) {
      const fly = () => {
        if (map.getSize().x > 0 && map.getSize().y > 0) {
          map.flyToBounds(bounds, { duration: 1.5, padding: [20, 20] });
        } else {
          setTimeout(fly, 50);
        }
      };
      fly();
    }

    return () => {
      map.removeLayer(layer);
    };
  }, [geoJsonData, province, canton, map]);

  return null;
};

export const SecurityMap: React.FC = () => {
  const [geoData, setGeoData] = useState<any>(null);
  const { selectedProvince, selectedCanton } = useLocation();

  useEffect(() => {
    fetch('/data/costa_rica_cantones.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Error loading geojson", err));
  }, []);

  if (!geoData) {
    return (
      <Card header={<h3 className="area-title">Mapa Territorial</h3>}>
        <div className="flex justify-center items-center h-[400px] text-gray-500">
          <div className="spinner mr-3"></div> Cargando mapa...
        </div>
      </Card>
    );
  }

  return (
    <Card header={<h3 className="area-title">Mapa Territorial</h3>}>
      <div 
        className="security-map-wrapper" 
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          borderRadius: 'var(--radius-md, 6px)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-body, #0f172a)',
          border: '1px solid var(--border-color, #1e293b)'
        }}
      >
        <MapContainer 
          center={[9.7489, -83.7534]} 
          zoom={7} 
          style={{ height: '100%', width: '100%', background: 'transparent' }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
        >
          <GeoJsonLayer geoJsonData={geoData} province={selectedProvince} canton={selectedCanton} />
        </MapContainer>
      </div>
    </Card>
  );
};

export default SecurityMap;
