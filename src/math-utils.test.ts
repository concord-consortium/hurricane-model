import { latLngDistance, latLngPlusVector } from "./math-utils";

test("latLngDistance vs latLngPlusVector", () => {
  const initialPos = {lat: 0, lng: 0};
  let newPos = {lat: 0, lng: 20};
  const dist1 = latLngDistance(initialPos, newPos);
  let newPosCalculated = latLngPlusVector(initialPos, {u: dist1, v: 0});
  expect(newPosCalculated).toEqual(newPos);

  newPos = {lat: -20, lng: 0};
  const dist2 = latLngDistance(initialPos, newPos);
  newPosCalculated = latLngPlusVector(initialPos, {u: 0, v: -dist2});
  expect(newPosCalculated).toEqual(newPos);

  newPos = {lat: -20, lng: 20};
  newPosCalculated = latLngPlusVector(initialPos, {u: dist1, v: -dist2});
  expect(newPosCalculated).toEqual(newPos);
});
