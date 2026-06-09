import { Injectable } from '@nestjs/common'

export interface DebtTransfer {
  from: string
  to: string
  amount: number
}

export interface NetBalance {
  userId: string
  amount: number
}

@Injectable()
export class DebtSimplifierService {
  calculateNetBalances(
    expenses: Array<{
      paidById: string
      splits: Array<{ userId: string; amount: number; isPaid: boolean }>
    }>,
    settlements: Array<{ fromUserId: string; toUserId: string; amount: number }>,
  ): NetBalance[] {
    const balanceMap = new Map<string, number>()

    for (const expense of expenses) {
      const paidBy = expense.paidById
      const currentPaid = balanceMap.get(paidBy) || 0
      const othersOwe = expense.splits
        .filter((s) => s.userId !== paidBy)
        .reduce((sum, s) => sum + s.amount, 0)
      balanceMap.set(paidBy, currentPaid + othersOwe)

      for (const split of expense.splits) {
        if (split.userId === paidBy) continue
        const current = balanceMap.get(split.userId) || 0
        balanceMap.set(split.userId, current - split.amount)
      }
    }

    for (const settlement of settlements) {
      const from = balanceMap.get(settlement.fromUserId) || 0
      balanceMap.set(settlement.fromUserId, from + settlement.amount)
      const to = balanceMap.get(settlement.toUserId) || 0
      balanceMap.set(settlement.toUserId, to - settlement.amount)
    }

    const balances: NetBalance[] = []
    for (const [userId, amount] of balanceMap) {
      balances.push({ userId, amount: Math.round(amount * 100) / 100 })
    }

    return balances
  }

  simplifyDebts(balances: NetBalance[]): DebtTransfer[] {
    const transfers: DebtTransfer[] = []
    const creditors: NetBalance[] = []
    const debtors: NetBalance[] = []

    for (const b of balances) {
      if (b.amount > 0.01) {
        creditors.push({ ...b })
      } else if (b.amount < -0.01) {
        debtors.push({ userId: b.userId, amount: Math.abs(b.amount) })
      }
    }

    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)

    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0]
      const debtor = debtors[0]

      const transferAmount = Math.min(creditor.amount, debtor.amount)

      if (transferAmount > 0.01) {
        transfers.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: Math.round(transferAmount * 100) / 100,
        })
      }

      creditor.amount -= transferAmount
      debtor.amount -= transferAmount

      if (creditor.amount < 0.01) creditors.shift()
      if (debtor.amount < 0.01) debtors.shift()
    }

    return transfers
  }

  getOverallBalances(
    allGroupsExpenses: Array<{
      groupId: string
      expenses: Array<{
        paidById: string
        splits: Array<{ userId: string; amount: number; isPaid: boolean }>
      }>
      settlements: Array<{ fromUserId: string; toUserId: string; amount: number }>
    }>,
    userId: string,
  ): { owedToUser: number; userOwes: number } {
    let owedToUser = 0
    let userOwes = 0

    for (const group of allGroupsExpenses) {
      const balances = this.calculateNetBalances(group.expenses, group.settlements)
      const userBalance = balances.find((b) => b.userId === userId)
      if (userBalance) {
        if (userBalance.amount > 0) {
          owedToUser += userBalance.amount
        } else {
          userOwes += Math.abs(userBalance.amount)
        }
      }
    }

    return {
      owedToUser: Math.round(owedToUser * 100) / 100,
      userOwes: Math.round(userOwes * 100) / 100,
    }
  }
}
