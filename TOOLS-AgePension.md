PRD: Age Pension Calculator & Scenario Planner
1. Overview
The Age Pension Calculator is a web-based tool that allows logged-in users to:
Enter personal, income, and asset information.
Calculate their Age Pension entitlement under current Australian rules.
Save progress automatically to their account.
Create and compare multiple scenarios (e.g., moving assets, gifting, super contributions) to see how strategies affect pension outcomes.
Export results for offline reference.
2. Objectives
Provide an accurate, transparent, and explainable Age Pension entitlement calculator.
Support what-if planning to help users optimize entitlements.
Enable autosave and multi-scenario management within logged-in user accounts.
Maintain compliance: clear disclaimers that this is general information only.
3. Key Features
A. User Input Flow (Wizard)
Step 1: About You
Age, residency, relationship status, homeowner status.
Step 2: Income Sources
Employment, rental, overseas pensions, business, distributions.
Step 3: Financial Assets
Cash, shares, ETFs, term deposits, managed funds, crypto, superannuation.
Step 4: Non-Financial Assets
Vehicles, contents, business assets.
Step 5: Properties
Home (exempt), investment properties.
Step 6: Review & Results
Inputs use shadcn/ui form components with validation + inline help text.
B. Calculation Engine
Encoded income test, assets test, deeming rules, work bonus, and pension max rates.
Rule thresholds stored in Supabase rulesets table, versioned with effective_from and effective_to.
Deterministic calculation returns:
Income-test result
Assets-test result
Final entitlement (minimum of both)
Breakdown (JSON: step-by-step explanation).
C. Scenario Management
Users can:
Save current scenario (autosave on field changes).
Duplicate scenario for "what-if" analysis.
Compare scenarios side-by-side (diff view highlighting changed values).
Scenario transforms (predefined toggles):
Move cash → home improvements (exempt).
Gift assets (within annual limit or not).
Allocate super to under-age partner.
Sell property vs. hold property.
D. Persistence & Accounts (Supabase)
Tables:
users (via Supabase Auth)
households (linked to users)
scenarios (name, calculation_date, ruleset_id)
assets (linked to scenario_id)
incomes (linked to scenario_id)
results (snapshot of calculation output)
rulesets (thresholds, deeming rates, pension max, indexed by date)
RLS policies ensure only logged-in user can access their household + scenarios.
E. Outputs
On-screen entitlement result, with:
Final rate
Which test applied (income vs. assets)
How far from threshold (visual progress bar).
Export:
PDF report (scenario inputs + results + disclaimers).
CSV (raw numbers for deeper analysis).
F. UX / UI
Tailwind + shadcn/ui for consistent design.
Multi-step wizard with autosave progress bar.
Scenario cards (name, pension amount, updated date).
Comparison view: side-by-side tables.
Explanation panel (accordion showing how result was calculated).
G. Compliance / Disclaimers
Display disclaimer at start and export:
“This tool provides general information only. It does not consider your full circumstances and is not financial advice. Please seek licensed advice before making decisions.”
4. Non-Functional Requirements
Performance: Calculation <200ms, even with 1000 scenarios.
Scalability: Rulesets table supports multiple versions per year.
Security: Supabase RLS for multi-tenancy; sensitive fields encrypted at rest.
Maintainability: All rules (thresholds, taper rates, max rates) editable in DB (not hardcoded).
5. Tech Stack Alignment
Frontend: Next.js, Tailwind, shadcn/ui.
State: Zustand or Supabase client (depending on persistence needs).
Backend: Supabase Postgres (rulesets, assets, incomes, scenarios).
API/Logic: Supabase Edge Functions for calculations.
Auth: Supabase Auth (users already logged in).
6. Success Metrics
Time to complete a full input flow <10 minutes.
≥90% of users save ≥1 scenario.
≥70% of users create at least 1 “what-if” duplicate scenario.
<5% user support requests about calculation errors (accuracy benchmark).