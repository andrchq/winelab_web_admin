"use client";

import React from 'react';
import { YMaps, Map, Placemark, ZoomControl, TypeSelector, FullscreenControl } from '@pbe/react-yandex-maps';

interface YandexMapProps {
    center?: [number, number];
    zoom?: number;
    height?: string | number;
    width?: string | number;
    placemarks?: Array<{
        coordinates: [number, number];
        title?: string;
        description?: string;
    }>;
    darkMode?: boolean;
    address?: string; // New prop for geocoding
}

const defaultCenter: [number, number] = [55.751574, 37.573856]; // Moscow

export default function YandexMap({
    center: initialCenter = defaultCenter,
    zoom = 15,
    height = "100%",
    width = "100%",
    placemarks = [],
    darkMode = true,
    address, // New prop for geocoding
}: YandexMapProps) {
    const [mapCenter, setMapCenter] = React.useState<[number, number]>(initialCenter);
    const [mapPlacemarks, setMapPlacemarks] = React.useState(placemarks);
    const [ymaps, setYmaps] = React.useState<any>(null);

    // Geocoding effect
    React.useEffect(() => {
        if (ymaps && ymaps.geocode && address) {
            ymaps.geocode(address).then((result: any) => {
                const firstGeoObject = result.geoObjects.get(0);
                if (firstGeoObject) {
                    const coords = firstGeoObject.geometry.getCoordinates();
                    setMapCenter(coords);
                    setMapPlacemarks([{
                        coordinates: coords,
                        title: address,
                        description: "Местоположение"
                    }]);
                }
            }).catch((err: any) => console.error("Geocoding failed", err));
        }
    }, [ymaps, address]);

    return (
        <div style={{
            height,
            width,
            borderRadius: '0.75rem',
            overflow: 'hidden',
            // Adjusted Filter: Less contrast reduction, slightly brighter to avoid "too black" issue
            filter: darkMode ? 'invert(1) hue-rotate(180deg) brightness(1.1) contrast(0.95) saturate(0.5)' : 'none',
            transition: 'filter 0.3s ease'
        }}>
            <YMaps
                query={{ lang: 'ru_RU', apikey: process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY, load: 'package.full' }}
            >
                <Map
                    state={{ center: mapCenter, zoom }}
                    defaultState={{ center: initialCenter, zoom }}
                    width="100%"
                    height="100%"
                    onLoad={(ymapsInstance: any) => {
                        setYmaps(ymapsInstance);
                        console.log("YMaps loaded", ymapsInstance);
                    }}
                    modules={['geocode']}
                >
                    <ZoomControl options={{ size: "small" }} />
                    <FullscreenControl />

                    {mapPlacemarks.map((mark, index) => (
                        <Placemark
                            key={index}
                            geometry={mark.coordinates}
                            properties={{
                                balloonContentHeader: mark.title,
                                balloonContentBody: mark.description,
                            }}
                            options={{
                                preset: 'islands#blueDotIcon',
                            }}
                        />
                    ))}
                </Map>
            </YMaps>
        </div>
    );
}
