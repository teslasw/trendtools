# Expanded PRD: Age Pension Calculator & Scenario Planner

## 1. Overview
The Age Pension Calculator is a tool that helps Australian residents calculate their Age Pension entitlement under current government rules. It allows users to save their data, model different financial scenarios, and compare outcomes.

---

## 2. Objectives
- Provide accurate entitlement calculations.
- Enable scenario planning with side-by-side comparisons.
- Offer transparency: explain which test (income/assets) is binding and why.
- Support logged-in users with autosave and scenario management.
- Maintain compliance with disclaimers.

---

## 3. User Stories & Acceptance Criteria

### Story 1: Entering personal details
**As a user** I want to enter my age, residency status, and whether I own a home so that my eligibility and thresholds can be correctly assessed.

- **Acceptance Criteria:**
  - Fields: DOB, residency years, homeowner flag, relationship status.
  - DOB auto-calculates age.
  - Eligibility errors if age < 67 or residency < 10 years.

---

### Story 2: Adding assets
**As a user** I want to add my financial and non-financial assets so that the assets test can be calculated.

- **Acceptance Criteria:**
  - Asset categories available: cash, term deposits, shares, crypto, super, vehicles, contents, property, business.
  - Each asset entry has owner, category, amount.
  - Assets flagged as exempt (e.g., home) don’t count in the test.

---

### Story 3: Adding incomes
**As a user** I want to enter my different income sources so that the income test can be applied.

- **Acceptance Criteria:**
  - Income categories: employment, rental, overseas pensions, business, distributions.
  - Work Bonus applied to employment/self-employment automatically.
  - Deemed income automatically calculated for financial assets.

---

### Story 4: Calculation of pension entitlement
**As a user** I want to see how much pension I would receive based on my inputs.

- **Acceptance Criteria:**
  - Calculation runs both income and assets tests.
  - Final pension = minimum of both.
  - Output shows: income-test result, assets-test result, final entitlement, binding test.

---

### Story 5: Saving progress
**As a user** I want my inputs to save automatically so I can come back later without re-entering.

- **Acceptance Criteria:**
  - Autosave occurs on every field change.
  - Progress saved in Supabase under user account.
  - Users can resume where they left off.

---

### Story 6: Scenario creation and duplication
**As a user** I want to create multiple scenarios and duplicate them to compare outcomes.

- **Acceptance Criteria:**
  - Button: “Duplicate Scenario” creates a copy of all inputs.
  - Users can rename scenarios.
  - Scenario list shows name, last updated, pension result.

---

### Story 7: Scenario comparison
**As a user** I want to compare scenarios side by side so I can understand the impact of changes.

- **Acceptance Criteria:**
  - Two or more scenarios can be selected.
  - Differences highlighted visually (e.g., assets, incomes, entitlement).
  - Binding test clearly marked for each.

---

### Story 8: Predefined what-if strategies
**As a user** I want to test common strategies (like gifting or home improvements) with one click.

- **Acceptance Criteria:**
  - Predefined “what-if chips”: gift $10k, move $20k to home improvements, allocate to partner’s super.
  - When selected, creates a new scenario with adjusted values.

---

### Story 9: Export results
**As a user** I want to export my scenario results to PDF so I can keep a record.

- **Acceptance Criteria:**
  - PDF includes: inputs, outputs, breakdown, disclaimer.
  - Download triggered from UI.

---

### Story 10: Transparency and explainability
**As a user** I want to understand why my pension amount is what it is.

- **Acceptance Criteria:**
  - Breakdown JSON rendered in expandable accordion.
  - Shows: max rate, excess income, taper applied, asset thresholds, taper reductions.

---

## 4. Non-Functional Requirements
- **Performance:** Results calculated in <200ms.
- **Scalability:** Rulesets versioned, multiple changes per year supported.
- **Security:** RLS enforced; encryption at rest for sensitive data.
- **Compliance:** Disclaimers included in UI and exports.

---

## 5. Success Metrics
- 90% of users save at least 1 scenario.
- 70% of users create a duplicate scenario for comparison.
- Less than 5% calculation error reports.
- Average time to complete flow <10 minutes.

---

