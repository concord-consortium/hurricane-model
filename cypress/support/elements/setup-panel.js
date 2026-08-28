export class SetupPanel {
  getStormSetupTab() {
    return cy.get(`[data-test="tab-setup"]`);
  }

  confirmTabBehindPanel() {
    this.getStormSetupTab().find(".tab--active--__hurr-v1__").should("exist");
  }

  confirmTabVisible() {
    this.getStormSetupTab().find(".tab--active--__hurr-v1__").should("not.exist");
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
