# Court Order & Payment Agreement Defaulter App

An MVP system for monitoring court orders, consent judgments, and settlement agreements. It automatically extracts payment obligations from uploaded legal documents, generates enforceable payment schedules, tracks defendant payments, detects defaults based on extracted grace periods, and calculates the exact amount currently owed using a deterministic calculation engine.

---

## Key Design Principles

1. **AI vs Calculation Engine Separation**:
   - The AI / OCR layer is **strictly restricted** to extracting unstructured text and terms from documents.
   - The backend calculation engine is **100% deterministic**, executing mathematical formulas without AI hallucination.
2. **Fixed Plaintiff Information**:
   - The Plaintiff's details are fixed in the system configuration (`[PLAINTIFF NAME]`, `[PLAINTIFF ADDRESS]`, `[PLAINTIFF CONTACT]`) and automatically bound to every registered case.
3. **Audit Trail**:
   - Every calculation, payment, and recalculation logs an immutable audit trail showing the step-by-step formula trace:
     $$\text{Original Debt} - \text{Payments Made} = \text{Outstanding Principal} + \text{Accrued Interest} + \text{Default Penalties} = \text{Current Amount Owed}$$

---

## Architecture & Tech Stack

- **Frontend**:
  - Next.js 16 (App Router)
  - TypeScript & Tailwind CSS v4
  - **shadcn/ui** initialized with the preset `b6Rf8UjBdg` (`--template next --pointer`)
  - Lucide Icons
- **Backend**:
  - Python 3.12 + FastAPI
  - SQLAlchemy 2.0 ORM
  - Pydantic v2 validation
  - Document parsing: `pdfplumber`, `pypdf`, `python-docx`, `Pillow`
  - Extraction: Google Gemini 2.5 Flash API + robust deterministic regex fallback
- **Database & Storage**:
  - PostgreSQL / Supabase ready (`backend/schema.sql`)
  - Zero-config SQLite local fallback (`backend/defaulter.db`) for instant local development
- **Testing**:
  - `pytest` for backend calculations & API integration tests
  - TypeScript compiler type-checking

---

## Core Workflow

```
Upload Document (PDF/DOCX/PNG/JPG)
         ↓
Extract Structured Terms (AI / OCR)
         ↓
Review & Verify Terms (User Confirmation)
         ↓
Generate Payment Schedule (Instalments & Due Dates)
         ↓
Record Defendant Payments (Sequential Allocation)
         ↓
Detect Overdue & Default (Grace Period Checks)
         ↓
Calculate Outstanding Balance (Deterministic Engine)
         ↓
Display Dashboard & Audit Report (Printable Statement)
```

---

## Database Schema

The database consists of 5 core tables defined in `backend/schema.sql` and `backend/app/models.py`:

- **`cases`**: Stores case reference numbers, court details, fixed plaintiff info, defendant identity, and overall status (`active`, `overdue`, `defaulted`, `settled`).
- **`agreements`**: Stores the uploaded document metadata, original principal amount, currency, frequency, instalment count, annual interest rate, grace periods, penalty rules, and exchange rates.
- **`payment_plans`**: Individual schedule instalment rows with due date, amount due, amount paid, status (`upcoming`, `paid`, `partially_paid`, `overdue`, `defaulted`), and payment date.
- **`payments`**: Defendant payment records with timestamp, payment reference, and currency.
- **`calculation_records`**: Immutable audit logs containing the calculation timestamp, outstanding principal, accrued interest, penalty fee, exchange rate, and the complete step-by-step formula trace.

---

## Quickstart Guide

### Prerequisites
- Node.js v18+ & npm
- Python 3.10+ (Python 3.12 installed in `backend/venv`)

### 1. Start the FastAPI Backend
```powershell
# From project root:
.\start-backend.ps1

# Or manually:
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- The backend will start on **`http://localhost:8000`**
- Interactive Swagger API docs are available at **`http://localhost:8000/docs`**

### 2. Start the Next.js Frontend
```powershell
# From project root:
.\start-frontend.ps1

# Or manually:
cd frontend
npm run dev
```
- The frontend will be accessible at **`http://localhost:3000`**

### 3. Seed Sample Data (Optional)
The database already includes pre-configured sample cases. To re-seed fresh test data at any time:
```powershell
cd backend
.\venv\Scripts\python.exe seed.py
```

---

## Testing Sample Documents

We have provided ready-to-use sample court orders in the `sample_documents/` folder:
- `sample_documents/sample_court_order.docx`: A High Court Consent Order with $24,000 debt across 6 instalments.
- `sample_documents/sample_settlement_agreement.txt`: A Terms of Settlement document with $18,000 debt across 3 instalments.

You can upload these directly via the **Upload Court Order** screen at `http://localhost:3000/upload`.

---

## Running Automated Tests

Run the complete test suite:
```powershell
.\run-tests.ps1
```

Or run backend tests individually:
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests/ -v
```

All 8 automated tests cover:
- Cent-perfect instalment schedule generation
- Sequential payment allocation
- Default detection past grace periods
- Deterministic simple & annual interest calculations
- Default penalty application (percentages on arrears, fixed fees, per-day rates)
- Multi-currency conversion with audit logging
- Full API integration flow from document upload to audit history

---

## Environment Variables

### Backend (`backend/.env`)
```ini
APP_NAME="Court Order & Payment Agreement Defaulter App"
DATABASE_URL="sqlite:///./defaulter.db"
# Or for Supabase:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Optional Gemini AI key for OCR & LLM extraction
GEMINI_API_KEY=""

# Fixed Plaintiff Information
DEFAULT_PLAINTIFF_NAME="[PLAINTIFF NAME]"
DEFAULT_PLAINTIFF_ADDRESS="[PLAINTIFF ADDRESS]"
DEFAULT_PLAINTIFF_CONTACT="[PLAINTIFF CONTACT]"
```

### Frontend (`frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_DEFAULT_PLAINTIFF_NAME="[PLAINTIFF NAME]"
```

---

## License
MIT
