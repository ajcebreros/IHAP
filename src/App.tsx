import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Search, Bell, Menu } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import { loadApplicationData, loadCurrentProfile, saveApplicationSettings, type ApplicationData } from './data.js';
import { Sidebar } from './components/Sidebar.js';
import { UserSidebar } from './components/UserSidebar.js';
import { LoginScreen } from './components/LoginScreen.js';
import { Dashboard } from './components/Dashboard.js';
import { PrintJobsPage } from './components/PrintJobsPage.js';
import { ConsumptionPage } from './components/ConsumptionPage.js';
import { PrintersPage } from './components/PrintersPage.js';
import { DepartmentsPage } from './components/DepartmentsPage.js';
import { AlertsPage } from './components/AlertsPage.js';
import { ReportsPage } from './components/ReportsPage.js';
import { SettingsPage } from './components/SettingsPage.js';
import { UsersPage } from './components/UsersPage.js';
import { RecordConsumptionModal } from './components/RecordConsumptionModal.js';
import { UserDashboard } from './components/UserDashboard.js';
import { UserPrintScreen } from './components/UserPrintScreen.js';
import { UserPrintJobs } from './components/UserPrintJobs.js';
import { UserUsage } from './components/UserUsage.js';
import { UserSettings } from './components/UserSettings.js';
import type { PageKey, User, UserRole } from './types.js';

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [printJobsSearch, setPrintJobsSearch] = useState('');
  const [showRecord, setShowRecord] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      setAuthReady(true);
    }).catch((sessionError: unknown) => {
      if (!mounted) return;
      setError(sessionError instanceof Error ? sessionError.message : 'Unable to restore your Supabase session.');
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      setAuthenticatedUser(null);
      setApplicationData(null);
      setDataLoading(false);
      return;
    }

    let active = true;
    setDataLoading(true);
    setError('');

    void supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (authError) throw authError;
      if (!user) throw new Error('Your Supabase session is no longer valid. Sign in again.');
      const profile = await loadCurrentProfile(user);
      const data = await loadApplicationData(profile);
      if (!active) return;
      setAuthenticatedUser(profile);
      setApplicationData(data);
      setPage('dashboard');
      setError('');
    }).catch((loadError: unknown) => {
      if (!active) return;
      setAuthenticatedUser(null);
      setApplicationData(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your Supabase profile and application data.');
    }).finally(() => {
      if (active) setDataLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authReady, session]);

  const role: UserRole | null = authenticatedUser?.role ?? null;
  const activeAlertCount = applicationData?.alerts.filter((alert) => alert.level !== 'info' && !alert.acknowledged).length ?? 0;

  const handleLogout = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  };

  const handleNavigate = (nextPage: PageKey) => {
    setPage(nextPage);
    setMobileNav(false);
  };

  const handleGlobalSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = globalSearch.trim();
    if (!term) return;
    setPrintJobsSearch(term);
    handleNavigate('print-jobs');
  };

  const handleSettingsChange = async (settings: NonNullable<ApplicationData>['settings']) => {
    await saveApplicationSettings(settings);
    if (authenticatedUser) {
      const refreshed = await loadApplicationData({ ...authenticatedUser });
      setApplicationData(refreshed);
    }
  };

  const refreshApplicationData = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Your Supabase session is no longer valid. Sign in again.');
    const profile = await loadCurrentProfile(user);
    const data = await loadApplicationData(profile);
    setAuthenticatedUser(profile);
    setApplicationData(data);
  };

  if (!authReady || (session && dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Connecting to Supabase…
      </div>
    );
  }

  if (!session) return <LoginScreen error={error} />;

  if (error || !authenticatedUser || !applicationData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="card max-w-lg p-6 space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">Unable to load your account</h1>
          <p role="alert" className="text-sm text-red-600">{error || 'Your Supabase profile or application data is unavailable.'}</p>
          <button type="button" onClick={() => void handleLogout()} className="btn-secondary">Sign out</button>
        </div>
      </div>
    );
  }

  const isUser = role === 'user';
  const pageTitles: Record<string, string> = isUser ? {
    dashboard: 'My Dashboard',
    print: 'Print',
    'print-jobs': 'My Print Jobs',
    consumption: 'My Usage',
    settings: 'Settings',
  } : {
    dashboard: 'Dashboard',
    'print-jobs': 'Print Jobs',
    consumption: 'Paper Consumption',
    printers: 'Printers',
    users: 'Users',
    departments: 'Departments',
    analytics: 'Analytics',
    alerts: 'Alerts',
    reports: 'Reports',
    settings: 'Settings',
  };
  const userPrinters = applicationData.printers.filter((printer) => printer.department === authenticatedUser.department);
  const availableUserPrinters = userPrinters.length > 0
    ? userPrinters
    : applicationData.printers.filter((printer) => printer.online);

  return (
  <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:block">
        {isUser ? (
          <UserSidebar active={page} onNavigate={handleNavigate} onLogout={handleLogout} user={authenticatedUser} />
        ) : (
          <Sidebar active={page} onNavigate={handleNavigate} alertCount={activeAlertCount} onLogout={handleLogout} user={authenticatedUser} />
        )}
      </div>

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="relative animate-slide-in">
            {isUser ? (
              <UserSidebar active={page} onNavigate={handleNavigate} onLogout={handleLogout} user={authenticatedUser} />
            ) : (
              <Sidebar active={page} onNavigate={handleNavigate} alertCount={activeAlertCount} onLogout={handleLogout} user={authenticatedUser} />
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-3.5">
            <button onClick={() => setMobileNav(true)} className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <img src="/ihap-mark.png" alt="IHAP" className="h-6 w-6 object-contain" />
              <h1 className="text-lg font-semibold text-slate-900">{pageTitles[page] || 'Dashboard'}</h1>
            </div>
            <div className="flex-1" />
            {!isUser && (
              <form onSubmit={handleGlobalSearch} role="search" className="relative hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9 w-64"
                  placeholder="Search captured print jobs..."
                  aria-label="Search captured print jobs"
                  value={globalSearch}
                  onChange={(event) => setGlobalSearch(event.target.value)}
                />
                <button type="submit" className="sr-only">Search</button>
              </form>
            )}
            {!isUser && (
              <button onClick={() => handleNavigate('alerts')} className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition">
                <Bell size={20} />
                {activeAlertCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-fade-in" key={page}>
            {isUser && page === 'dashboard' && (
              <UserDashboard user={authenticatedUser} printers={availableUserPrinters} settings={applicationData.settings} printJobs={applicationData.printJobs} dailyConsumption={applicationData.analytics.daily} onNavigate={handleNavigate} />
            )}
            {isUser && page === 'print' && (
              <UserPrintScreen
                user={authenticatedUser}
                printers={availableUserPrinters}
                settings={applicationData.settings}
                onNavigate={handleNavigate}
                onSaved={refreshApplicationData}
              />
            )}
            {isUser && page === 'print-jobs' && <UserPrintJobs printJobs={applicationData.printJobs} />}
            {isUser && page === 'consumption' && (
              <UserUsage user={authenticatedUser} settings={applicationData.settings} printJobs={applicationData.printJobs} dailyConsumption={applicationData.analytics.daily} />
            )}
            {isUser && page === 'settings' && <UserSettings settings={applicationData.settings} user={authenticatedUser} />}

            {!isUser && page === 'dashboard' && (
              <Dashboard printers={applicationData.printers} alerts={applicationData.alerts} settings={applicationData.settings} analytics={applicationData.analytics} onNavigate={handleNavigate} onRecord={() => setShowRecord(true)} />
            )}
            {!isUser && page === 'print-jobs' && (
              <PrintJobsPage printJobs={applicationData.printJobs} searchTerm={printJobsSearch} />
            )}
            {!isUser && page === 'consumption' && <ConsumptionPage analytics={applicationData.analytics} />}
            {!isUser && page === 'printers' && <PrintersPage printers={applicationData.printers} settings={applicationData.settings} />}
            {!isUser && page === 'users' && <UsersPage paperCostPerSheet={applicationData.settings.paperCostPerSheet} />}
            {!isUser && page === 'departments' && <DepartmentsPage departments={applicationData.analytics.departments} />}
            {!isUser && page === 'analytics' && <ConsumptionPage analytics={applicationData.analytics} />}
            {!isUser && page === 'alerts' && <AlertsPage alerts={applicationData.alerts} settings={applicationData.settings} onAcknowledge={async (id) => {
              const result = await supabase.from('alerts').update({ acknowledged: true }).eq('id', id);
              if (result.error) throw new Error(result.error.message);
              setApplicationData((current) => current ? {
                ...current,
                alerts: current.alerts.map((alert) => alert.id === id ? { ...alert, acknowledged: true } : alert),
              } : current);
            }} />}
            {!isUser && page === 'reports' && (
              <ReportsPage
                analytics={applicationData.analytics}
                printers={applicationData.printers}
                printJobs={applicationData.printJobs}
              />
            )}
            {!isUser && page === 'settings' && (
              <SettingsPage settings={applicationData.settings} onChange={handleSettingsChange} printers={applicationData.printers} />
            )}
          </div>
        </main>
      </div>

      {!isUser && (
        <RecordConsumptionModal
          open={showRecord}
          onClose={() => setShowRecord(false)}
          printers={applicationData.printers}
          settings={applicationData.settings}
          onSaved={() => void refreshApplicationData()}
        />
      )}
    </div>
  );
}


function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <AppContent />

      {showSplash && (
        <div
          className="startup-splash"
          role="status"
          aria-label="Loading IHAP"
        >

          <div className="startup-brand">
            <img
              src="/ihap-logo.png"
              alt=""
              className="startup-logo"
            />

            <p className="startup-subtitle">
              Print Management System
            </p>

            <div className="startup-loader" />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
