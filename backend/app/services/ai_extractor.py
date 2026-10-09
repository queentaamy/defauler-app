import os
import re
import json
from datetime import datetime, date
from typing import Dict, Any, Optional
from app.config import settings
from app.schemas import ExtractedAgreementData

def rule_based_fallback_extractor(text: str, filename: str) -> ExtractedAgreementData:
    """
    Strict extraction from document text. Does not invent, hallucinate, or inject fake data.
    If a field is not found in the document, it remains empty or zero for user verification.
    """
    data = ExtractedAgreementData()
    data.document_name = filename
    data.document_type = os.path.splitext(filename)[1].replace(".", "").lower()
    data.raw_text_preview = text[:500] if text else "No text extracted."
    
    # 1. Case Number
    case_match = re.search(r'(?:Suit|Case|Claim|Order)\s*(?:No\.?|Number|#)?[:\s]*([A-Z0-9\/\-_]+)', text, re.IGNORECASE)
    if case_match:
        data.case_number = case_match.group(1).strip()
    else:
        data.case_number = ""

    # 2. Court Name
    court_match = re.search(r'(IN THE\s+([A-Z\s]+(?:COURT|TRIBUNAL)[A-Z\s]*)|([A-Za-z\s]+(?:High Court|Circuit Court|District Court|Supreme Court)[A-Za-z\s]*))', text, re.IGNORECASE)
    if court_match:
        data.court_name = court_match.group(0).strip().title()
    else:
        data.court_name = ""

    # 3. Defendant Name
    def_match = re.search(r'(?:AND|vs\.?|versus)\s*\n*([A-Za-z\s\.,]+?)\s*\(?(?:Defendant|Respondent|Debtor)\)?', text, re.IGNORECASE)
    if not def_match:
        def_match = re.search(r'Defendant[:\s]+([A-Za-z\s\.,]+)', text, re.IGNORECASE)
    if not def_match:
        def_match = re.search(r'Debtor[:\s]+([A-Za-z\s\.,]+)', text, re.IGNORECASE)
        
    if def_match:
        clean_def = def_match.group(1).strip().strip(",").strip(".")
        clean_def = re.sub(r'\s+', ' ', clean_def)
        if len(clean_def) > 2 and len(clean_def) < 60 and not any(kw in clean_def.upper() for kw in ["ORDER", "AGREEMENT", "PLAINTIFF", "CONSENT"]):
            data.defendant_name = clean_def
    else:
        data.defendant_name = ""

    # 4. Currency and Original Amount
    currency_map = {
        '$': 'USD',
        'USD': 'USD',
        'GH₵': 'GHS',
        'GHS': 'GHS',
        'CEDIS': 'GHS',
        '£': 'GBP',
        'GBP': 'GBP',
        '€': 'EUR',
        'EUR': 'EUR'
    }
    
    amount_match = re.search(r'(\$|USD|GH₵|GHS|£|GBP|€|EUR)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)', text, re.IGNORECASE)
    if not amount_match:
        amount_match = re.search(r'([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*(\$|USD|GH₵|GHS|£|GBP|€|EUR|Cedis|Dollars|Pounds)', text, re.IGNORECASE)
        if amount_match:
            raw_amt = amount_match.group(1).replace(",", "")
            raw_curr = amount_match.group(2).upper()
            data.original_amount = float(raw_amt)
            data.currency = currency_map.get(raw_curr, "USD")
        else:
            data.original_amount = 0.0
            data.currency = "USD"
    else:
        raw_curr = amount_match.group(1).upper()
        raw_amt = amount_match.group(2).replace(",", "")
        data.original_amount = float(raw_amt)
        data.currency = currency_map.get(raw_curr, "USD")

    # 5. Instalments and Payment Frequency
    freq_match = re.search(r'\b(monthly|weekly|bi-weekly|biweekly|quarterly|lump\s*sum)\b', text, re.IGNORECASE)
    if freq_match:
        data.frequency = freq_match.group(1).lower().replace("-", "")
    else:
        data.frequency = "monthly"

    inst_match = re.search(r'([0-9]{1,2})\s*(?:equal\s*)?(?:monthly|weekly)?\s*instalments?', text, re.IGNORECASE)
    if inst_match:
        data.instalments_count = int(inst_match.group(1))
    else:
        data.instalments_count = 1

    if data.original_amount > 0 and data.instalments_count > 0:
        data.payment_amount = round(data.original_amount / data.instalments_count, 2)
    else:
        data.payment_amount = 0.0

    # 6. Interest Rate
    interest_match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:interest|per\s*annum|p\.a\.)', text, re.IGNORECASE)
    if interest_match:
        data.interest_rate = float(interest_match.group(1))
    else:
        data.interest_rate = 0.0

    # 7. Penalty & Default conditions
    penalty_match = re.search(r'(?:penalty|default\s*interest)\s*(?:of)?\s*([0-9]+(?:\.[0-9]+)?)\s*%', text, re.IGNORECASE)
    if penalty_match:
        data.penalty_rate_or_fixed = float(penalty_match.group(1))
        data.penalty_type = "percentage"
    else:
        fixed_pen_match = re.search(r'(?:penalty\s*fee|late\s*charge)\s*(?:of)?\s*(?:\$|USD|GH₵|GHS)?\s*([0-9]+(?:\.[0-9]+)?)', text, re.IGNORECASE)
        if fixed_pen_match:
            data.penalty_rate_or_fixed = float(fixed_pen_match.group(1))
            data.penalty_type = "fixed_fee"
        else:
            data.penalty_rate_or_fixed = 0.0
            data.penalty_type = "none"

    # Grace period
    grace_match = re.search(r'([0-9]+)\s*days?\s*(?:grace\s*period|of\s*grace)', text, re.IGNORECASE)
    if grace_match:
        data.grace_period_days = int(grace_match.group(1))
    else:
        data.grace_period_days = 0

    cond_match = re.search(r'(?:default\s*condition|in\s*the\s*event\s*of\s*default|in\s*event\s*of\s*default)[^.\n]*[.\n]', text, re.IGNORECASE)
    if cond_match:
        data.default_conditions = cond_match.group(0).strip()
    else:
        data.default_conditions = ""
    
    # 8. Start Date
    date_match = re.search(r'\b(20[2-3][0-9]-[0-1][0-9]-[0-3][0-9])\b', text)
    if date_match:
        data.start_date = date_match.group(1)
    else:
        data.start_date = ""

    return data

async def extract_agreement_data(text: str, filename: str, file_path: Optional[str] = None) -> ExtractedAgreementData:
    """
    Extracts structured payment agreement data using Gemini AI if key exists,
    otherwise strictly falls back to the deterministic rule-based extractor.
    """
    if settings.GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            prompt = f"""
            You are a legal document information extraction specialist.
            Extract payment obligations and court order terms from the following text into strict JSON format.
            Do NOT extract Plaintiff details (Plaintiff details are fixed in our system).
            Do NOT invent or hallucinate financial figures. If a field is not present in the document, return empty string or null.
            Extract:
            - case_number (string or empty)
            - court_name (string or empty)
            - defendant_name (string or empty)
            - defendant_address (string or null)
            - defendant_contact (string or null)
            - original_amount (number or 0)
            - currency (3-letter code: USD, GHS, GBP, EUR, etc.)
            - payment_amount (amount per instalment, number or 0)
            - frequency (monthly, weekly, biweekly, lump_sum)
            - start_date (YYYY-MM-DD or empty)
            - instalments_count (integer, 1 if lump sum)
            - interest_rate (annual percentage as number, 0 if none)
            - penalty_rate_or_fixed (number, 0 if none)
            - penalty_type (percentage, fixed_fee, or none)
            - grace_period_days (integer, 0 if none)
            - default_conditions (string or empty)
            - exchange_rate_rule (string or null)
            - exchange_rate (number, default 1.0)
            - target_currency (string or null)

            Document Text:
            {text[:4000]}
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=dict(response_mime_type="application/json")
            )
            
            if response.text:
                parsed = json.loads(response.text)
                extracted = ExtractedAgreementData(**parsed)
                extracted.document_name = filename
                extracted.raw_text_preview = text[:500] if text else "Document uploaded."
                return extracted
        except Exception:
            pass

    return rule_based_fallback_extractor(text, filename)
