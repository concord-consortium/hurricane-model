context("Test the Hurricane Model app", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("renders Leaflet map", () => {
    cy.get(".app--app--__hurr-v1__").get(".leaflet-container").should("be.visible") ;
  });

  it("lets user change season", () => {
    cy.contains(".season-button--seasonValue--__hurr-v1__", "fall");
    cy.get('[data-test="season-button"]').click();
    cy.contains(".season-button--seasonValue--__hurr-v1__", "winter");
    cy.get('[data-test="season-button"]').click();
    cy.contains(".season-button--seasonValue--__hurr-v1__", "spring");
    cy.get('[data-test="season-button"]').click();
    cy.contains(".season-button--seasonValue--__hurr-v1__", "summer");
    cy.get('[data-test="season-button"]').click();
    cy.contains(".season-button--seasonValue--__hurr-v1__", "fall");
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
});
