// Age Pension Calculator
// Based on Australian Government Services Australia rates (as of 2024)

export interface PensionRates {
  maxRateSingle: number;
  maxRateCouple: number; // Per person
  incomeThresholdSingle: number;
  incomeThresholdCouple: number; // Combined
  incomeTaperRate: number; // Reduction per dollar over threshold
  assetThresholdSingleHomeowner: number;
  assetThresholdSingleNonHomeowner: number;
  assetThresholdCoupleHomeowner: number;
  assetThresholdCoupleNonHomeowner: number;
  assetTaperRate: number; // Reduction per $1000 over threshold
  workBonusAmount: number; // First amount of employment income exempt
  workBonusBankMax: number; // Maximum work bonus bank
  deemedRateLower: number; // Deeming rate for first threshold
  deemedRateUpper: number; // Deeming rate above threshold
  deemedThresholdSingle: number;
  deemedThresholdCouple: number;
}

// Current rates as of 2024 (fortnightly amounts)
export const CURRENT_RATES: PensionRates = {
  maxRateSingle: 1144.40,
  maxRateCouple: 862.60, // Per person
  incomeThresholdSingle: 212,
  incomeThresholdCouple: 372, // Combined
  incomeTaperRate: 0.50, // 50 cents per dollar
  assetThresholdSingleHomeowner: 314000,
  assetThresholdSingleNonHomeowner: 566000,
  assetThresholdCoupleHomeowner: 470000,
  assetThresholdCoupleNonHomeowner: 722000,
  assetTaperRate: 3.00 / 1000, // $3 per $1000
  workBonusAmount: 300, // First $300 of employment income exempt
  workBonusBankMax: 11800, // Maximum work bonus bank
  deemedRateLower: 0.0025, // 0.25% p.a.
  deemedRateUpper: 0.0225, // 2.25% p.a.
  deemedThresholdSingle: 62600,
  deemedThresholdCouple: 103800,
};

export interface CalculationInput {
  relationshipStatus: 'single' | 'couple';
  isHomeowner: boolean;
  dateOfBirth: Date;
  partnerDOB?: Date;
  residencyYears: number;
  assets: {
    category: string;
    owner: 'self' | 'partner' | 'joint';
    amount: number;
    isExempt: boolean;
  }[];
  incomes: {
    category: string;
    owner: 'self' | 'partner' | 'joint';
    amount: number; // Annual amount
    frequency: 'annual' | 'fortnightly' | 'weekly';
  }[];
  workBonusBank?: number; // Current work bonus bank balance
}

export interface CalculationResult {
  eligible: boolean;
  eligibilityReason?: string;
  pensionAmount: number; // Fortnightly
  bindingTest: 'income' | 'assets' | 'both_zero';
  incomeTestResult: number;
  assetsTestResult: number;
  totalAssets: number;
  assessableAssets: number;
  totalIncome: number; // Fortnightly
  assessableIncome: number; // Fortnightly
  deemedIncome: number; // Fortnightly
  breakdown: {
    maxRate: number;
    incomeTest: {
      threshold: number;
      excessIncome: number;
      reduction: number;
      result: number;
      workBonusApplied: number;
    };
    assetsTest: {
      threshold: number;
      excessAssets: number;
      reduction: number;
      result: number;
    };
    deeming: {
      financialAssets: number;
      lowerRateApplied: number;
      upperRateApplied: number;
      totalDeemedIncome: number;
    };
  };
}

export class AgePensionCalculator {
  private rates: PensionRates;

  constructor(rates: PensionRates = CURRENT_RATES) {
    this.rates = rates;
  }

  calculate(input: CalculationInput): CalculationResult {
    // Check eligibility
    const eligibilityCheck = this.checkEligibility(input);
    if (!eligibilityCheck.eligible) {
      return {
        eligible: false,
        eligibilityReason: eligibilityCheck.reason,
        pensionAmount: 0,
        bindingTest: 'both_zero',
        incomeTestResult: 0,
        assetsTestResult: 0,
        totalAssets: 0,
        assessableAssets: 0,
        totalIncome: 0,
        assessableIncome: 0,
        deemedIncome: 0,
        breakdown: this.getEmptyBreakdown(),
      };
    }

    // Calculate total and assessable assets
    const assetCalc = this.calculateAssets(input);
    
    // Calculate total and assessable income (including deeming)
    const incomeCalc = this.calculateIncome(input, assetCalc.financialAssets);
    
    // Apply income test
    const incomeTest = this.applyIncomeTest(
      incomeCalc.assessableIncome,
      input.relationshipStatus,
      input.workBonusBank || 0
    );
    
    // Apply assets test
    const assetsTest = this.applyAssetsTest(
      assetCalc.assessableAssets,
      input.relationshipStatus,
      input.isHomeowner
    );
    
    // Determine final pension amount (lower of two tests)
    let pensionAmount = Math.min(incomeTest.result, assetsTest.result);
    pensionAmount = Math.max(0, pensionAmount); // Can't be negative
    
    // Determine binding test
    let bindingTest: 'income' | 'assets' | 'both_zero' = 'both_zero';
    if (pensionAmount > 0) {
      bindingTest = incomeTest.result <= assetsTest.result ? 'income' : 'assets';
    } else if (incomeTest.result === 0 && assetsTest.result === 0) {
      bindingTest = 'both_zero';
    }

    return {
      eligible: true,
      pensionAmount: Math.round(pensionAmount * 100) / 100, // Round to cents
      bindingTest,
      incomeTestResult: Math.round(incomeTest.result * 100) / 100,
      assetsTestResult: Math.round(assetsTest.result * 100) / 100,
      totalAssets: assetCalc.totalAssets,
      assessableAssets: assetCalc.assessableAssets,
      totalIncome: incomeCalc.totalIncome,
      assessableIncome: incomeCalc.assessableIncome,
      deemedIncome: incomeCalc.deemedIncome,
      breakdown: {
        maxRate: incomeTest.maxRate,
        incomeTest: {
          threshold: incomeTest.threshold,
          excessIncome: incomeTest.excessIncome,
          reduction: incomeTest.reduction,
          result: incomeTest.result,
          workBonusApplied: incomeTest.workBonusApplied,
        },
        assetsTest: {
          threshold: assetsTest.threshold,
          excessAssets: assetsTest.excessAssets,
          reduction: assetsTest.reduction,
          result: assetsTest.result,
        },
        deeming: incomeCalc.deemingBreakdown,
      },
    };
  }

  private checkEligibility(input: CalculationInput): { eligible: boolean; reason?: string } {
    // Check age (must be 67+)
    const age = this.calculateAge(input.dateOfBirth);
    if (age < 67) {
      return { eligible: false, reason: `Must be 67 or older (current age: ${age})` };
    }

    // Check residency (must be 10+ years)
    if (input.residencyYears < 10) {
      return { eligible: false, reason: `Must have 10+ years residency (current: ${input.residencyYears} years)` };
    }

    // Check partner age if couple
    if (input.relationshipStatus === 'couple' && input.partnerDOB) {
      const partnerAge = this.calculateAge(input.partnerDOB);
      if (partnerAge < 67) {
        return { eligible: false, reason: `Partner must be 67 or older (current age: ${partnerAge})` };
      }
    }

    return { eligible: true };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private calculateAssets(input: CalculationInput) {
    let totalAssets = 0;
    let assessableAssets = 0;
    let financialAssets = 0;

    for (const asset of input.assets) {
      // Calculate ownership share
      let share = 1;
      if (input.relationshipStatus === 'couple') {
        if (asset.owner === 'joint') {
          share = 0.5; // Split 50/50 for joint assets
        } else if (asset.owner === 'partner') {
          share = 0; // Partner's sole assets don't count for individual
        }
      }

      const assetValue = asset.amount * share;
      totalAssets += assetValue;

      // Add to assessable unless exempt
      if (!asset.isExempt) {
        assessableAssets += assetValue;

        // Track financial assets for deeming
        const financialCategories = ['cash', 'term_deposit', 'shares', 'managed_funds', 'crypto'];
        if (financialCategories.includes(asset.category)) {
          financialAssets += assetValue;
        }
      }
    }

    return { totalAssets, assessableAssets, financialAssets };
  }

  private calculateIncome(input: CalculationInput, financialAssets: number) {
    let totalIncome = 0;
    let assessableIncome = 0;
    let employmentIncome = 0;

    // Convert all income to fortnightly
    for (const income of input.incomes) {
      // Calculate ownership share
      let share = 1;
      if (input.relationshipStatus === 'couple') {
        if (income.owner === 'joint') {
          share = 0.5; // Split 50/50 for joint income
        } else if (income.owner === 'partner') {
          share = 0; // Partner's sole income doesn't count for individual
        }
      }

      // Convert to fortnightly
      let fortnightlyAmount = 0;
      if (income.frequency === 'annual') {
        fortnightlyAmount = (income.amount * share) / 26;
      } else if (income.frequency === 'weekly') {
        fortnightlyAmount = (income.amount * share) * 2;
      } else {
        fortnightlyAmount = income.amount * share;
      }

      totalIncome += fortnightlyAmount;

      // Track employment income for work bonus
      if (income.category === 'employment' || income.category === 'self_employment') {
        employmentIncome += fortnightlyAmount;
      } else {
        assessableIncome += fortnightlyAmount;
      }
    }

    // Apply work bonus to employment income
    const workBonusApplied = Math.min(employmentIncome, this.rates.workBonusAmount);
    const assessableEmploymentIncome = Math.max(0, employmentIncome - workBonusApplied);
    assessableIncome += assessableEmploymentIncome;

    // Calculate deemed income from financial assets
    const deeming = this.calculateDeemedIncome(financialAssets, input.relationshipStatus);
    assessableIncome += deeming.totalDeemedIncome;

    return {
      totalIncome,
      assessableIncome,
      deemedIncome: deeming.totalDeemedIncome,
      deemingBreakdown: deeming,
    };
  }

  private calculateDeemedIncome(financialAssets: number, relationshipStatus: 'single' | 'couple') {
    const threshold = relationshipStatus === 'single' 
      ? this.rates.deemedThresholdSingle 
      : this.rates.deemedThresholdCouple;

    let lowerRateApplied = 0;
    let upperRateApplied = 0;

    if (financialAssets <= threshold) {
      // All assets deemed at lower rate
      lowerRateApplied = financialAssets * this.rates.deemedRateLower;
    } else {
      // Split between lower and upper rates
      lowerRateApplied = threshold * this.rates.deemedRateLower;
      upperRateApplied = (financialAssets - threshold) * this.rates.deemedRateUpper;
    }

    // Convert annual to fortnightly
    const totalDeemedIncome = (lowerRateApplied + upperRateApplied) / 26;

    return {
      financialAssets,
      lowerRateApplied: lowerRateApplied / 26,
      upperRateApplied: upperRateApplied / 26,
      totalDeemedIncome,
    };
  }

  private applyIncomeTest(
    assessableIncome: number, 
    relationshipStatus: 'single' | 'couple',
    workBonusBank: number
  ) {
    const maxRate = relationshipStatus === 'single' 
      ? this.rates.maxRateSingle 
      : this.rates.maxRateCouple;
    
    const threshold = relationshipStatus === 'single' 
      ? this.rates.incomeThresholdSingle 
      : this.rates.incomeThresholdCouple;

    // Apply work bonus bank if available
    let workBonusApplied = 0;
    let adjustedIncome = assessableIncome;
    
    if (workBonusBank > 0 && assessableIncome > threshold) {
      const excessIncome = assessableIncome - threshold;
      workBonusApplied = Math.min(workBonusBank, excessIncome);
      adjustedIncome = assessableIncome - workBonusApplied;
    }

    const excessIncome = Math.max(0, adjustedIncome - threshold);
    const reduction = excessIncome * this.rates.incomeTaperRate;
    const result = Math.max(0, maxRate - reduction);

    return {
      maxRate,
      threshold,
      excessIncome,
      reduction,
      result,
      workBonusApplied,
    };
  }

  private applyAssetsTest(
    assessableAssets: number,
    relationshipStatus: 'single' | 'couple',
    isHomeowner: boolean
  ) {
    const maxRate = relationshipStatus === 'single' 
      ? this.rates.maxRateSingle 
      : this.rates.maxRateCouple;

    let threshold: number;
    if (relationshipStatus === 'single') {
      threshold = isHomeowner 
        ? this.rates.assetThresholdSingleHomeowner 
        : this.rates.assetThresholdSingleNonHomeowner;
    } else {
      threshold = isHomeowner 
        ? this.rates.assetThresholdCoupleHomeowner 
        : this.rates.assetThresholdCoupleNonHomeowner;
    }

    const excessAssets = Math.max(0, assessableAssets - threshold);
    // Convert to fortnightly (rates are per $1000)
    const reduction = (excessAssets / 1000) * this.rates.assetTaperRate * 26;
    const result = Math.max(0, maxRate - reduction);

    return {
      threshold,
      excessAssets,
      reduction,
      result,
    };
  }

  private getEmptyBreakdown() {
    return {
      maxRate: 0,
      incomeTest: {
        threshold: 0,
        excessIncome: 0,
        reduction: 0,
        result: 0,
        workBonusApplied: 0,
      },
      assetsTest: {
        threshold: 0,
        excessAssets: 0,
        reduction: 0,
        result: 0,
      },
      deeming: {
        financialAssets: 0,
        lowerRateApplied: 0,
        upperRateApplied: 0,
        totalDeemedIncome: 0,
      },
    };
  }
}