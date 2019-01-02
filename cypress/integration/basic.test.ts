context("Test the Hurricane Model app", () => {
  beforeEach(() => {
    cy.visit("");
  });

  it("renders Leaflet map", () => {
    cy.get(".app--app--__hurricane-model-v1__").get(".leaflet-container").should('be.visible') ;
  });
});
