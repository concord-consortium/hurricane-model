export class Simulation {
  pressureSystemIcons() {
    return cy.get(`[data-test="pressure-system-icon"]`);
  }

  pressureSystemIcon(index) {
    return this.pressureSystemIcons().eq(index);
  }

  pressureSystemIsDisabled(index) {
    this.pressureSystemIcon(index).should("have.class", "draggable-map-icon--disabled--__hurr-v1__");
  }

  pressureSystemIsEnabled(index) {
    this.pressureSystemIcon(index).should("not.have.class", "draggable-map-icon--disabled--__hurr-v1__");
  }

  pressureSystemIsDimmed(index) {
    this.pressureSystemIcon(index).should("have.class", "draggable-map-icon--dimmed--__hurr-v1__");
  }

  pressureSystemIsNotDimmed(index) {
    this.pressureSystemIcon(index).should("not.have.class", "draggable-map-icon--dimmed--__hurr-v1__");
  }

  hurricaneMarker() {
    return cy.get(`[data-test="hurricane-marker"]`);
  }

  hurricaneMarkerIsDisabled() {
    this.hurricaneMarker().should("have.class", "draggable-map-icon--disabled--__hurr-v1__");
  }

  hurricaneMarkerIsEnabled() {
    this.hurricaneMarker().should("not.have.class", "draggable-map-icon--disabled--__hurr-v1__");
  }

  hurricaneMarkerIsDimmed() {
    this.hurricaneMarker().should("have.class", "draggable-map-icon--dimmed--__hurr-v1__");
  }

  hurricaneMarkerIsNotDimmed() {
    this.hurricaneMarker().should("not.have.class", "draggable-map-icon--dimmed--__hurr-v1__");
  }
}