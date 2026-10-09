import calendar
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Any, Tuple, Optional
from app.models import (
    Case, 
    Agreement, 
    PaymentPlanItem, 
    Payment, 
    CalculationRecord,
    PaymentCheckpoint,
    InterestRateTranche,
    CurrencyGainLossItem
)
from app.schemas import (
    CalculationBreakdown, 
    GainsAndLossesBreakdown, 
    PeriodDefaultImpact,
    MonthlyLedgerRow,
    MonthlyLedgerResponse,
    SettlementEvaluationResponse,
    PaymentCheckpointResponse,
    CurrencyGainLossResponse,
    CurrencyGainLossItemResponse
)

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
    total_assigned = base_amount * instalments_count
    diff = round(original_amount - total_assigned, 2)

    items = []
    current_due = start_date

    for i in range(1, instalments_count + 1):
        amt = base_amount
        if i == instalments_count:
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
    Allocates payments sequentially to instalment items and evaluates status.
    """
    if eval_date is None:
        eval_date = date.today()

    sorted_payments = sorted(payments, key=lambda p: p.payment_date)
    total_paid_pool = sum(p.amount for p in sorted_payments)
    
    sorted_items = sorted(items, key=lambda x: x.instalment_number)

    remaining_pool = total_paid_pool
    overall_status = "active"
    has_defaulted = False
    has_overdue = False

    for item in sorted_items:
        due = item.due_date
        amt_due = item.amount_due

        if remaining_pool >= amt_due:
            item.amount_paid = amt_due
            item.status = "paid"
            remaining_pool = round(remaining_pool - amt_due, 2)
            last_pmt = [p for p in sorted_payments if p.payment_date <= due]
            item.paid_date = last_pmt[-1].payment_date if last_pmt else due
        elif remaining_pool > 0:
            item.amount_paid = round(remaining_pool, 2)
            remaining_pool = 0.0
            
            grace_deadline = due + timedelta(days=grace_period_days)
            if eval_date > grace_deadline:
                item.status = "defaulted"
                has_defaulted = True
            elif eval_date > due:
                item.status = "overdue"
                has_overdue = True
            else:
                item.status = "partially_paid"
        else:
            item.amount_paid = 0.0
            grace_deadline = due + timedelta(days=grace_period_days)
            if eval_date > grace_deadline:
                item.status = "defaulted"
                has_defaulted = True
            elif eval_date > due:
                item.status = "overdue"
                has_overdue = True
            else:
                item.status = "upcoming"

    all_paid = all(it.status == "paid" for it in sorted_items) and len(sorted_items) > 0
    if all_paid:
        overall_status = "settled"
    elif has_defaulted:
        overall_status = "defaulted"
    elif has_overdue:
        overall_status = "overdue"
    else:
        overall_status = "active"

    return overall_status, sorted_items

def calculate_outstanding_amount(
    case: Case,
    agreement: Agreement,
    items: List[PaymentPlanItem],
    payments: List[Payment],
    calc_date: date = None
) -> CalculationBreakdown:
    """
    Deterministic mathematical engine calculating:
    Original Debt - Payments Made = Outstanding Principal + Accrued Interest + Default Penalties = Current Amount Owed.
    """
    if calc_date is None:
        calc_date = date.today()

    logs = []
    orig_amt = round(agreement.original_amount, 2)
    total_paid = round(sum(p.amount for p in payments), 2)
    outstanding_principal = round(max(0.0, orig_amt - total_paid), 2)

    logs.append(f"1. Original Agreed Debt: {agreement.currency} {orig_amt:,.2f}")
    logs.append(f"2. Total Recorded Payments: {agreement.currency} {total_paid:,.2f}")
    logs.append(f"3. Outstanding Principal Balance: {agreement.currency} {outstanding_principal:,.2f}")

    start = agreement.start_date
    interest_rate_annual = agreement.interest_rate
    accrued_interest = 0.0

    if interest_rate_annual > 0 and outstanding_principal > 0:
        days_elapsed = max(0, (calc_date - start).days)
        year_fraction = days_elapsed / 365.0
        accrued_interest = round(outstanding_principal * (interest_rate_annual / 100.0) * year_fraction, 2)
        logs.append(
            f"4. Contract Interest Accrual: {agreement.currency} {accrued_interest:,.2f} "
            f"({interest_rate_annual}% p.a. over {days_elapsed} days on balance {agreement.currency} {outstanding_principal:,.2f})"
        )
    else:
        logs.append("4. Contract Interest Accrual: 0.00 (No interest applicable or balance cleared)")

    default_penalties = 0.0
    pen_rate = agreement.penalty_rate_or_fixed
    pen_type = agreement.penalty_type
    grace_days = agreement.grace_period_days

    for item in items:
        if item.status == "defaulted":
            unpaid_instalment = round(item.amount_due - item.amount_paid, 2)
            if unpaid_instalment <= 0:
                continue

            if pen_type == "percentage":
                inst_pen = round(unpaid_instalment * (pen_rate / 100.0), 2)
                default_penalties = round(default_penalties + inst_pen, 2)
                logs.append(
                    f"5. Default Penalty (Instalment #{item.instalment_number}): {agreement.currency} {inst_pen:,.2f} "
                    f"({pen_rate}% on arrears {agreement.currency} {unpaid_instalment:,.2f})"
                )
            elif pen_type == "fixed_fee":
                default_penalties = round(default_penalties + pen_rate, 2)
                logs.append(
                    f"5. Default Penalty (Instalment #{item.instalment_number}): Fixed fee of {agreement.currency} {pen_rate:,.2f}"
                )
            elif pen_type == "per_day":
                grace_limit = item.due_date + timedelta(days=grace_days)
                days_over_grace = max(0, (calc_date - grace_limit).days)
                inst_pen = round(days_over_grace * pen_rate, 2)
                default_penalties = round(default_penalties + inst_pen, 2)
                logs.append(
                    f"5. Default Penalty (Instalment #{item.instalment_number}): {agreement.currency} {inst_pen:,.2f} "
                    f"({days_over_grace} days overdue post-grace at {agreement.currency} {pen_rate}/day)"
                )

    if default_penalties == 0.0:
        logs.append("5. Default Penalties: 0.00 (No defaulted arrears triggered)")

    total_owed = round(outstanding_principal + accrued_interest + default_penalties, 2)
    logs.append(
        f"6. Total Current Amount Owed: {agreement.currency} {total_owed:,.2f} "
        f"(= Principal {outstanding_principal:,.2f} + Interest {accrued_interest:,.2f} + Penalties {default_penalties:,.2f})"
    )

    if agreement.exchange_rate and agreement.exchange_rate != 1.0 and agreement.target_currency:
        converted_total = round(total_owed * agreement.exchange_rate, 2)
        logs.append(
            f"7. Currency Conversion Audit: {agreement.currency} {total_owed:,.2f} @ {agreement.exchange_rate} = "
            f"{agreement.target_currency} {converted_total:,.2f}"
        )
        total_owed = converted_total

    return CalculationBreakdown(
        original_amount=orig_amt,
        total_paid=total_paid,
        outstanding_principal=outstanding_principal,
        accrued_interest=accrued_interest,
        default_interest_or_penalty=default_penalties,
        exchange_rate=agreement.exchange_rate or 1.0,
        currency=agreement.currency,
        target_currency=agreement.target_currency,
        total_amount_owed=total_owed,
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
            
        period_interest = 0.0
        if agreement.interest_rate > 0 and shortfall > 0 and days_overdue > 0:
            period_interest = round(
                shortfall * (agreement.interest_rate / 100.0) * (days_overdue / 365.0),
                2
            )
            
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

# =========================================================================
# ACCRUE CORE FINANCIAL MODULES (As Seen In Reference Screenshots)
# =========================================================================

def generate_monthly_ledger(
    case: Case,
    tranches: List[InterestRateTranche],
    payments: List[Payment],
    as_of_date: Optional[date] = None
) -> MonthlyLedgerResponse:
    """
    Generates exact month-by-month financial ledger (Image 1):
    Columns: # | Period | Days | All-in rate | Balance | Payment | Interest due | Cumulative interest.
    Formula: Balance * Rate * (Days / 360).
    """
    if as_of_date is None:
        as_of_date = date.today()

    judgment_date = case.judgment_date or (case.created_at.date() if case.created_at else date(2018, 1, 1))
    cost_awarded = round(case.cost_awarded or 0.0, 2)
    
    agr = case.agreements[0] if getattr(case, 'agreements', None) and len(case.agreements) > 0 else None
    if agr:
        debt_principal = agr.original_amount
    else:
        debt_principal = case.settlement_total or 0.0
    
    opening_balance = round(debt_principal + cost_awarded, 2)
    currency = case.currency or "GHS"
    interest_method = case.interest_method or "simple_30_360"
    
    sorted_tranches = sorted(tranches, key=lambda t: t.effective_from)
    sorted_payments = sorted(payments, key=lambda p: p.payment_date)

    rows: List[MonthlyLedgerRow] = []
    
    current_period_start = judgment_date
    current_balance = opening_balance
    cumulative_interest = 0.0
    total_paid = 0.0
    index = 1
    
    anchor_day = judgment_date.day
    while current_period_start < as_of_date:
        next_m = current_period_start.month + 1 if current_period_start.month < 12 else 1
        next_y = current_period_start.year if current_period_start.month < 12 else current_period_start.year + 1
        max_days_next = calendar.monthrange(next_y, next_m)[1]
        curr_max_days = calendar.monthrange(current_period_start.year, current_period_start.month)[1]

        if current_period_start.day == curr_max_days or anchor_day >= 28:
            next_month_date = date(next_y, next_m, max_days_next)
        else:
            next_month_date = date(next_y, next_m, min(anchor_day, max_days_next))

        period_end = min(next_month_date, as_of_date)
        days = (period_end - current_period_start).days
        if days <= 0:
            break
            
        applicable_tranche = None
        for t in sorted_tranches:
            if t.effective_from <= current_period_start:
                applicable_tranche = t
            else:
                break
                
        all_in_rate = applicable_tranche.all_in_rate if applicable_tranche else (agr.interest_rate if agr else 16.20)
        
        period_payment_amt = 0.0
        for p in sorted_payments:
            if current_period_start <= p.payment_date < period_end:
                period_payment_amt += p.amount
                
        period_payment_amt = round(period_payment_amt, 2)
        total_paid = round(total_paid + period_payment_amt, 2)
        
        # Interest due matching Image 1:
        # Days / 360 day-count convention
        if interest_method == "simple_30_360":
            interest_due = round(current_balance * (all_in_rate / 100.0) * (days / 360.0), 2)
        elif interest_method == "compound":
            interest_due = round(current_balance * ((1 + (all_in_rate / 100.0) / 12.0) - 1), 2)
        else: # simple_actual_365
            interest_due = round(current_balance * (all_in_rate / 100.0) * (days / 365.0), 2)
            
        cumulative_interest = round(cumulative_interest + interest_due, 2)
        
        period_str = f"{current_period_start.strftime('%d %b %Y')} - {period_end.strftime('%d %b %Y')}"
        rows.append(MonthlyLedgerRow(
            index=index,
            period=period_str,
            days=days,
            all_in_rate=round(all_in_rate, 2),
            balance=current_balance,
            payment=period_payment_amt if period_payment_amt > 0 else None,
            interest_due=interest_due,
            cumulative_interest=cumulative_interest
        ))
        
        current_balance = round(max(0.0, current_balance - period_payment_amt), 2)
        current_period_start = period_end
        index += 1

    total_amount_owed = round(current_balance + cumulative_interest, 2)

    return MonthlyLedgerResponse(
        currency=currency,
        judgment_debt=debt_principal,
        judgment_date=judgment_date.strftime("%d %b %Y"),
        cost_awarded=cost_awarded,
        interest_method="Simple" if "simple" in interest_method else "Compound",
        as_of_date=as_of_date.strftime("%d %b %Y"),
        current_balance=current_balance,
        total_cumulative_interest=cumulative_interest,
        total_paid=total_paid,
        total_amount_owed=total_amount_owed,
        rows=rows
    )

def evaluate_settlement_checkpoints(
    case: Case,
    checkpoints: List[PaymentCheckpoint],
    payments: List[Payment],
    as_of_date: Optional[date] = None
) -> SettlementEvaluationResponse:
    """
    Evaluates cumulative checkpoints for settlement accounts (Image 2 & Image 5).
    Detects breach when cumulative payments < cumulative required by checkpoint date.
    Triggers SETTLEMENT BREACHED and calculates full reinstatement debt + interest.
    """
    if as_of_date is None:
        as_of_date = date.today()

    agr = case.agreements[0] if getattr(case, 'agreements', None) and len(case.agreements) > 0 else None
    settlement_total = round(case.settlement_total or (agr.original_amount if agr else 0.0), 2)
    reinstatement_amount = round(case.reinstatement_amount or settlement_total, 2)
    reinstatement_rate = round(case.reinstatement_interest_rate or 12.0, 2)
    
    sorted_cps = sorted(checkpoints, key=lambda c: (c.due_date, c.checkpoint_number))
    sorted_payments = sorted(payments, key=lambda p: p.payment_date)
    
    total_paid_as_of = round(sum(p.amount for p in sorted_payments if p.payment_date <= as_of_date), 2)

    cp_responses: List[PaymentCheckpointResponse] = []
    
    is_breached = False
    breached_checkpoint = None
    
    for cp in sorted_cps:
        paid_by_then = round(sum(p.amount for p in sorted_payments if p.payment_date <= cp.due_date), 2)
        
        if paid_by_then >= cp.cumulative_required:
            status = "met"
        elif as_of_date > cp.due_date:
            status = "missed"
            if not is_breached:
                is_breached = True
                breached_checkpoint = cp
        else:
            status = "not_due"

        cp_responses.append(PaymentCheckpointResponse(
            id=cp.id,
            case_id=cp.case_id,
            checkpoint_number=cp.checkpoint_number,
            due_date=cp.due_date.strftime("%d %b %Y") if hasattr(cp.due_date, 'strftime') else str(cp.due_date),
            cumulative_required=round(cp.cumulative_required, 2),
            amount_required=round(cp.amount_required, 2),
            actually_paid_by_then=paid_by_then,
            status=status,
            notes=cp.notes
        ))

    if is_breached and breached_checkpoint:
        needed_amt = breached_checkpoint.cumulative_required
        needed_date = breached_checkpoint.due_date.strftime("%d %b %Y")
        status_banner = "SETTLEMENT BREACHED"
        status_message = (
            f"Cumulative payments fell short of what was required by {needed_date} "
            f"(needed {case.currency} {needed_amt:,.2f}). Under the settlement's own terms, the full reinstatement figure now applies."
        )
        
        accrual_start = case.interest_accrual_start_date or breached_checkpoint.due_date
        unpaid_reinstatement_principal = round(max(0.0, reinstatement_amount - total_paid_as_of), 2)
        days_accruing = max(0, (as_of_date - accrual_start).days) if as_of_date > accrual_start else 0
        reinstatement_interest = round(unpaid_reinstatement_principal * (reinstatement_rate / 100.0) * (days_accruing / 365.0), 2)
        reinstated_amount_due = round(unpaid_reinstatement_principal + reinstatement_interest, 2)
        
        remaining_under_settlement = None
        next_target = None
        next_target_date = None
    else:
        if total_paid_as_of >= settlement_total and settlement_total > 0:
            status_banner = "FULLY SETTLED"
            status_message = "All settlement obligations have been satisfied in full."
            remaining_under_settlement = 0.0
            next_target = None
            next_target_date = None
        else:
            status_banner = "ON TRACK"
            remaining_under_settlement = round(max(0.0, settlement_total - total_paid_as_of), 2)
            next_cp = next((cp for cp in cp_responses if cp.status == "not_due"), None)
            if next_cp:
                next_target = next_cp.cumulative_required
                next_target_date = next_cp.due_date
                status_message = f"All schedule checkpoints met so far. Next: {case.currency} {next_target:,.2f} cumulative by {next_target_date}."
            else:
                status_message = "All schedule checkpoints met so far."
                next_target = None
                next_target_date = None
        reinstated_amount_due = None

    return SettlementEvaluationResponse(
        is_breached=is_breached,
        status=status_banner,
        status_message=status_message,
        settlement_total=settlement_total,
        reinstatement_amount=reinstatement_amount,
        reinstatement_interest_rate=reinstatement_rate,
        interest_accrual_start_date=case.interest_accrual_start_date.strftime("%d %b %Y") if case.interest_accrual_start_date else None,
        as_of_date=as_of_date.strftime("%d/%m/%Y"),
        total_paid=total_paid_as_of,
        reinstated_amount_due=reinstated_amount_due,
        remaining_under_settlement=remaining_under_settlement,
        next_checkpoint_target=next_target,
        next_checkpoint_date=next_target_date,
        checkpoints=cp_responses
    )

def calculate_fx_gain_loss(
    case: Case,
    fx_items: List[CurrencyGainLossItem]
) -> CurrencyGainLossResponse:
    """
    Calculates currency conversion gains/losses on payments (Image 4):
    Compares each payment's actual conversion against what it would have been if paid on the date originally due.
    Formula: (due_date_rate - actual_payment_rate) * amount_contract_curr.
    """
    local_currency = "GHS"
    contract_currency = case.currency or "USD"
    
    item_responses: List[CurrencyGainLossItemResponse] = []
    total_impact = 0.0
    
    sorted_items = sorted(fx_items, key=lambda x: x.obligation_due_date)
    for it in sorted_items:
        impact = round((it.due_date_rate - it.actual_payment_rate) * it.amount_contract_curr, 2)
        total_impact = round(total_impact + impact, 2)
        local_curr = it.local_currency or "GHS"
        local_currency = local_curr
        
        item_responses.append(CurrencyGainLossItemResponse(
            id=it.id,
            case_id=it.case_id,
            obligation_due_date=it.obligation_due_date.strftime("%d %b %Y") if hasattr(it.obligation_due_date, 'strftime') else str(it.obligation_due_date),
            amount_contract_curr=round(it.amount_contract_curr, 2),
            payment_date=it.payment_date.strftime("%d %b %Y") if hasattr(it.payment_date, 'strftime') else str(it.payment_date),
            due_date_rate=round(it.due_date_rate, 4),
            actual_payment_rate=round(it.actual_payment_rate, 4),
            local_currency_impact=impact,
            local_currency=local_curr,
            notes=it.notes
        ))
        
    return CurrencyGainLossResponse(
        total_currency_impact=total_impact,
        local_currency=local_currency,
        contract_currency=contract_currency,
        items=item_responses
    )
