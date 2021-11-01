context("Test the Hurricane Image", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("hurricane image at bottom bar", () => {
    cy.get(".hurricane-image-toggle--hurricaneImageToggle--__hurr-v1__").should("be.visible") ;
  });


  it("lets user toggle hurricane image", () => {
    // default disabled
    cy.contains(".hurricane-image-toggle--hurricaneImageToggle--__hurr-v1__", "Hurricane Image");

    //verify hurricane icon displayed
    cy.get('[data-name="Hurricane Symbol"]').should("be.visible");

    // Enable hurricane image
    cy.get(".hurricane-image-toggle--toggleContainer--__hurr-v1__ .MuiIconButton-root").click();

    //verify hurricane image displayed
    cy.get(".hurricane-marker--hurricaneIcon--__hurr-v1__")
    .find('img').should("be.visible")
      });
  });
