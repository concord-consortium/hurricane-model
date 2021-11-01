context("Test the Thermometer Icon", () => {
  beforeEach(() => {
    cy.visit(Cypress.config('baseUrl'));
  });

  it("thermometer at bottom bar", () => {
    cy.get(".icon-button--iconButton--__hurr-v1__").should("be.visible");
  });

  it("thermometer enable after run", () => {
      cy.get('[data-test="start-button"]').should("be.visible");
      cy.get('[data-test="start-button"]').click();
      cy.wait(500).then(() => {
        cy.get('[data-test="start-button"]').click();

      });
      cy.get(".icon-button--iconButton--__hurr-v1__").should("be.visible");
    });

    it("thermometer disabled for other map types", () => {

      //check for precipitation map
      cy.get(".map-tab--mapTabImage--__hurr-v1__.map-tab--impactMaps--__hurr-v1__")
        .click()
        .then(() => {
          cy.get('[data-test="map-button-precipitation"]')
            .click()
            .then(() => {
              cy.get(".icon-button--disabled--__hurr-v1__").should("be.visible");
            });
        });

        //check for storm surge map
        cy.get(".map-tab--mapTabImage--__hurr-v1__.map-tab--impactMaps--__hurr-v1__")
          .click()
          .then(() => {
            cy.get('[data-test="map-button-stormSurge"]')
              .click()
              .then(() => {
                cy.get(".icon-button--disabled--__hurr-v1__").should("be.visible");
              });
          });

    });

    it("thermometer reading readout", () => {
        cy.get(".icon-button--iconButton--__hurr-v1__").click();
        cy.get(".category-number--categoryNumber--__hurr-v1__").click();
        cy.get(".thermometer-marker--thermometerReadout--__hurr-v1__").should("be.visible");
      });
  });
