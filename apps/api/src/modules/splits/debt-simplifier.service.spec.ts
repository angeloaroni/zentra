import { DebtSimplifierService, NetBalance, DebtTransfer } from './debt-simplifier.service'

describe('DebtSimplifierService', () => {
  let service: DebtSimplifierService

  beforeEach(() => {
    service = new DebtSimplifierService()
  })

  describe('calculateNetBalances', () => {
    it('should return empty array for no expenses', () => {
      const result = service.calculateNetBalances([], [])
      expect(result).toEqual([])
    })

    it('should calculate correct balances for single expense with 2 people', () => {
      // A paga 100, split EQUAL con B
      const expenses = [{
        paidById: 'A',
        splits: [
          { userId: 'A', amount: 50, isPaid: false },
          { userId: 'B', amount: 50, isPaid: false },
        ],
      }]

      const result = service.calculateNetBalances(expenses, [])

      expect(result).toHaveLength(2)
      expect(result.find(b => b.userId === 'A')).toEqual({ userId: 'A', amount: 50 })
      expect(result.find(b => b.userId === 'B')).toEqual({ userId: 'B', amount: -50 })
    })

    it('should calculate correct balances for single expense with 3 people', () => {
      // A paga 90, split EQUAL con A, B, C
      const expenses = [{
        paidById: 'A',
        splits: [
          { userId: 'A', amount: 30, isPaid: false },
          { userId: 'B', amount: 30, isPaid: false },
          { userId: 'C', amount: 30, isPaid: false },
        ],
      }]

      const result = service.calculateNetBalances(expenses, [])

      expect(result).toHaveLength(3)
      expect(result.find(b => b.userId === 'A')).toEqual({ userId: 'A', amount: 60 })
      expect(result.find(b => b.userId === 'B')).toEqual({ userId: 'B', amount: -30 })
      expect(result.find(b => b.userId === 'C')).toEqual({ userId: 'C', amount: -30 })
    })

    it('should handle multiple expenses with different payers', () => {
      // A paga 100 (split con B: 50/50)
      // B paga 60 (split con A: 30/30)
      const expenses = [
        {
          paidById: 'A',
          splits: [
            { userId: 'A', amount: 50, isPaid: false },
            { userId: 'B', amount: 50, isPaid: false },
          ],
        },
        {
          paidById: 'B',
          splits: [
            { userId: 'A', amount: 30, isPaid: false },
            { userId: 'B', amount: 30, isPaid: false },
          ],
        },
      ]

      const result = service.calculateNetBalances(expenses, [])

      expect(result).toHaveLength(2)
      // A: pagó 100, le deben 50 (de B). Consumió 30 de B. Balance: +50 - 30 = +20
      expect(result.find(b => b.userId === 'A')).toEqual({ userId: 'A', amount: 20 })
      // B: pagó 60, le deben 30 (de A). Consumió 50 de A. Balance: +30 - 50 = -20
      expect(result.find(b => b.userId === 'B')).toEqual({ userId: 'B', amount: -20 })
    })

    it('should handle settlements correctly', () => {
      // A paga 100 (split con B: 50/50)
      // B paga 30 a A (settlement)
      const expenses = [{
        paidById: 'A',
        splits: [
          { userId: 'A', amount: 50, isPaid: false },
          { userId: 'B', amount: 50, isPaid: false },
        ],
      }]
      const settlements = [{
        fromUserId: 'B',
        toUserId: 'A',
        amount: 30,
      }]

      const result = service.calculateNetBalances(expenses, settlements)

      expect(result).toHaveLength(2)
      // A: +50 (le deben) - 30 (recibió) = +20
      expect(result.find(b => b.userId === 'A')).toEqual({ userId: 'A', amount: 20 })
      // B: -50 (debe) + 30 (pagó) = -20
      expect(result.find(b => b.userId === 'B')).toEqual({ userId: 'B', amount: -20 })
    })

    it('should handle fully settled debts', () => {
      // A paga 100 (split con B: 50/50)
      // B paga 50 a A (settlement completo)
      const expenses = [{
        paidById: 'A',
        splits: [
          { userId: 'A', amount: 50, isPaid: false },
          { userId: 'B', amount: 50, isPaid: false },
        ],
      }]
      const settlements = [{
        fromUserId: 'B',
        toUserId: 'A',
        amount: 50,
      }]

      const result = service.calculateNetBalances(expenses, settlements)

      expect(result).toHaveLength(2)
      expect(result.find(b => b.userId === 'A')).toEqual({ userId: 'A', amount: 0 })
      expect(result.find(b => b.userId === 'B')).toEqual({ userId: 'B', amount: 0 })
    })

    it('should handle real-world example (Salou group)', () => {
      // Angelo paga Hotel 180 (split: Angelo 60, Carla 60, Mabel 60)
      // Angelo paga Comida 70.90 (split: Angelo 23.64, Carla 23.63, Mabel 23.63)
      // Carla paga Cza 21 (split: Angelo 7, Carla 7, Mabel 7)
      // Carla paga Copas 13.40 (split: Angelo 4.46, Carla 4.47, Mabel 4.47)
      // Carla paga Cena 74.30 (split: Angelo 24.76, Carla 24.77, Mabel 24.77)
      // Angelo paga Desayuno 23.10 (split: Angelo 7.70, Carla 7.70, Mabel 7.70)
      // Carla paga Desayuno domingo 11.40 (split: Angelo 3.80, Carla 3.80, Mabel 3.80)

      const angelo = 'angelo'
      const carla = 'carla'
      const mabel = 'mabel'

      const expenses = [
        { paidById: angelo, splits: [{ userId: angelo, amount: 60, isPaid: false }, { userId: carla, amount: 60, isPaid: false }, { userId: mabel, amount: 60, isPaid: false }] },
        { paidById: angelo, splits: [{ userId: angelo, amount: 23.64, isPaid: false }, { userId: carla, amount: 23.63, isPaid: false }, { userId: mabel, amount: 23.63, isPaid: false }] },
        { paidById: carla, splits: [{ userId: angelo, amount: 7, isPaid: false }, { userId: carla, amount: 7, isPaid: false }, { userId: mabel, amount: 7, isPaid: false }] },
        { paidById: carla, splits: [{ userId: angelo, amount: 4.46, isPaid: false }, { userId: carla, amount: 4.47, isPaid: false }, { userId: mabel, amount: 4.47, isPaid: false }] },
        { paidById: carla, splits: [{ userId: angelo, amount: 24.76, isPaid: false }, { userId: carla, amount: 24.77, isPaid: false }, { userId: mabel, amount: 24.77, isPaid: false }] },
        { paidById: angelo, splits: [{ userId: angelo, amount: 7.70, isPaid: false }, { userId: carla, amount: 7.70, isPaid: false }, { userId: mabel, amount: 7.70, isPaid: false }] },
        { paidById: carla, splits: [{ userId: angelo, amount: 3.80, isPaid: false }, { userId: carla, amount: 3.80, isPaid: false }, { userId: mabel, amount: 3.80, isPaid: false }] },
      ]

      const result = service.calculateNetBalances(expenses, [])

      expect(result).toHaveLength(3)

      const angeloBalance = result.find(b => b.userId === angelo)!
      const carlaBalance = result.find(b => b.userId === carla)!
      const mabelBalance = result.find(b => b.userId === mabel)!

      // Angelo: pagó 274, consumió 131.36 → +142.64
      expect(angeloBalance.amount).toBeCloseTo(142.64, 1)
      // Carla: pagó 120.10, consumió 131.37 → -11.27
      expect(carlaBalance.amount).toBeCloseTo(-11.27, 1)
      // Mabel: pagó 0, consumió 131.37 → -131.37
      expect(mabelBalance.amount).toBeCloseTo(-131.37, 1)

      // Verificar que la suma es 0
      const sum = result.reduce((s, b) => s + b.amount, 0)
      expect(Math.abs(sum)).toBeLessThan(0.1)
    })

    it('should handle expenses where payer is not in splits', () => {
      // A paga 100 pero solo B y C consumen
      const expenses = [{
        paidById: 'A',
        splits: [
          { userId: 'B', amount: 60, isPaid: false },
          { userId: 'C', amount: 40, isPaid: false },
        ],
      }]

      const result = service.calculateNetBalances(expenses, [])

      expect(result).toHaveLength(3)
      expect(result.find(b => b.userId === 'A')).toEqual({ userId: 'A', amount: 100 })
      expect(result.find(b => b.userId === 'B')).toEqual({ userId: 'B', amount: -60 })
      expect(result.find(b => b.userId === 'C')).toEqual({ userId: 'C', amount: -40 })
    })
  })

  describe('simplifyDebts', () => {
    it('should return empty array for balanced debts', () => {
      const balances: NetBalance[] = [
        { userId: 'A', amount: 0 },
        { userId: 'B', amount: 0 },
      ]

      const result = service.simplifyDebts(balances)
      expect(result).toEqual([])
    })

    it('should simplify simple 2-person debt', () => {
      const balances: NetBalance[] = [
        { userId: 'A', amount: 50 },
        { userId: 'B', amount: -50 },
      ]

      const result = service.simplifyDebts(balances)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ from: 'B', to: 'A', amount: 50 })
    })

    it('should simplify 3-person debt to minimum transfers', () => {
      // A debe 50, B debe 50, C recibe 100
      const balances: NetBalance[] = [
        { userId: 'A', amount: -50 },
        { userId: 'B', amount: -50 },
        { userId: 'C', amount: 100 },
      ]

      const result = service.simplifyDebts(balances)

      expect(result).toHaveLength(2)
      expect(result).toContainEqual({ from: 'A', to: 'C', amount: 50 })
      expect(result).toContainEqual({ from: 'B', to: 'C', amount: 50 })
    })

    it('should handle circular debts (A->B, B->C, C->A)', () => {
      // A debe 30 a B, B debe 20 a C, C debe 10 a A
      // Net: A: -20, B: +10, C: +10
      const balances: NetBalance[] = [
        { userId: 'A', amount: -20 },
        { userId: 'B', amount: 10 },
        { userId: 'C', amount: 10 },
      ]

      const result = service.simplifyDebts(balances)

      expect(result).toHaveLength(2)
      // A paga 10 a B y 10 a C
      expect(result).toContainEqual({ from: 'A', to: 'B', amount: 10 })
      expect(result).toContainEqual({ from: 'A', to: 'C', amount: 10 })
    })

    it('should handle real-world Salou example', () => {
      // Angelo: +142.64, Carla: -6.57, Mabel: -126.63
      const balances: NetBalance[] = [
        { userId: 'angelo', amount: 142.64 },
        { userId: 'carla', amount: -6.57 },
        { userId: 'mabel', amount: -126.63 },
      ]

      const result = service.simplifyDebts(balances)

      // Should produce 2 transfers
      expect(result).toHaveLength(2)

      // Mabel pays Angelo 126.63
      expect(result).toContainEqual({ from: 'mabel', to: 'angelo', amount: 126.63 })
      // Carla pays Angelo 6.57
      expect(result).toContainEqual({ from: 'carla', to: 'angelo', amount: 6.57 })
    })

    it('should handle multiple creditors', () => {
      // A debe 30, B debe 20, C recibe 25, D recibe 25
      const balances: NetBalance[] = [
        { userId: 'A', amount: -30 },
        { userId: 'B', amount: -20 },
        { userId: 'C', amount: 25 },
        { userId: 'D', amount: 25 },
      ]

      const result = service.simplifyDebts(balances)

      // Should produce minimum transfers
      expect(result.length).toBeLessThanOrEqual(3)

      // Verify total transfers equal total debt
      const totalTransferred = result.reduce((sum, t) => sum + t.amount, 0)
      expect(totalTransferred).toBeCloseTo(50, 0)
    })

    it('should handle small amounts correctly', () => {
      const balances: NetBalance[] = [
        { userId: 'A', amount: 0.01 },
        { userId: 'B', amount: -0.01 },
      ]

      const result = service.simplifyDebts(balances)

      // 0.01 is less than 0.01 threshold, should not create transfer
      expect(result).toEqual([])
    })

    it('should handle amounts just above threshold', () => {
      const balances: NetBalance[] = [
        { userId: 'A', amount: 0.02 },
        { userId: 'B', amount: -0.02 },
      ]

      const result = service.simplifyDebts(balances)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ from: 'B', to: 'A', amount: 0.02 })
    })
  })

  describe('getOverallBalances', () => {
    it('should calculate overall balances across multiple groups', () => {
      const allGroupsExpenses = [
        {
          groupId: 'group1',
          expenses: [{
            paidById: 'userA',
            splits: [
              { userId: 'userA', amount: 50, isPaid: false },
              { userId: 'userB', amount: 50, isPaid: false },
            ],
          }],
          settlements: [],
        },
        {
          groupId: 'group2',
          expenses: [{
            paidById: 'userB',
            splits: [
              { userId: 'userA', amount: 30, isPaid: false },
              { userId: 'userB', amount: 30, isPaid: false },
            ],
          }],
          settlements: [],
        },
      ]

      const result = service.getOverallBalances(allGroupsExpenses, 'userA')

      // userA: group1 balance +50, group2 balance -30
      // owedToUser = 50 (from group1), userOwes = 30 (from group2)
      expect(result.owedToUser).toBeCloseTo(50, 0)
      expect(result.userOwes).toBeCloseTo(30, 0)
    })

    it('should return zero for user with no expenses', () => {
      const allGroupsExpenses = [{
        groupId: 'group1',
        expenses: [{
          paidById: 'userA',
          splits: [
            { userId: 'userA', amount: 50, isPaid: false },
            { userId: 'userB', amount: 50, isPaid: false },
          ],
        }],
        settlements: [],
      }]

      const result = service.getOverallBalances(allGroupsExpenses, 'userC')

      expect(result.owedToUser).toBe(0)
      expect(result.userOwes).toBe(0)
    })

    it('should handle user who owes money', () => {
      const allGroupsExpenses = [{
        groupId: 'group1',
        expenses: [{
          paidById: 'userA',
          splits: [
            { userId: 'userA', amount: 30, isPaid: false },
            { userId: 'userB', amount: 70, isPaid: false },
          ],
        }],
        settlements: [],
      }]

      const result = service.getOverallBalances(allGroupsExpenses, 'userB')

      expect(result.owedToUser).toBe(0)
      expect(result.userOwes).toBeCloseTo(70, 0)
    })
  })
})
