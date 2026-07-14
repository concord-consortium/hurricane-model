import { BottomBar } from "../../support/elements/bottom-bar";

const bottomBar = new BottomBar;

context("Test the Hurricane Model app", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("renders Leaflet map", () => {
    cy.get(".app--app--__hurr-v1__").get(".leaflet-container").should("be.visible") ;
  });

  it("lets user change start location", () => {
    // defaults to Atlantic
    bottomBar.checkStartLocation("Atlantic");
    // can change to Gulf
    bottomBar.startLocationButton()
      .click()
      .then(() => {
        cy.get('[data-test="start-location-item-gulf"]')
          .click()
          .then(() => {
            bottomBar.checkStartLocation("Gulf");
          });
      });
    // can change to Atlantic
    bottomBar.startLocationButton()
      .click()
      .then(() => {
        cy.get('[data-test="start-location-item-atlantic"]')
          .click()
          .then(() => {
            bottomBar.checkStartLocation("Atlantic");
          });
      });
  });

  it("lets user change season", () => {
    // defaults to Fall
    bottomBar.checkSeason("Fall");
    // can change to Winter
    bottomBar.seasonButton()
      .click()
      .then(() => {
        cy.get('[data-test="season-item-winter"]')
          .click()
          .then(() => {
            bottomBar.checkSeason("Winter");
          });
      });
    // can change to Spring
    bottomBar.seasonButton()
      .click()
      .then(() => {
        cy.get('[data-test="season-item-spring"]')
          .click()
          .then(() => {
            bottomBar.checkSeason("Spring");
          });
      });
  });

  it("lets user start and stop the model", () => {
    cy.window().then((win) => {
      const oldHurrLng = win.stores.simulation.hurricane.center.lng;
      bottomBar.startButton().should("be.visible");
      bottomBar.startButton().click();
      cy.wait(500).then(() => {
        const newHurrLng = win.stores.simulation.hurricane.center.lng;
        // Wind always goes from east to west.
        expect(newHurrLng).to.be.below(oldHurrLng);
        bottomBar.startButton().click();
      });
    });
  });

  it("colorblind friendly SST", () => {
    cy.get(".map-tab--mapTabImage--__hurr-v1__.map-tab--impactMaps--__hurr-v1__")
      .click()
      .then(() => {
        cy.get('.sst-key--checkbox--__hurr-v1__ input[type="checkbox"]')
          .click()
          .then(() => {
            cy.window().then((win) => {
              const { ui, simulation } = win.stores;
              expect(ui.sstOverlay.accessibleSSTScale).to.eq(true);
              const expectedUrl = ui.sstOverlay.getVisibleSeaSurfaceTempImgUrl(simulation.season);
              cy.get(`img[src="${expectedUrl}"]`).should("be.visible");
            });
          });
      });

  });
});
