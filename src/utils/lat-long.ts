export function getDirectionLetter(value: number, axis: "lat" | "lng") {
  if (axis === "lat") {
    return value >= 0 ? "N" : "S";
  } else {
    return value >= 0 ? "E" : "W";
  }
}

// Canonical lat/lng label, e.g. "10.50°N, 20.00°W" — two decimals plus the hemisphere letter.
export function formatLatLng(lat: number, lng: number): string {
  const latL = getDirectionLetter(lat, "lat");
  const lngL = getDirectionLetter(lng, "lng");
  return `${Math.abs(lat).toFixed(2)}°${latL}, ${Math.abs(lng).toFixed(2)}°${lngL}`;
}
