import { BottomBar } from "../../support/elements/bottom-bar";
import { SetupPanel } from "../../support/elements/setup-panel";

const bottomBar = new BottomBar;
const setupPanel = new SetupPanel;

context("Test the Hurricane Model app", () => {
  beforeEach(() => {
    cy.visit("/?mode=storm");
  });

  it("renders Leaflet map", () => {
    cy.get(".app--app--__hurr-v1__").get(".leaflet-container").should("be.visible") ;
  });

  it("does not include start location or season buttons in the bottom bar", () => {
    bottomBar.startLocationButton().should("not.exist");
    bottomBar.seasonButton().should("not.exist");
  });

  it("setup panel opens, contains the right sections, and closes", () => {
    bottomBar.stormSetupButton().contains("Storm Setup");
    setupPanel.confirmClosed();
    bottomBar.stormSetupButton().click();
    setupPanel.confirmOpen();

    // setup button closes panel
    bottomBar.stormSetupButton().click();
    setupPanel.confirmClosed();

    // X button closes panel
    bottomBar.stormSetupButton().click();
    setupPanel.confirmOpen();
    setupPanel.getCloseButton().click();
    setupPanel.confirmClosed();
  });

  it("lets user start and stop the model", () => {
    // cy.window().then((win: any) => {
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
});
