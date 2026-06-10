export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
}

export interface Transaction {
  id: string
  type: string
  title: string
  description?: string
  amount: number
  currency: string
  date: string
  categoryId: string
  category: { id: string; name: string; color: string; icon: string }
  tags?: { id: string; name: string; color: string; icon: string }[]
  paymentMethod?: string
  isRecurring: boolean
  recurringFreq?: string
  accountId?: string
}

export interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
  icon: string
  color: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

export interface Goal {
  id: string
  name: string
  description?: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  color?: string
}

export interface Budget {
  id: string
  amount: number
  spent: number
  month: number
  year: number
  categoryId: string
  category: Category
}

export interface Tag {
  id: string
  name: string
  color: string
  icon: string
  budget: number | null
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  data?: string
  createdAt: string
}

export interface SplitGroup {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  currency: string
  createdBy: User
  members: Array<{ user: User; role: string }>
  expenses: SharedExpense[]
  settlements: Settlement[]
}

export interface SharedExpense {
  id: string
  title: string
  description?: string
  amount: number
  currency: string
  date: string
  splitType: string
  receiptData?: string
  receiptMime?: string
  paidBy: User
  splits: ExpenseSplit[]
}

export interface ExpenseSplit {
  id: string
  userId: string
  amount: number
  percentage?: number
  isPaid: boolean
  paidAt?: string
  user: User
}

export interface Settlement {
  id: string
  fromUser: User
  toUser: User
  amount: number
  date: string
  notes?: string
}
