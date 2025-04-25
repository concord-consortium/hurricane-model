context("Test the Hurricane Model app", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("renders Leaflet map", () => {
    cy.get(".app--app--__hurr-v1__").get(".leaflet-container").should("be.visible") ;
  });

  it("lets user change start location", () => {
    // defaults to Atlantic
    cy.get('[data-test="start-location-container"]').contains("Atlantic");
    // can change to Gulf
    cy.get('[data-test="start-location-button"]')
      .click()
      .then(() => {
        cy.get('[data-test="start-location-item-gulf"]')
          .click()
          .then(() => {
            cy.get('[data-test="start-location-container"]').contains("Gulf");
          });
      });
    // can change to Atlantic
    cy.get('[data-test="start-location-button"]')
      .click()
      .then(() => {
        cy.get('[data-test="start-location-item-atlantic"]')
          .click()
          .then(() => {
            cy.get('[data-test="start-location-container"]').contains("Atlantic");
          });
      });
  });

  it("lets user change season", () => {
    // defaults to Fall
    cy.get('[data-test="season-container"]').contains("Fall");
    // can change to Winter
    cy.get('[data-test="season-button"]')
      .click()
      .then(() => {
        cy.get('[data-test="season-item-winter"]')
          .click()
          .then(() => {
            cy.get('[data-test="season-container"]').contains("Winter");
          });
      });
    // can change to Spring
    cy.get('[data-test="season-button"]')
      .click()
      .then(() => {
        cy.get('[data-test="season-item-spring"]')
          .click()
          .then(() => {
            cy.get('[data-test="season-container"]').contains("Spring");
          });
      });
  });

  it("lets user start and stop the model", () => {
    // cy.window().then((win: any) => {
      cy.window().then((win) => {
      const oldHurrLng = win.stores.simulation.hurricane.center.lng;
      cy.get('[data-test="start-button"]').should("be.visible");
      cy.get('[data-test="start-button"]').click();
      cy.wait(500).then(() => {
        const newHurrLng = win.stores.simulation.hurricane.center.lng;
        // Wind always goes from east to west.
        expect(newHurrLng).to.be.below(oldHurrLng);
        cy.get('[data-test="start-button"]').click();
      });
    });
  });

  it("colorblind friendly SST", () => {
    cy.get(".map-tab--mapTabImage--__hurr-v1__.map-tab--impactMaps--__hurr-v1__")
      .click()
      .then(() => {
        cy.get(".sst-key--checkbox--__hurr-v1__ .MuiIconButton-label")
          .click()
          .then(() => {
            cy.get('[src="dd7d513dc937501a59bcfe0b12d93fe3.png"]').should("be.visible");
          });
      });

  });
});
