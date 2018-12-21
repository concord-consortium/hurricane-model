context("Test the overall app", () => {
  beforeEach(() => {
    cy.visit("");
  });

  describe("Desktop functionalities", () => {
    it("renders with text", () => {
      cy.get(".app--app--__hurricane-model-v1__").should("have.text", "Hello World");
    });
  });
});
