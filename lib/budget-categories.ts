// Budget Calculator Categories based on MoneySmart.gov.au and best practices

export interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  items: BudgetCategoryItem[];
}

export interface BudgetCategoryItem {
  id: string;
  name: string;
  placeholder?: string;
}

export const INCOME_CATEGORIES: BudgetCategory[] = [
  {
    id: "income",
    name: "Income",
    icon: "DollarSign",
    items: [
      { id: "salary", name: "Salary or wages", placeholder: "After tax" },
      { id: "government_benefits", name: "Government benefits" },
      { id: "pension", name: "Pension" },
      { id: "investment_income", name: "Investment income" },
      { id: "rental_income", name: "Rental income" },
      { id: "business_income", name: "Business income" },
      { id: "child_support", name: "Child support" },
      { id: "other_income", name: "Other income" },
    ],
  },
];

export const EXPENSE_CATEGORIES: BudgetCategory[] = [
  {
    id: "housing",
    name: "Home & Utilities",
    icon: "Home",
    items: [
      { id: "rent_mortgage", name: "Rent or mortgage" },
      { id: "body_corp", name: "Body corporate / strata fees" },
      { id: "home_insurance", name: "Home and contents insurance" },
      { id: "electricity", name: "Electricity" },
      { id: "gas", name: "Gas" },
      { id: "water", name: "Water" },
      { id: "phone_mobile", name: "Phone and mobile" },
      { id: "internet", name: "Internet" },
      { id: "pay_tv", name: "Pay TV / Streaming services" },
      { id: "home_maintenance", name: "Home maintenance" },
      { id: "council_rates", name: "Council rates" },
      { id: "other_housing", name: "Other housing costs" },
    ],
  },
  {
    id: "transport",
    name: "Transport & Auto",
    icon: "Car",
    items: [
      { id: "car_payment", name: "Car payment / lease" },
      { id: "car_insurance", name: "Car insurance" },
      { id: "fuel", name: "Fuel" },
      { id: "car_maintenance", name: "Car maintenance and repairs" },
      { id: "registration", name: "Registration" },
      { id: "public_transport", name: "Public transport" },
      { id: "other_transport", name: "Other transport" },
    ],
  },
  {
    id: "groceries",
    name: "Groceries & Household",
    icon: "ShoppingCart",
    items: [
      { id: "groceries", name: "Groceries" },
      { id: "takeaway", name: "Takeaway and lunches" },
      { id: "toiletries", name: "Toiletries" },
      { id: "cleaning", name: "Cleaning products" },
      { id: "pets", name: "Pet food and supplies" },
      { id: "other_groceries", name: "Other groceries" },
    ],
  },
  {
    id: "personal",
    name: "Personal & Medical",
    icon: "User",
    items: [
      { id: "health_insurance", name: "Health insurance" },
      { id: "medical", name: "Medical and dental" },
      { id: "medications", name: "Medications" },
      { id: "gym", name: "Gym membership" },
      { id: "haircare", name: "Haircuts and beauty" },
      { id: "clothing", name: "Clothing and shoes" },
      { id: "dry_cleaning", name: "Dry cleaning and laundry" },
      { id: "life_insurance", name: "Life insurance" },
      { id: "income_protection", name: "Income protection insurance" },
      { id: "subscriptions", name: "Subscriptions and memberships" },
      { id: "charity", name: "Charity and gifts" },
      { id: "personal_care", name: "Personal care" },
      { id: "other_personal", name: "Other personal" },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment & Lifestyle",
    icon: "Sparkles",
    items: [
      { id: "dining_out", name: "Dining out" },
      { id: "entertainment", name: "Entertainment" },
      { id: "hobbies", name: "Hobbies" },
      { id: "holidays", name: "Holidays" },
      { id: "alcohol_tobacco", name: "Alcohol and tobacco" },
      { id: "lottery", name: "Lottery and gambling" },
      { id: "books_magazines", name: "Books and magazines" },
      { id: "music_apps", name: "Music and apps" },
      { id: "sporting_events", name: "Sporting and cultural events" },
      { id: "tech_gadgets", name: "Technology and gadgets" },
      { id: "home_entertainment", name: "Home entertainment equipment" },
      { id: "other_entertainment", name: "Other entertainment" },
    ],
  },
  {
    id: "children",
    name: "Children & Education",
    icon: "Baby",
    items: [
      { id: "childcare", name: "Childcare" },
      { id: "school_fees", name: "School fees" },
      { id: "school_uniforms", name: "School uniforms and books" },
      { id: "tutoring", name: "Tutoring" },
      { id: "child_activities", name: "Child activities and sports" },
      { id: "child_pocket_money", name: "Pocket money" },
      { id: "child_clothing", name: "Children's clothing" },
      { id: "child_toys", name: "Toys and games" },
      { id: "baby_items", name: "Baby items (nappies, formula)" },
      { id: "other_children", name: "Other children's expenses" },
    ],
  },
  {
    id: "financial",
    name: "Financial & Savings",
    icon: "PiggyBank",
    items: [
      { id: "credit_card", name: "Credit card payments" },
      { id: "personal_loan", name: "Personal loan repayments" },
      { id: "other_debt", name: "Other debt repayments" },
      { id: "savings", name: "Savings" },
      { id: "investments", name: "Investments" },
      { id: "superannuation", name: "Additional superannuation" },
      { id: "emergency_fund", name: "Emergency fund" },
      { id: "financial_planning", name: "Financial planning fees" },
      { id: "bank_fees", name: "Bank fees" },
      { id: "tax_debt", name: "Tax debt repayments" },
      { id: "other_financial", name: "Other financial" },
    ],
  },
];

export const getAllCategories = () => [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export const getCategoryById = (categoryId: string): BudgetCategory | undefined => {
  return getAllCategories().find(cat => cat.id === categoryId);
};

export const getItemById = (categoryId: string, itemId: string): BudgetCategoryItem | undefined => {
  const category = getCategoryById(categoryId);
  return category?.items.find(item => item.id === itemId);
};

// Frequency multipliers to convert to monthly
export const FREQUENCY_TO_MONTHLY: Record<string, number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  quarterly: 12 / 4,
  annually: 1 / 12,
};

// Frequency display labels
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "per week",
  fortnightly: "per fortnight",
  monthly: "per month",
  quarterly: "per quarter",
  annually: "per year",
};
