import { latLngPlusVector } from "./math-utils";
import {
  distanceTo
} from "geolocation-utils";

test("latLngPlusVector", () => {
  const initialPos = {lat: 0, lng: 0};
  let newPos = {lat: 0, lng: 20};
  const dist1 = distanceTo(initialPos, newPos);
  let newPosCalculated = latLngPlusVector(initialPos, {u: dist1, v: 0});
  expect(newPosCalculated.lat).toEqual(newPos.lat);
  expect(newPosCalculated.lng).toBeCloseTo(newPos.lng);

  newPos = {lat: -20, lng: 0};
  const dist2 = distanceTo(initialPos, newPos);
  newPosCalculated = latLngPlusVector(initialPos, {u: 0, v: -dist2});
  expect(newPosCalculated.lat).toBeCloseTo(newPos.lat);
  expect(newPosCalculated.lng).toEqual(newPos.lng);

  newPos = {lat: -20, lng: 20};
  newPosCalculated = latLngPlusVector(initialPos, {u: dist1, v: -dist2});
  expect(newPosCalculated.lat).toBeCloseTo(newPos.lat);
  expect(newPosCalculated.lng).toBeCloseTo(newPos.lng);
});
