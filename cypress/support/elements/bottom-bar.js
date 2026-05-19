export class BottomBar {
  stormSetupButton() {
    return cy.get(`[data-test="storm-setup-button"]`);
  }

  startLocationButton() {
    return cy.get(`[data-test="start-location-button"]`);
  }

  checkStartLocation(location) {
    cy.get('[data-test="start-location-container"]').contains(location);
  }

  seasonButton() {
    return cy.get(`[data-test="season-button"]`);
  }

  checkSeason(season) {
    cy.get('[data-test="season-container"]').contains(season);
  }

  thermometerButton() {
    return cy.get('[data-test="temp-button"]');
  }

  startButton() {
    return cy.get('[data-test="start-button"]');
  }
}
