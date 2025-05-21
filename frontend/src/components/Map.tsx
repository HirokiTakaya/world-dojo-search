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

  // Google Mapsスクリプトを動的に読み込む
  useEffect(() => {
    const existingScript = document.querySelector("#google-maps-script");

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        initMap();
      };

      document.body.appendChild(script);
    } else {
      if (window.google && window.google.maps) {
        initMap();
      } else {
        existingScript.addEventListener("load", initMap);
      }
    }

    return () => {
      existingScript?.removeEventListener("load", initMap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.google || !window.google.maps || !googleMapRef.current) return;

    googleMapRef.current.setCenter({ lat, lng });

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const favoriteDojoIds = favorites.map((fav) => fav.dojo.id);

    dojos.forEach((dojo) => {
      if (dojo.latitude != null && dojo.longitude != null) {
        const isFavorite = favoriteDojoIds.includes(dojo.id);

        const marker = new google.maps.Marker({
          position: { lat: dojo.latitude, lng: dojo.longitude },
          map: googleMapRef.current!,
          title: dojo.name,
          icon: isFavorite
            ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            : undefined,
        });

        marker.addListener("click", () => onMarkerClick(dojo));
        markersRef.current.push(marker);
      }
    });
  }, [lat, lng, dojos, favorites, onMarkerClick]);

  const initMap = () => {
    if (!mapRef.current || googleMapRef.current) return;

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 12,
    });
  };

  return <div ref={mapRef} className={styles.map} />;
});

export default Map;
