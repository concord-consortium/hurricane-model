context("Pressure System", () => {
  beforeEach(() => {
    cy.visit("");
    cy.window().then((win: any) => {
      // Limit number of pressure systems to 1.
      win.simulation.pressureSystems.length = 1;
    })
  });

  it("can have strength adjusted by slider", () => {
    cy.window().then((win: any) => {
      const oldStrength = win.simulation.pressureSystems[0].strength;
      cy.get("div[role='slider'] button").first()
        .trigger('mousedown', { which: 1 });
      cy.get(".leaflet-container")
        // move slider up
        .trigger('mousemove', { pageY: 0, clientY: 0 })
        .trigger('mouseup', { force: true })
        .then(() => {
          expect(win.simulation.pressureSystems[0].strength).to.not.eql(oldStrength);
        });
    });
  });
});
