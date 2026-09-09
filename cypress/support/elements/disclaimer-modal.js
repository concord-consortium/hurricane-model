export class DisclaimerModal {
  getModal() {
    return cy.get(`[data-test="disclaimer-modal"]`);
  }

  getAboutModal() {
    return cy.get(`[data-test="about-storm-explorer"]`);
  }

  getGotItButton() {
    return cy.get(`[data-test="disclaimer-got-it-button"]`);
  }

  getKnowMoreButton() {
    return cy.get(`[data-test="disclaimer-more-info-button"]`);
  }

  getBackButton() {
    return cy.get(`[data-test="about-storm-explorer-back-button"]`);
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
