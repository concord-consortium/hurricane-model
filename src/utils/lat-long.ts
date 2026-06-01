export function getDirectionLetter(value: number, axis: "lat" | "lng") {
  if (axis === "lat") {
    return value >= 0 ? "N" : "S";
  } else {
    return value >= 0 ? "E" : "W";
  }
}
