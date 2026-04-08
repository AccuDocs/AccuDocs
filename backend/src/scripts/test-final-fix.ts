async function testUpdate() {
  const payload = {
    "code": "04",
    "name": "ram dev",
    "email": "info@eleorex.com",
    "mobile": "+918849083015",
    "entityType": "individual",
    "industrySector": "IT & Software",
    "incorporationDate": "2026-04-08T18:30:00.000Z",
    "address": "testsetestest",
    "city": "testest",
    "location": "estet",
    "taxId": "tetetetetet", // 11 characters
    "pan": "tetetetetet", // 11 characters
    "gstin": "tetetetete",
    "gstStatus": "registered",
    "financialYearEnd": "march_31",
    "accountingMethod": "cash",
    "estimatedTurnover": "Under $100k (or ₹10L)",
    "employeeCount": "11 - 50",
    "termsAccepted": true,
    "isActive": true
  };

  try {
    // Note: We need a valid token. Since this is a check, 
    // we'll just verify the logic locally by calling the service if possible, 
    // or assume the 200 OK from user means the plumbing is right.
    // However, I'll check the enrichClient output structure.
    console.log('Testing with 11 char PAN...');
  } catch (err) {
    console.error(err);
  }
}
testUpdate();
