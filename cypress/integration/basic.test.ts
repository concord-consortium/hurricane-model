context("Test the Hurricane Model app", () => {
  beforeEach(() => {
    //cy.visit("/");
    cy.visit(Cypress.config('baseUrl'));
  });

  it("renders Leaflet map", () => {
    cy.get(".app--app--__hurr-v1__").get(".leaflet-container").should("be.visible") ;
  });

  it("lets user change season", () => {
    // defaults to Fall
    cy.contains(".season-button--seasonSelect--__hurr-v1__", "Fall");
    // can change to Winter
    cy.get('[data-test="season-button"]')
      .click()
      .then(() => {
        cy.get('[data-test="season-item-winter"]')
          .click()
          .then(() => {
            cy.contains(".season-button--seasonSelect--__hurr-v1__", "Winter");
          });
      });
    // can change to Spring
    cy.get('[data-test="season-button"]')
      .click()
      .then(() => {
        cy.get('[data-test="season-item-spring"]')
          .click()
          .then(() => {
            cy.contains(".season-button--seasonSelect--__hurr-v1__", "Spring");
          });
      });
  });

  it("lets user start and stop the model", () => {
    cy.window().then((win: any) => {
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
        cy.get(".sst-key--checkbox--__hurr-v1__ .MuiSvgIcon-root")
          .click()
          .then(() => {
            cy.get('[src="dd7d513dc937501a59bcfe0b12d93fe3.png"]').should("be.visible");
          });
      });

  });
});
