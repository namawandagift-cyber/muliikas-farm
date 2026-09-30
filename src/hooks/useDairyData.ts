import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sale, Expense, Buyer, User, DateFilter, DashboardMetrics } from '../types';
import { api, getAppsScriptUrl } from '../services/api';
import { isDateInFilter } from '../utils/formatters';

export function useDairyData() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOnlineDatabase, setIsOnlineDatabase] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const checkConnection = useCallback(async () => {
    const url = getAppsScriptUrl();
    if (!url || !url.startsWith('http')) {
      setIsOnlineDatabase(false);
      return false;
    }
    try {
      const res = await api.getHealth();
      const isOnline = res.success && res.data?.mode !== 'offline-demo';
      setIsOnlineDatabase(isOnline);
      return isOnline;
    } catch {
      setIsOnlineDatabase(false);
      return false;
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const [salesRes, expensesRes, buyersRes, usersRes] = await Promise.all([
        api.getSales(),
        api.getExpenses(),
        api.getBuyers(),
        api.getUsers(),
      ]);

      if (salesRes.success && salesRes.data) {
        setSales(salesRes.data);
      }
      if (expensesRes.success && expensesRes.data) {
        setExpenses(expensesRes.data);
      }
      if (buyersRes.success && buyersRes.data) {
        setBuyers(buyersRes.data);
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }

      await checkConnection();
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching farm data:', err);
      setIsError(true);
      setErrorMessage(err.message || 'Unable to connect to the farm database.');
    } finally {
      setIsLoading(false);
    }
  }, [checkConnection]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Compute metrics for a given date filter
  const getMetrics = useCallback(
    (filter: DateFilter): DashboardMetrics => {
      const filteredSales = sales.filter((s) => isDateInFilter(s.date, filter));
      const filteredExpenses = expenses.filter((e) => isDateInFilter(e.date, filter));

      let totalLitres = 0;
      let totalSales = 0;
      let moneyIn = 0;
      let moneyOwed = 0;

      filteredSales.forEach((s) => {
        totalLitres += Number(s.litres) || 0;
        totalSales += Number(s.totalAmount) || 0;
        moneyIn += Number(s.amountReceived) || 0;
        moneyOwed += Number(s.balance) || 0;
      });

      let moneySpent = 0;
      filteredExpenses.forEach((e) => {
        moneySpent += Number(e.amount) || 0;
      });

      // Strict definition per Section 18 & 21:
      // Profit = Money In (Cash Received) - Money Spent (Expenses)
      const profit = moneyIn - moneySpent;

      return {
        litres: totalLitres,
        sales: totalSales,
        moneyIn,
        moneySpent,
        moneyOwed,
        profit,
        count: filteredSales.length,
      };
    },
    [sales, expenses]
  );

  // All-time outstanding owed to the farm
  const totalAllTimeOwed = useMemo(() => {
    return sales.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);
  }, [sales]);

  // Debtors list: buyers with outstanding balance > 0
  const debtorsList = useMemo(() => {
    const balances: Record<string, { buyer: Buyer; owed: number; unpaidSalesCount: number; lastDate: string }> = {};

    sales.forEach((s) => {
      const bal = Number(s.balance) || 0;
      if (bal > 0) {
        const bId = s.buyerId || s.buyerName;
        if (!balances[bId]) {
          const buyerObj = buyers.find((b) => b.id === s.buyerId) || {
            id: s.buyerId || 'temp',
            name: s.buyerName,
            phone: '',
            location: '',
            pricePerLitre: s.pricePerLitre,
          };
          balances[bId] = {
            buyer: buyerObj,
            owed: 0,
            unpaidSalesCount: 0,
            lastDate: s.date,
          };
        }
        balances[bId].owed += bal;
        balances[bId].unpaidSalesCount += 1;
        if (s.date > balances[bId].lastDate) {
          balances[bId].lastDate = s.date;
        }
      }
    });

    return Object.values(balances).sort((a, b) => b.owed - a.owed);
  }, [sales, buyers]);

  // CRUD Actions
  const handleRecordSale = async (data: Omit<Sale, 'id' | 'createdAt'>) => {
    const res = await api.createSale(data);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to record sale' };
  };

  const handleAddExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    const res = await api.createExpense(data);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to add expense' };
  };

  const handleAddBuyer = async (data: Omit<Buyer, 'id' | 'createdAt'>) => {
    const res = await api.createBuyer(data);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to add buyer' };
  };

  const handleEditBuyer = async (data: Partial<Buyer> & { id: string }) => {
    const res = await api.updateBuyer(data);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to update buyer' };
  };

  const handleDeleteSale = async (id: string) => {
    const res = await api.deleteSale(id);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to delete sale' };
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await api.deleteExpense(id);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to delete expense' };
  };

  const handleDeleteBuyer = async (id: string) => {
    const res = await api.deleteBuyer(id);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to delete buyer' };
  };

  const handleRecordPayment = async (saleId: string, amount: number) => {
    const res = await api.recordPayment(saleId, amount);
    if (res.success) {
      await loadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Failed to record payment' };
  };

  return {
    sales,
    expenses,
    buyers,
    users,
    isLoading,
    isError,
    errorMessage,
    isOnlineDatabase,
    lastUpdated,
    totalAllTimeOwed,
    debtorsList,
    refreshData: loadAllData,
    getMetrics,
    recordSale: handleRecordSale,
    addExpense: handleAddExpense,
    addBuyer: handleAddBuyer,
    editBuyer: handleEditBuyer,
    deleteSale: handleDeleteSale,
    deleteExpense: handleDeleteExpense,
    deleteBuyer: handleDeleteBuyer,
    recordPayment: handleRecordPayment,
  };
}
