context("Pressure System", () => {
  it("can have strength adjusted by slider", () => {
    //cy.visit("/");
    cy.visit(Cypress.config('baseUrl'));
    cy.window().then((win: any) => {
      // Limit number of pressure systems to 1.
      win.stores.simulation.pressureSystems.length = 1;

      const oldStrength = win.stores.simulation.pressureSystems[0].strength;
      cy.get("[data-test='pressure-system-slider'] svg").first()
        .trigger('mousedown', { which: 1 });
      cy.get(".leaflet-container")
        // move slider up
        .trigger('mousemove', { pageY: 0, clientY: 0 })
        .trigger('mouseup', { force: true })
        .then(() => {
          expect(win.stores.simulation.pressureSystems[0].strength).to.not.eql(oldStrength);
        });
    });
  });

  it("can be set using URL parameters", () => {
    const pressureSystems =[
      {
        type: "high",
        center: {lat: 10, lng: -20},
        strength: 5
      },
      {
        type: "low",
        center: {lat: 30, lng: -40},
        strength: 7
      }
    ];
    cy.visit(`/?pressureSystems=${encodeURIComponent(JSON.stringify(pressureSystems))}`);
    cy.window().then((win: any) => {
      expect(win.stores.simulation.pressureSystems.length).to.eql(pressureSystems.length);
      expect(win.stores.simulation.pressureSystems[0].type).to.eql("high");
      expect(win.stores.simulation.pressureSystems[0].center.lat).to.eql(10);
      expect(win.stores.simulation.pressureSystems[0].center.lng).to.eql(-20);
      expect(win.stores.simulation.pressureSystems[0].strength).to.eql(5);
      expect(win.stores.simulation.pressureSystems[1].type).to.eql("low");
      expect(win.stores.simulation.pressureSystems[1].center.lat).to.eql(30);
      expect(win.stores.simulation.pressureSystems[1].center.lng).to.eql(-40);
      expect(win.stores.simulation.pressureSystems[1].strength).to.eql(7);
      cy.get("[data-test='pressure-system-slider']").should('have.length', 2);
    });
  });
});
