export function calculatePaymentSummary({ rentDue, depositDue, payments }) {
  let rentRemaining = Number(rentDue) || 0;
  let depositRemaining = Number(depositDue) || 0;

  let rentPaid = 0;
  let depositPaid = 0;

  for (const payment of payments) {
    let amount = Number(payment.amount) || 0;

    if (rentRemaining > 0) {
      const usedForRent = Math.min(amount, rentRemaining);
      rentPaid += usedForRent;
      rentRemaining -= usedForRent;
      amount -= usedForRent;
    }

    if (amount > 0 && depositRemaining > 0) {
      const usedForDeposit = Math.min(amount, depositRemaining);
      depositPaid += usedForDeposit;
      depositRemaining -= usedForDeposit;
      amount -= usedForDeposit;
    }
  }

  const totalPaid = rentPaid + depositPaid;
  const balance = rentRemaining + depositRemaining;

  return {
    rentPaid,
    depositPaid,
    rentRemaining,
    depositRemaining,
    totalPaid,
    balance,
    paymentStatus:
      balance === 0 ? "PAID" :
      totalPaid === 0 ? "UNPAID" :
      "PARTIAL"
  };
}
