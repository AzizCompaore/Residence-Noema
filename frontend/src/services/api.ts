import { 
  ResidenceInfo, 
  Apartment, 
  ConstructionMilestone, 
  FAQItem, 
  LeadSubmission, 
  SimulationResult 
} from '../types';
import { calculateFinancing, financingConfig, FinancingPropertyType } from './financing';

export const API_BASE = '/api';

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

interface AuthResponse {
  success?: boolean;
  authenticated?: boolean;
  user?: AuthUser | null;
  error?: string;
  message?: string;
}

export function getCookie(name: string): string | undefined {
  return document.cookie.split('; ').find((cookie) => cookie.startsWith(`${name}=`))?.split('=').slice(1).join('=');
}

export async function ensureCsrfToken(): Promise<void> {
  await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' });
}

async function authRequest(path: string, options: RequestInit = {}): Promise<AuthResponse> {
  await ensureCsrfToken();
  const csrfToken = getCookie('csrftoken');
  const response = await fetch(`${API_BASE}/auth/${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Une erreur est survenue.');
  return payload;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/auth/me/`, { credentials: 'include' });
  const payload = await response.json() as AuthResponse;
  return payload.authenticated ? payload.user || null : null;
}

export async function loginUser(email: string, password: string, rememberMe: boolean): Promise<AuthUser> {
  const payload = await authRequest('login/', { method: 'POST', body: JSON.stringify({ email, password, remember_me: rememberMe }) });
  return payload.user as AuthUser;
}

export async function registerUser(payload: { first_name: string; last_name: string; email: string; password: string }): Promise<AuthUser> {
  const response = await authRequest('register/', { method: 'POST', body: JSON.stringify(payload) });
  return response.user as AuthUser;
}

export async function logoutUser(): Promise<void> {
  await authRequest('logout/', { method: 'POST' });
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await authRequest('password-reset/request/', { method: 'POST', body: JSON.stringify({ email }) });
  return response.message || 'Si cette adresse existe, un lien sera envoyé.';
}

export async function confirmPasswordReset(uid: string, token: string, password: string): Promise<void> {
  await authRequest('password-reset/confirm/', { method: 'POST', body: JSON.stringify({ uid, token, password }) });
}

export async function startGoogleLogin(): Promise<void> {
  await ensureCsrfToken();
  const response = await fetch(`${API_BASE}/auth/google/start/`, { credentials: 'include' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'La connexion Google est indisponible.');
  window.location.assign(payload.url);
}

export async function fetchResidence(): Promise<ResidenceInfo> {
  const res = await fetch(`${API_BASE}/residence`);
  if (!res.ok) throw new Error('Residence API unavailable');
  const data = await res.json();
  return data.data;
}

export async function fetchApartments(type?: string, status?: string): Promise<Apartment[]> {
  const params = new URLSearchParams();
  if (type && type !== 'all') params.append('type', type);
  if (status && status !== 'all') params.append('status', status);

  const res = await fetch(`${API_BASE}/apartments?${params.toString()}`);
  if (!res.ok) throw new Error('Apartments API unavailable');
  const data = await res.json();
  return data.data;
}

export async function fetchApartmentById(id: string): Promise<Apartment> {
  const res = await fetch(`${API_BASE}/apartments/${id}`);
  if (!res.ok) throw new Error('Apartment detail API unavailable');
  const data = await res.json();
  return data.data;
}

export async function fetchConstructionMilestones(): Promise<ConstructionMilestone[]> {
  const res = await fetch(`${API_BASE}/construction`);
  if (!res.ok) throw new Error('Construction API unavailable');
  const data = await res.json();
  return data.data;
}

export async function fetchFAQs(category?: string): Promise<FAQItem[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);

  const res = await fetch(`${API_BASE}/faq?${params.toString()}`);
  if (!res.ok) throw new Error('FAQ API unavailable');
  const data = await res.json();
  return data.data;
}

export async function calculateSimulation(payload: {
  apartment_id?: string;
  property_type?: FinancingPropertyType;
  apartment_price: number;
  down_payment: number;
  duration_years: number;
  monthly_net_income: number;
  existing_monthly_loans: number;
  additional_monthly_income?: number;
  co_borrower_monthly_income?: number;
  property_charges?: number;
  living_expenses?: number;
  rental_income_recognition_rate?: number;
}): Promise<{ data: SimulationResult; legal_disclaimer: string }> {
  const res = await fetch(`${API_BASE}/simulations/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const response = await res.json();
  const data = response.data as Partial<SimulationResult> | undefined;
  const hasCurrentRentalContract = data
    && Number.isFinite(Number(data.rental_owner_income))
    && Number.isFinite(Number(data.rental_cash_flow))
    && Number.isFinite(Number(data.rental_daily_rate_eur));

  if (data && hasCurrentRentalContract) {
    return response;
  }

  const fallback = calculateFinancing({
    propertyType: payload.property_type || (payload.apartment_id?.toLowerCase().includes('t3') ? 't3' : 't2'),
    propertyPrice: payload.apartment_price,
    downPayment: payload.down_payment,
    durationYears: payload.duration_years,
    primaryIncome: payload.monthly_net_income,
    additionalIncome: payload.additional_monthly_income,
    coBorrowerIncome: payload.co_borrower_monthly_income,
    existingCreditPayments: payload.existing_monthly_loans,
    propertyCharges: payload.property_charges,
    livingExpenses: payload.living_expenses,
    rentalIncomeRecognitionRate: payload.rental_income_recognition_rate
  });
  const { financing, rental, solvency } = fallback;
  const fallbackData: SimulationResult = {
    apartment_id: payload.apartment_id,
    apartment_price: financing.propertyPrice,
    down_payment: financing.downPayment,
    loan_amount: financing.borrowedAmount,
    duration_years: financing.durationYears,
    interest_rate: financing.annualInterestRate * 100,
    monthly_payment: financing.monthlyPayment,
    rental_occupied_days: rental.occupiedDays,
    rental_daily_rate_eur: rental.dailyRateEur,
    rental_gross_income_eur: rental.grossIncomeEur,
    rental_structure_share_eur: rental.structureShareEur,
    rental_owner_income_eur: rental.ownerIncomeEur,
    rental_owner_income: rental.ownerIncomeFcfa,
    rental_recognition_rate: rental.recognitionRate,
    rental_recognized_income: rental.recognizedIncomeFcfa,
    rental_property_charges: rental.propertyCharges,
    rental_cash_flow: rental.cashFlow,
    rental_effort: rental.effort,
    personal_income: solvency.personalIncome,
    monthly_income: solvency.retainedIncome,
    existing_loans: solvency.existingCreditPayments,
    available_monthly_income: solvency.remainingIncome,
    recommended_monthly_budget: Math.round(solvency.retainedIncome * financingConfig.maxDebtRatio),
    loan_to_value_percent: financing.propertyPrice > 0 ? Math.round(financing.borrowedAmount / financing.propertyPrice * 100) : 0,
    debt_ratio_percent: Math.round(solvency.debtRatio * 10) / 10,
    debt_ratio_threshold: solvency.threshold,
    total_monthly_commitment: solvency.totalCommitments,
    minimum_income_required: solvency.minimumIncomeRequired,
    debt_ratio_gap: solvency.debtRatioGap,
    living_expenses: solvency.livingExpenses,
    remaining_income: solvency.remainingIncome,
    is_debt_ratio_healthy: solvency.status === 'within_threshold'
  };
  return { ...response, data: { ...fallbackData, apartment_ref: data?.apartment_ref } };
}

export async function submitLead(payload: LeadSubmission): Promise<{ success: boolean; message: string; data?: any }> {
  await ensureCsrfToken();
  const csrfToken = getCookie('csrftoken');
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}) },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function formatWithDots(amount: number): string {
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatFCFA(amount: number): string {
  return formatWithDots(amount) + ' FCFA';
}

export function formatEUR(fcfa: number): string {
  // Fixed standard parity 1 EUR = ~655.957 FCFA
  const eur = Math.round(fcfa / 655.957);
  return formatWithDots(eur) + ' €';
}
