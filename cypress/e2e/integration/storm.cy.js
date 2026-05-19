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
    const section1 = "storm-location";
    const section2 = "storm-category";
    const sections = [section1, section2, "season", "sea-surface-temperatures", "pressure-systems"];
    bottomBar.stormSetupButton().contains("Storm Setup");
    setupPanel.confirmClosed();
    bottomBar.stormSetupButton().click();
    setupPanel.confirmOpen();

    cy.log("All sections have buttons and start closed");
    sections.forEach(section => {
      setupPanel.getSectionButton(section).should("exist");
      setupPanel.confirmSectionClosed(section);
    })

    cy.log("Pressing a button opens and closes the section");
    setupPanel.getSectionButton(section1).click();
    setupPanel.confirmSectionOpen(section1);
    setupPanel.getSectionButton(section1).click();
    setupPanel.confirmSectionClosed(section1);

    cy.log("Opening a new section closes the old section");
    setupPanel.getSectionButton(section1).click();
    setupPanel.confirmSectionOpen(section1);
    setupPanel.confirmSectionClosed(section2);
    setupPanel.getSectionButton(section2).click();
    setupPanel.confirmSectionOpen(section2);
    setupPanel.confirmSectionClosed(section1);

    cy.log("Setup button closes panel");
    bottomBar.stormSetupButton().click();
    setupPanel.confirmClosed();

    cy.log("X button closes panel");
    bottomBar.stormSetupButton().click();
    setupPanel.confirmOpen();
    setupPanel.getCloseButton().click();
    setupPanel.confirmClosed();
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
});
