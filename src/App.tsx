import React, { useState, useEffect } from 'react';
import { useDairyData } from './hooks/useDairyData';
import { useAuth } from './hooks/useAuth';
import { Sale, Buyer } from './types';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { TodayPage } from './pages/TodayPage';
import { MilkRecordsPage } from './pages/MilkRecordsPage';
import { WeekPage } from './pages/WeekPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { BuyersPage } from './pages/BuyersPage';
import { MorePage } from './pages/MorePage';
import { HerdsmanPage } from './pages/HerdsmanPage';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { RecordMilkModal } from './components/RecordMilkModal';
import { AddExpenseModal } from './components/AddExpenseModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { BuyerModal } from './components/BuyerModal';
import { AddUserModal } from './components/AddUserModal';

export default function App() {
  const {
    sales,
    expenses,
    buyers,
    isLoading,
    isError,
    refreshData,
    recordSale,
    addExpense,
    addBuyer,
    editBuyer,
    deleteSale,
    deleteExpense,
    deleteBuyer,
    recordPayment,
  } = useDairyData();

  // Farm user authentication (Real Google Apps Script auth with Owner & Herdsman roles)
  const {
    currentUser,
    isAuthenticated,
    isOwner,
    isHerdsman,
    users,
    isAuthChecking,
    login,
    googleLogin,
    registerFarm,
    logout,
    createUser,
    updateUser,
  } = useAuth();

  // Navigation state for Owner: 'today' | 'milk' | 'week' | 'expenses' | 'buyers' | 'more'
  const [currentTab, setCurrentTab] = useState<NavTab>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pathname routing support for /register and /login
  const [pathname, setPathname] = useState<string>(() => {
    try {
      return window.location.pathname;
    } catch {
      return '/';
    }
  });

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    try {
      window.history.pushState({}, '', path);
    } catch {
      // ignore
    }
    setPathname(path);
  };

  // Redirect to dashboard on successful login/registration if on auth route
  useEffect(() => {
    if (isAuthenticated && (pathname === '/register' || pathname === '/login')) {
      try {
        window.history.replaceState({}, '', '/dashboard');
        setPathname('/dashboard');
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, pathname]);

  // Modal states
  const [isRecordMilkOpen, setIsRecordMilkOpen] = useState(false);
  const [preselectedBuyerId, setPreselectedBuyerId] = useState<string | undefined>(undefined);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [saleForPayment, setSaleForPayment] = useState<Sale | null>(null);
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [buyerToEdit, setBuyerToEdit] = useState<Buyer | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [prefillRegister, setPrefillRegister] = useState<{ email?: string; name?: string } | null>(null);

  // If not authenticated, render either RegisterScreen or LoginScreen
  if (!isAuthenticated || !currentUser) {
    if (pathname === '/register') {
      return (
        <RegisterScreen
          onRegister={registerFarm}
          onNavigateToLogin={() => {
            setPrefillRegister(null);
            navigateTo('/login');
          }}
          initialOwnerName={prefillRegister?.name}
          initialOwnerEmail={prefillRegister?.email}
          isSubmitting={isAuthChecking}
        />
      );
    }

    return (
      <LoginScreen
        onLogin={login}
        onGoogleLogin={googleLogin}
        onNavigateToRegister={(initialData) => {
          if (initialData) {
            setPrefillRegister(initialData);
          }
          navigateTo('/register');
        }}
        isSubmitting={isAuthChecking}
      />
    );
  }

  const handleLogout = () => {
    logout();
    navigateTo('/login');
  };

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Open Record Milk with optional preselected buyer
  const handleOpenRecordMilk = (buyerId?: string) => {
    setPreselectedBuyerId(buyerId);
    setIsRecordMilkOpen(true);
  };

  // Open Payment modal for specific sale
  const handleOpenPayment = (sale: Sale) => {
    setSaleForPayment(sale);
    setIsPaymentModalOpen(true);
  };

  // Open Buyer modal for creating new buyer
  const handleOpenAddBuyer = () => {
    setBuyerToEdit(null);
    setIsBuyerModalOpen(true);
  };

  // Open Buyer modal for editing buyer
  const handleOpenEditBuyer = (buyer: Buyer) => {
    setBuyerToEdit(buyer);
    setIsBuyerModalOpen(true);
  };

  // Quick inline add buyer handler for RecordMilkModal
  const handleQuickAddBuyer = async (bData: Omit<Buyer, 'id' | 'createdAt'>) => {
    const res = await addBuyer(bData);
    if (res.success) {
      await refreshData();
    }
    return res;
  };

  // Delete sale with confirmation
  const handleDeleteSale = async (id: string, buyerName?: string) => {
    if (buyerName && !window.confirm(`Delete milk record for ${buyerName}?`)) {
      return { success: false };
    }
    return await deleteSale(id);
  };

  return (
    <div className="min-h-screen bg-white text-[#18181b] flex flex-col font-sans pb-20 md:pb-8">
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Owner Navigation (Hidden for Herdsman) */}
      {isOwner && (
        <Navigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
        />
      )}

      {/* Main Content Area */}
      <main className="max-w-2xl w-full mx-auto px-4 py-4 md:py-6 flex-1">
        {/* Subtle non-blocking offline banner if disconnected */}
        {isError && (
          <div className="mb-4 p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs text-[#64748b] flex items-center justify-between">
            <span>Offline mode: Viewing cached farm records.</span>
            <button
              onClick={handleRefresh}
              className="font-bold text-[#166534] hover:underline"
            >
              Refresh
            </button>
          </div>
        )}

        {isLoading ? (
          /* Calm Loading State */
          <div className="py-24 text-center space-y-3">
            <div
              className="inline-block w-7 h-7 border-2 border-[#166534] border-t-transparent rounded-full animate-spin"
              role="status"
            ></div>
            <div className="text-xs font-medium text-[#64748b]">
              Loading DairyPulse...
            </div>
          </div>
        ) : isHerdsman ? (
          /* Herdsman Experience: Fast daily milk entry only, no confidential finances */
          <HerdsmanPage
            sales={sales}
            currentUser={currentUser}
            onOpenRecordMilk={() => handleOpenRecordMilk()}
            onLogout={handleLogout}
            onDeleteRecord={handleDeleteSale}
          />
        ) : (
          /* Owner / Admin Experience: Full farm records, milk history, finances, debtors, users */
          <div>
            {currentTab === 'today' && (
              <TodayPage
                sales={sales}
                onOpenRecordMilk={() => handleOpenRecordMilk()}
                onOpenRecordPayment={handleOpenPayment}
                onDeleteRecord={handleDeleteSale}
              />
            )}

            {currentTab === 'milk' && (
              <MilkRecordsPage
                sales={sales}
                onOpenRecordMilk={() => handleOpenRecordMilk()}
                onOpenRecordPayment={handleOpenPayment}
                onDeleteSale={handleDeleteSale}
              />
            )}

            {currentTab === 'week' && (
              <WeekPage
                sales={sales}
                onOpenRecordPayment={handleOpenPayment}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpensesPage
                expenses={expenses}
                onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                onDeleteExpense={deleteExpense}
              />
            )}

            {currentTab === 'buyers' && (
              <BuyersPage
                buyers={buyers}
                onOpenAddBuyer={handleOpenAddBuyer}
                onOpenEditBuyer={handleOpenEditBuyer}
                onDeleteBuyer={deleteBuyer}
                onOpenRecordMilk={handleOpenRecordMilk}
              />
            )}

            {currentTab === 'more' && (
              <MorePage
                sales={sales}
                currentUser={currentUser}
                users={users}
                onOpenAddUser={() => setIsAddUserOpen(true)}
                onUpdateUser={updateUser}
                onLogout={handleLogout}
                onOpenRecordMilk={() => handleOpenRecordMilk()}
                onOpenRecordPayment={handleOpenPayment}
                onNavigateToRecords={() => setCurrentTab('milk')}
              />
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {/* 1. Record Milk Modal */}
      <RecordMilkModal
        isOpen={isRecordMilkOpen}
        onClose={() => setIsRecordMilkOpen(false)}
        buyers={buyers}
        onSave={recordSale}
        onQuickAddBuyer={handleQuickAddBuyer}
        preselectedBuyerId={preselectedBuyerId}
      />

      {/* 2. Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSaleForPayment(null);
        }}
        sale={saleForPayment}
        onSavePayment={recordPayment}
      />

      {/* 3. Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSave={addExpense}
      />

      {/* 4. Buyer Modal */}
      <BuyerModal
        isOpen={isBuyerModalOpen}
        onClose={() => {
          setIsBuyerModalOpen(false);
          setBuyerToEdit(null);
        }}
        buyerToEdit={buyerToEdit}
        onSaveBuyer={addBuyer}
        onUpdateBuyer={editBuyer}
      />

      {/* 5. Add Farm User Modal (Owner Only) */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSaveUser={createUser}
      />
    </div>
  );
}
