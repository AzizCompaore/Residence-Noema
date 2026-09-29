import assert from 'node:assert/strict';
import { calculateFinancing, financingConfig } from '../frontend/src/services/financing';

const approximate = (actual: number, expected: number, tolerance = 0.01) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);
};

const baseInput = {
  downPayment: 0,
  primaryIncome: 1_000_000,
  additionalIncome: 0,
  coBorrowerIncome: 0,
  existingCreditPayments: 0,
  livingExpenses: 0,
  propertyCharges: 0
};

const expectedPayment = (principal: number) => {
  const monthlyRate = financingConfig.annualInterestRate / 12;
  const months = financingConfig.durationYears * 12;
  const growth = Math.pow(1 + monthlyRate, months);
  return principal * (monthlyRate * growth) / (growth - 1);
};

const t2 = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000 });
const t3 = calculateFinancing({ ...baseInput, propertyType: 't3', propertyPrice: 109_000_000 });

assert.equal(financingConfig.annualInterestRate, 0.08);
assert.equal(financingConfig.durationYears, 8);
assert.equal(financingConfig.maxDebtRatio, 0.35);
assert.equal(financingConfig.rentalOccupiedDays, 20);

// 1-2: amortization at 8% over 96 months for T2 and T3.
approximate(t2.financing.monthlyPayment, expectedPayment(59_000_000), 1);
approximate(t3.financing.monthlyPayment, expectedPayment(109_000_000), 1);

// Duration is flexible below the 8-year maximum and changes the payment.
const shortDuration = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, durationYears: 4 });
const overMaximumDuration = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, durationYears: 12 });
assert.equal(shortDuration.financing.durationYears, 4);
assert.equal(shortDuration.financing.totalMonths, 48);
assert.ok(shortDuration.financing.monthlyPayment > t2.financing.monthlyPayment);
assert.equal(overMaximumDuration.financing.durationYears, 8);

// 3: a larger down payment lowers the banking payment.
const highDownPayment = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, downPayment: 20_000_000 });
assert.ok(highDownPayment.financing.monthlyPayment < t2.financing.monthlyPayment);

// 4: rent never changes the banking payment.
const noRent = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, rentalIncomeRecognitionRate: 0 });
assert.equal(noRent.financing.monthlyPayment, t2.financing.monthlyPayment);

// 5-7: 100%, 70% and 0% rental recognition affect retained income only.
const fullRent = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, rentalIncomeRecognitionRate: 1 });
const partialRent = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, rentalIncomeRecognitionRate: 0.7 });
assert.equal(fullRent.financing.monthlyPayment, t2.financing.monthlyPayment);
approximate(fullRent.solvency.retainedIncome, 1_000_000 + 20 * 60 * 655.957 * 0.8);
approximate(partialRent.solvency.retainedIncome, 1_000_000 + 20 * 60 * 655.957 * 0.8 * 0.7);
approximate(noRent.solvency.retainedIncome, 1_000_000);

// 8: existing credit payments increase total commitments.
const withCredit = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, existingCreditPayments: 150_000 });
assert.equal(withCredit.solvency.totalCommitments, t2.financing.monthlyPayment + 150_000);

// 9: living expenses affect remaining income, not debt commitments.
const withLivingExpenses = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, livingExpenses: 250_000 });
assert.equal(withLivingExpenses.solvency.totalCommitments, t2.financing.monthlyPayment);
assert.equal(withLivingExpenses.solvency.remainingIncome, withLivingExpenses.solvency.retainedIncome - withLivingExpenses.solvency.totalCommitments - 250_000);

// 10-11: cash flow is separate from the unchanged banking payment.
const negativeCashFlow = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, downPayment: 0 });
const positiveCashFlow = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 10_000_000, downPayment: 9_000_000 });
assert.ok(negativeCashFlow.rental.cashFlow < 0);
assert.ok(positiveCashFlow.rental.cashFlow > 0);
assert.equal(negativeCashFlow.financing.monthlyPayment, t2.financing.monthlyPayment);

// 12-13: apport is bounded to the property price.
const paidCash = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, downPayment: 59_000_000 });
const overpaid = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, downPayment: 80_000_000 });
assert.equal(paidCash.financing.borrowedAmount, 0);
assert.equal(paidCash.financing.monthlyPayment, 0);
assert.equal(overpaid.financing.downPayment, 59_000_000);
assert.equal(overpaid.financing.borrowedAmount, 0);

// 14: zero income is safe and explicitly not evaluable.
const zeroIncome = calculateFinancing({ ...baseInput, propertyType: 't2', propertyPrice: 59_000_000, primaryIncome: 0, rentalIncomeRecognitionRate: 0 });
assert.equal(zeroIncome.solvency.debtRatio, 0);
assert.equal(zeroIncome.solvency.status, 'not_evaluable');

console.log('All financing tests passed.');
