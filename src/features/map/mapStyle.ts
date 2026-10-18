import type { MapStyleElement } from "react-native-maps";

/**
 * Google Maps styles that match the cream and espresso theme. Points of interest are hidden: the
 * pins on this map are the cafes, and Google's own shop icons would compete with them.
 */
export const lightMapStyle: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#f2e8d9" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b5b4f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fbf6ee" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#fbf6ee" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e6dccb" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f5e3c8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfdde0" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ visibility: "on" }, { color: "#d9e4cf" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export const darkMapStyle: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#2a1f18" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#bfaf9f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a130e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3a2d24" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a130e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a3a2e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1d2a30" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ visibility: "on" }, { color: "#25342a" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
