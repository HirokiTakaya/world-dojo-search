// src/components/Map.tsx

import React, { useEffect, useRef } from "react";
import styles from "../App.module.css";
import { Dojo, Favorite } from "../types";

type MapProps = {
  lat: number;
  lng: number;
  dojos: Dojo[];
  favorites: Favorite[];
  onMarkerClick: (dojo: Dojo) => void;
};

const Map: React.FC<MapProps> = React.memo(({ lat, lng, dojos, favorites, onMarkerClick }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    console.log("Map component received dojos:", dojos); // 追加

    if (!window.google || !window.google.maps) {
      console.error("Google Maps script is not loaded.");
      return;
    }

    // マップの初期化 (初回のみ)
    if (!googleMapRef.current && mapRef.current) {
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 12,
      });
    } else if (googleMapRef.current) {
      // センターを更新
      googleMapRef.current.setCenter({ lat, lng });
    }

    // 既存のマーカーを削除
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // お気に入りのDojo IDを抽出
    const favoriteDojoIds = favorites.map((fav) => fav.dojo.id);

    // 道場ごとにマーカーを配置
    dojos.forEach((dojo) => {
      if (dojo.latitude !== null && dojo.longitude !== null) {
        const isFavorite = favoriteDojoIds.includes(dojo.id);

        const marker = new google.maps.Marker({
          position: { lat: dojo.latitude, lng: dojo.longitude },
          map: googleMapRef.current!,
          title: dojo.name,
          icon: isFavorite
            ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" // お気に入り用のアイコン
            : undefined, // デフォルトのアイコン
        });

        // クリックで親に通知
        marker.addListener("click", () => {
          onMarkerClick(dojo);
        });

        markersRef.current.push(marker);
      } else {
        console.warn(`Dojo ${dojo.name} is missing latitude or longitude.`);
      }
    });
  }, [lat, lng, dojos, favorites, onMarkerClick]);

  return <div ref={mapRef} className={styles.map}></div>;
});

export default Map;
