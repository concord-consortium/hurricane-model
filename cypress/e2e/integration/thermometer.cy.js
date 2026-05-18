import { BottomBar } from "../../support/elements/bottom-bar";

const bottomBar = new BottomBar;

context("Test the Thermometer Icon", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("thermometer at bottom bar", () => {
    bottomBar.thermometerButton().should("be.visible");
  });

  it("thermometer enable after run", () => {
    bottomBar.startButton().should("be.visible");
    bottomBar.startButton().click();
    cy.wait(500).then(() => {
      bottomBar.startButton().click();
    });
    bottomBar.thermometerButton().should("be.visible");
  });

  it("thermometer disabled for other map types", () => {

    //check for precipitation map
    cy.get(".map-tab--mapTabImage--__hurr-v1__.map-tab--impactMaps--__hurr-v1__")
      .click()
      .then(() => {
        cy.get('[data-test="map-button-precipitation"]')
          .click()
          .then(() => {
            bottomBar.thermometerButton().should('have.disabled');
          });
      });

      //check for storm surge map
      cy.get(".map-tab--mapTabImage--__hurr-v1__.map-tab--impactMaps--__hurr-v1__")
        .click()
        .then(() => {
          cy.get('[data-test="map-button-stormSurge"]')
            .click()
            .then(() => {
              bottomBar.thermometerButton().should('have.disabled');
            });
        });
  });

  it("thermometer reading readout", () => {
    bottomBar.thermometerButton().click();
    cy.get(".category-number--categoryNumber--__hurr-v1__").click();
    cy.get(".thermometer-marker--thermometerReadout--__hurr-v1__").should("be.visible");
  });
});
