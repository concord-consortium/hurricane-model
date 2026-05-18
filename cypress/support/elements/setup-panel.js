

export class SetupPanel {
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
}
