from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Any, Tuple
from app.models import Case, Agreement, PaymentPlanItem, Payment, CalculationRecord
from app.schemas import CalculationBreakdown, GainsAndLossesBreakdown, PeriodDefaultImpact

def generate_schedule_items(
    original_amount: float,
    start_date: date,
    instalments_count: int,
    frequency: str
) -> List[Dict[str, Any]]:
    """
    Generates instalment due dates and exact amounts.
    Guarantees that the sum of instalment amounts equals the original amount to the exact cent.
    """
    if instalments_count <= 0:
        instalments_count = 1

    base_amount = round(original_amount / instalments_count, 2)
    # Total assigned so far
    total_assigned = base_amount * instalments_count
    diff = round(original_amount - total_assigned, 2)

    items = []
    current_due = start_date

    for i in range(1, instalments_count + 1):
        amt = base_amount
        if i == instalments_count:
            # Add any penny rounding difference to the last instalment
            amt = round(amt + diff, 2)

        items.append({
            "instalment_number": i,
            "due_date": current_due,
            "amount_due": amt,
            "amount_paid": 0.0,
            "status": "upcoming",
            "paid_date": None,
            "notes": None
        })

        # Calculate next due date
        if frequency == "weekly":
            current_due = current_due + timedelta(days=7)
        elif frequency == "biweekly":
            current_due = current_due + timedelta(days=14)
        elif frequency == "quarterly":
            current_due = current_due + relativedelta(months=3)
        elif frequency == "lump_sum":
            pass
        else: # monthly
            current_due = current_due + relativedelta(months=1)

    return items

def evaluate_schedule_and_defaults(
    items: List[PaymentPlanItem],
    payments: List[Payment],
    grace_period_days: int = 0,
    eval_date: date = None
) -> Tuple[str, List[PaymentPlanItem]]:
    """
    Allocates payments sequentially to instalment items and evaluates status:
    'upcoming', 'paid', 'partially_paid', 'overdue', 'defaulted'.
    Returns overall case status ('settled', 'defaulted', 'overdue', 'active').
    """
    if eval_date is None:
        eval_date = date.today()

    # Sort payments chronologically
    sorted_payments = sorted(payments, key=lambda p: p.payment_date)
    total_paid_pool = sum(p.amount for p in sorted_payments)
    
    # Also find last payment date
    last_payment_date = sorted_payments[-1].payment_date if sorted_payments else None

    remaining_cash = total_paid_pool

    # Allocate cash to items in order
    for item in sorted(items, key=lambda x: x.instalment_number):
        needed = item.amount_due
        allocated = min(remaining_cash, needed)
        item.amount_paid = round(allocated, 2)
        remaining_cash = round(remaining_cash - allocated, 2)

        grace_deadline = item.due_date + timedelta(days=grace_period_days)

        if item.amount_paid >= item.amount_due:
            item.status = "paid"
            item.paid_date = last_payment_date or item.due_date
        elif item.amount_paid > 0:
            if eval_date <= item.due_date:
                item.status = "partially_paid"
            elif item.due_date < eval_date <= grace_deadline:
                item.status = "overdue"
            else:
                item.status = "defaulted"
        else:
            if eval_date <= item.due_date:
                item.status = "upcoming"
            elif item.due_date < eval_date <= grace_deadline:
                item.status = "overdue"
            else:
                item.status = "defaulted"

    # Determine overall case status
    all_paid = all(item.status == "paid" for item in items)
    has_defaulted = any(item.status == "defaulted" for item in items)
    has_overdue = any(item.status == "overdue" for item in items)

    if all_paid:
        overall_status = "settled"
    elif has_defaulted:
        overall_status = "defaulted"
    elif has_overdue:
        overall_status = "overdue"
    else:
        overall_status = "active"

    return overall_status, items

def calculate_outstanding_amount(
    case: Case,
    agreement: Agreement,
    items: List[PaymentPlanItem],
    payments: List[Payment],
    calc_date: date = None
) -> CalculationBreakdown:
    """
    Deterministic calculation engine:
    Formula:
    1. Total Payments Made = Sum of all recorded payments
    2. Outstanding Principal = Original Amount - Total Payments Made
    3. Accrued Interest = Outstanding Principal * (interest_rate / 100) * (days_elapsed / 365)
    4. Default Penalties = Calculated according to agreement terms (fixed or percentage on arrears)
    5. Subtotal = Outstanding Principal + Accrued Interest + Penalties
    6. Currency Conversion = Subtotal * Exchange Rate (if applicable)
    """
    if calc_date is None:
        calc_date = date.today()

    logs = []
    
    # 1. Payments made
    total_paid = round(sum(p.amount for p in payments), 2)
    original_amount = round(agreement.original_amount, 2)
    outstanding_principal = round(max(0.0, original_amount - total_paid), 2)

    logs.append(f"Original Agreement Amount: {agreement.currency} {original_amount:,.2f}")
    logs.append(f"Less Total Payments Recorded ({len(payments)} payments): -{agreement.currency} {total_paid:,.2f}")
    logs.append(f"Outstanding Principal Balance: {agreement.currency} {outstanding_principal:,.2f}")

    # 2. Accrued Interest
    accrued_interest = 0.0
    if agreement.interest_rate > 0 and outstanding_principal > 0:
        start_date = agreement.start_date
        days_elapsed = max(0, (calc_date - start_date).days)
        # Standard annual interest calculation formula
        accrued_interest = round(outstanding_principal * (agreement.interest_rate / 100.0) * (days_elapsed / 365.0), 2)
        logs.append(
            f"Plus Accrued Interest ({agreement.interest_rate}% p.a. for {days_elapsed} days from {start_date} to {calc_date}): +{agreement.currency} {accrued_interest:,.2f}"
        )
    else:
        logs.append(f"Accrued Interest: +{agreement.currency} 0.00 (No interest applicable or principal cleared)")

    # 3. Default Penalties
    default_penalty = 0.0
    # Evaluate defaulted items
    defaulted_items = [item for item in items if item.status == "defaulted"]
    
    if defaulted_items and outstanding_principal > 0:
        overdue_arrears = round(sum(max(0.0, item.amount_due - item.amount_paid) for item in defaulted_items), 2)
        
        if agreement.penalty_type == "percentage" and agreement.penalty_rate_or_fixed > 0:
            default_penalty = round(overdue_arrears * (agreement.penalty_rate_or_fixed / 100.0), 2)
            logs.append(
                f"Plus Default Penalty ({agreement.penalty_rate_or_fixed}% on defaulted arrears of {agreement.currency} {overdue_arrears:,.2f}): +{agreement.currency} {default_penalty:,.2f}"
            )
        elif agreement.penalty_type == "fixed_fee" and agreement.penalty_rate_or_fixed > 0:
            default_penalty = round(agreement.penalty_rate_or_fixed, 2)
            logs.append(
                f"Plus Fixed Default Penalty Fee: +{agreement.currency} {default_penalty:,.2f}"
            )
        elif agreement.penalty_type == "per_day" and agreement.penalty_rate_or_fixed > 0:
            earliest_default_due = min(item.due_date for item in defaulted_items)
            days_late = max(0, (calc_date - earliest_default_due).days)
            default_penalty = round(days_late * agreement.penalty_rate_or_fixed, 2)
            logs.append(
                f"Plus Per-Day Default Penalty ({days_late} days late @ {agreement.currency} {agreement.penalty_rate_or_fixed}/day): +{agreement.currency} {default_penalty:,.2f}"
            )
        else:
            logs.append("Default Penalties: +0.00 (No penalty clause triggered)")
    else:
        logs.append("Default Penalties: +0.00 (No defaulted instalments)")

    # 4. Subtotal in original currency
    subtotal = round(outstanding_principal + accrued_interest + default_penalty, 2)
    logs.append(f"Subtotal Amount Owed in {agreement.currency}: {agreement.currency} {subtotal:,.2f}")

    # 5. Currency conversion
    exchange_rate = agreement.exchange_rate if agreement.exchange_rate and agreement.exchange_rate > 0 else 1.0
    target_currency = agreement.target_currency if agreement.target_currency else agreement.currency
    
    if target_currency != agreement.currency and exchange_rate != 1.0:
        total_amount_owed = round(subtotal * exchange_rate, 2)
        logs.append(
            f"Converted to {target_currency} using exchange rate 1 {agreement.currency} = {exchange_rate:.4f} {target_currency}: {target_currency} {total_amount_owed:,.2f}"
        )
    else:
        total_amount_owed = subtotal
        if exchange_rate != 1.0:
            logs.append(f"Exchange rate recorded for audit: 1.0000")

    logs.append(f"FINAL CURRENT AMOUNT OWED: {target_currency} {total_amount_owed:,.2f}")

    return CalculationBreakdown(
        original_amount=original_amount,
        total_paid=total_paid,
        outstanding_principal=outstanding_principal,
        accrued_interest=accrued_interest,
        default_interest_or_penalty=default_penalty,
        exchange_rate=exchange_rate,
        currency=agreement.currency,
        target_currency=target_currency,
        total_amount_owed=total_amount_owed,
        step_by_step_log=logs,
        calculation_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )

def calculate_gains_and_losses(
    case: Case,
    agreement: Agreement,
    items: List[PaymentPlanItem],
    payments: List[Payment],
    calc_date: date = None
) -> GainsAndLossesBreakdown:
    """
    Computes period-by-period default impacts, creditor cash flow losses,
    debtor default penalties, and accrued compensatory interest.
    """
    if calc_date is None:
        calc_date = date.today()

    currency = agreement.currency
    sorted_items = sorted(items, key=lambda x: x.instalment_number)
    
    total_agreed = round(agreement.original_amount, 2)
    total_paid_to_date = round(sum(p.amount for p in payments), 2)
    
    # Calculate expected cash flow to date (instalments due on or before calc_date)
    total_expected_to_date = round(
        sum(it.amount_due for it in sorted_items if it.due_date <= calc_date),
        2
    )
    
    cash_flow_shortfall = round(max(0.0, total_expected_to_date - total_paid_to_date), 2)
    unpaid_principal = round(max(0.0, total_agreed - total_paid_to_date), 2)

    periods_impact: List[PeriodDefaultImpact] = []
    
    total_period_interest = 0.0
    total_period_penalties = 0.0
    
    defaulted_count = 0
    overdue_count = 0
    settled_count = 0

    for it in sorted_items:
        due = it.due_date
        amt_due = round(it.amount_due, 2)
        amt_paid = round(it.amount_paid, 2)
        shortfall = round(max(0.0, amt_due - amt_paid), 2)
        
        is_past_due = calc_date > due
        grace_deadline = due + timedelta(days=agreement.grace_period_days)
        is_in_grace = is_past_due and calc_date <= grace_deadline
        is_defaulted = is_past_due and calc_date > grace_deadline and shortfall > 0
        
        days_overdue = max(0, (calc_date - due).days) if is_past_due and shortfall > 0 else 0
        
        if shortfall == 0 and amt_paid >= amt_due:
            settled_count += 1
        elif is_defaulted:
            defaulted_count += 1
        elif is_in_grace or (is_past_due and shortfall > 0):
            overdue_count += 1
            
        # Interest on period shortfall for days elapsed
        period_interest = 0.0
        if agreement.interest_rate > 0 and shortfall > 0 and days_overdue > 0:
            period_interest = round(
                shortfall * (agreement.interest_rate / 100.0) * (days_overdue / 365.0),
                2
            )
            
        # Penalty for period default
        period_penalty = 0.0
        if is_defaulted and shortfall > 0 and agreement.penalty_rate_or_fixed > 0:
            if agreement.penalty_type == "percentage":
                period_penalty = round(shortfall * (agreement.penalty_rate_or_fixed / 100.0), 2)
            elif agreement.penalty_type == "per_day":
                days_past_grace = max(0, (calc_date - grace_deadline).days)
                period_penalty = round(days_past_grace * agreement.penalty_rate_or_fixed, 2)
            elif agreement.penalty_type == "fixed_fee":
                period_penalty = round(agreement.penalty_rate_or_fixed, 2)

        period_creditor_gain = round(period_interest + period_penalty, 2)
        period_total_owed = round(shortfall + period_interest + period_penalty, 2)

        total_period_interest = round(total_period_interest + period_interest, 2)
        total_period_penalties = round(total_period_penalties + period_penalty, 2)

        periods_impact.append(
            PeriodDefaultImpact(
                instalment_number=it.instalment_number,
                due_date=str(it.due_date),
                amount_due=amt_due,
                amount_paid=amt_paid,
                shortfall=shortfall,
                days_overdue=days_overdue,
                is_defaulted=is_defaulted,
                status=it.status,
                period_interest=period_interest,
                period_penalty=period_penalty,
                period_creditor_gain=period_creditor_gain,
                period_total_owed=period_total_owed
            )
        )

    # Use overall engine calculations to guarantee full harmony
    overall_calc = calculate_outstanding_amount(case, agreement, sorted_items, payments, calc_date)
    final_interest = round(max(total_period_interest, overall_calc.accrued_interest), 2)
    final_penalties = round(max(total_period_penalties, overall_calc.default_interest_or_penalty), 2)
    total_creditor_gains = round(final_interest + final_penalties, 2)
    total_debtor_penalty_loss = total_creditor_gains
    total_current_owed = round(unpaid_principal + total_creditor_gains, 2)

    has_defaulted = defaulted_count > 0

    if has_defaulted:
        default_clause_status = f"DEFAULT ENFORCED: {defaulted_count} instalment(s) have defaulted beyond the {agreement.grace_period_days}-day grace period. {agreement.currency} {total_debtor_penalty_loss:,.2f} in avoidable default penalties & interest has been incurred by the debtor."
    elif overdue_count > 0:
        default_clause_status = f"WARNING: {overdue_count} instalment(s) currently overdue within the grace period. Prompt payment required before default penalty activates."
    elif settled_count == len(sorted_items) and len(sorted_items) > 0:
        default_clause_status = "FULLY SETTLED: All instalments have been paid in full without default penalty."
    else:
        default_clause_status = "UP TO DATE: All active instalments are current in accordance with agreed terms."

    return GainsAndLossesBreakdown(
        currency=currency,
        total_agreed=total_agreed,
        total_expected_to_date=total_expected_to_date,
        total_paid_to_date=total_paid_to_date,
        cash_flow_shortfall=cash_flow_shortfall,
        unpaid_principal=unpaid_principal,
        total_accrued_interest=final_interest,
        total_default_penalties=final_penalties,
        total_creditor_gains=total_creditor_gains,
        total_debtor_penalty_loss=total_debtor_penalty_loss,
        total_current_owed=total_current_owed,
        defaulted_periods_count=defaulted_count,
        overdue_periods_count=overdue_count,
        settled_periods_count=settled_count,
        has_defaulted=has_defaulted,
        default_clause_status=default_clause_status,
        evaluation_date=str(calc_date),
        periods=periods_impact
    )
