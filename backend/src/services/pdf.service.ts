export const pdfService = {
  async generateInvoice(invoice: any, organization: any, client: any): Promise<Buffer> {
    // Stub implementation that satisfies the TS compile step
    return Buffer.from("PDF Content");
  }
};
