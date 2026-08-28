export class SetupPanel {
  getStormSetupTab() {
    // Target the tab back rather than the wrapper: the wrapper inherits
    // pointer-events: none from the panel container, so Cypress refuses to click it.
    return cy.get(`[data-test="tab-setup"] .tab--tabBack--__hurr-v1__`);
  }

  confirmTabBehindPanel() {
    this.getStormSetupTab().should("have.class", "tab--active--__hurr-v1__");
  }

  confirmTabVisible() {
    this.getStormSetupTab().should("not.have.class", "tab--active--__hurr-v1__");
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
