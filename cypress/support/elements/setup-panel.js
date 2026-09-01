export class SetupPanel {
  getStormSetupTab() {
    // Target the tab back rather than the wrapper: the wrapper inherits
    // pointer-events: none from the panel container, so Cypress refuses to click it.
    return cy.get(`[data-test="tab-setup-back"]`);
  }

  confirmTabBehindPanel() {
    this.getStormSetupTab().should("have.attr", "data-active", "true");
  }

  confirmTabVisible() {
    this.getStormSetupTab().should("have.attr", "data-active", "false");
  }

  getPanel() {
    return cy.get(`[data-test="left-panel"]`);
  }

  confirmOpen() {
    this.getPanel().should("have.class", "left-panel--open--__hurr-v1__");
  }

  confirmClosed() {
    this.getPanel().should("not.have.class", "left-panel--open--__hurr-v1__");
  }

  getCloseButton() {
    return cy.get(`[data-test="left-panel-close-button"]`);
  }

  getSectionButton(section) {
    return cy.get(`[data-test="${section}-button"]`);
  }

  getSectionContent(section) {
    return cy.get(`[data-test="${section}-content"]`);
  }

  confirmSectionOpen(section) {
    this.getSectionContent(section).should("be.visible");
  }

  confirmSectionClosed(section) {
    this.getSectionContent(section).should("not.exist");
  }
}
