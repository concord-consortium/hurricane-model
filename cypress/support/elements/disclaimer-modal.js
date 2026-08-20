export class DisclaimerModal {
  getModal() {
    return cy.get(`[data-test="disclaimer-modal"]`);
  }

  getGotItButton() {
    return cy.get(`[data-test="disclaimer-got-it-button"]`);
  }

  confirmOpen() {
    this.getModal().should("be.visible");
  }

  confirmClosed() {
    this.getModal().should("not.exist");
  }

  checkMessage(message) {
    this.getModal().should("contain.text", message);
  }
}
