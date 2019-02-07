context("Test the Hurricane Model app", () => {
  beforeEach(() => {
    cy.visit("");
  });

  it("renders Leaflet map", () => {
    cy.get(".app--app--__hurr-v1__").get(".leaflet-container").should("be.visible") ;
  });

  it("lets user change season", () => {
    cy.get('[data-test="season-select"]').should("be.visible");
    cy.get('[data-test="season-select"]').should("contain.text", "Fall");
    cy.get('[data-test="season-select"]').click();
    cy.get('[data-value="summer"]').should("be.visible");
    cy.get('[data-value="fall"]').should("be.visible");
    cy.get('[data-value="winter"]').should("be.visible");
    cy.get('[data-value="spring"]').should("be.visible");

    cy.get('[data-value="spring"]').click();
    cy.get('[data-value="fall"]').should("not.be.visible");
    cy.get('[data-test="season-select"]').should("not.contain.text", "Fall");
    cy.get('[data-test="season-select"]').should("contain.text", "Spring");
  });
});
