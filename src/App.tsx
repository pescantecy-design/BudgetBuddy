import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { api } from '@appdeploy/client';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Home,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  Plus,
  Search,
  Bell,
  ChevronRight,
  Utensils,
  Car,
  Clapperboard,
  Receipt,
  Banknote,
  CreditCard,
  Coffee,
  ShoppingBag,
  CalendarDays,
  SlidersHorizontal,
  X,
  Trash2,
  Pencil,
  Moon,
  Sun,
  LogOut,
  Download,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Sparkles,
  Menu,
} from 'lucide-react';
import './index.css';

const SUPABASE_URL = 'https://ykjeynlsrchlssjlvzqm.supabase.co';
const APP_URL = 'https://budget-ael3z9.v2.appdeploy.ai';
const SUPABASE_KEY = 'sb_publishable_I0Q0yN7XoI4YwPCcfZ_aEg_NgwQS3bW';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const money = (n: number, c = 'PHP') =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => today().slice(0, 7) + '-01';
const categoryIcons: Record<string, any> = {
  'Food & Drinks': Utensils,
  Transport: Car,
  Entertainment: Clapperboard,
  'Bills & Utilities': Receipt,
  Salary: Banknote,
  Shopping: ShoppingBag,
};
const colors = [
  '#4F5BD5',
  '#25A77A',
  '#E9798A',
  '#E8A34B',
  '#6D9FE8',
  '#9B7BD4',
];
type Row = { id: string; [key: string]: any };
const cropAvatarToSquare = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const left = Math.floor((bitmap.width - side) / 2);
  const top = Math.floor((bitmap.height - side) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Unable to prepare this profile photo.');
  }
  context.drawImage(bitmap, left, top, side, side, 0, 0, side, side);
  bitmap.close();
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Unable to crop this profile photo.')),
      file.type,
      file.type === 'image/jpeg' ? 0.92 : undefined
    );
  });
};
function App() {
  const [user, setUser] = useState<any>(null),
    [boot, setBoot] = useState(true),
    [page, setPage] = useState('Home'),
    [authMode, setAuthMode] = useState('login'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [displayName, setDisplayName] = useState(''),
    [authError, setAuthError] = useState(''),
    [busy, setBusy] = useState(false),
    [onboard, setOnboard] = useState(!localStorage.getItem('budget-onboarded')),
    [confirmPassword, setConfirmPassword] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [termsAccepted, setTermsAccepted] = useState(false),
    [resetMode, setResetMode] = useState(false),
    [resetSent, setResetSent] = useState(false),
    [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email'),
    [resetCode, setResetCode] = useState(''),
    [resetGrant, setResetGrant] = useState(''),
    [resetNewPassword, setResetNewPassword] = useState(''),
    [resetConfirmPassword, setResetConfirmPassword] = useState(''),
    [setupRequired, setSetupRequired] = useState(false),
    [setupIncome, setSetupIncome] = useState(''),
    [setupCurrency, setSetupCurrency] = useState('PHP'),
    [recoveryMode, setRecoveryMode] = useState(false),
    [newPassword, setNewPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [authFlowPending, setAuthFlowPending] = useState(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const googleVerificationStarted = useRef<Set<string>>(new Set());
  const [editingBudget, setEditingBudget] = useState<Row | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Row | null>(null);
  const [managing, setManaging] = useState<{ type: 'account' | 'category'; item: Row } | null>(null);
  const [managedDetails, setManagedDetails] = useState<{ type: 'account' | 'category'; item: Row } | null>(null);
  const [profile, setProfile] = useState<any>({
      currency: 'PHP',
      monthly_income: 0,
    }),
    [profileName, setProfileName] = useState(''),
    [profileEmail, setProfileEmail] = useState(''),
    [profilePassword, setProfilePassword] = useState(''),
    [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [profileAccordionOpen, setProfileAccordionOpen] = useState(false);
  const [accounts, setAccounts] = useState<Row[]>([]),
    [categories, setCategories] = useState<Row[]>([]),
    [budgets, setBudgets] = useState<Row[]>([]),
    [transactions, setTransactions] = useState<Row[]>([]),
    [savingsGoals, setSavingsGoals] = useState<Row[]>([]),
    [billReminders, setBillReminders] = useState<Row[]>([]);
  const [dark, setDark] = useState(
      localStorage.getItem('budget-theme') === 'dark'
    ),
    [modal, setModal] = useState(''),
    [editing, setEditing] = useState<Row | null>(null),
    [editingGoal, setEditingGoal] = useState<Row | null>(null),
    [goalForm, setGoalForm] = useState<any>({ name: '', target_amount: '', saved_amount: '0', target_date: '' }),
    [editingBill, setEditingBill] = useState<Row | null>(null),
    [billForm, setBillForm] = useState<any>({ title: '', amount: '', due_date: today(), reminder_days_before: '1', notes: '' }),
    [selected, setSelected] = useState<Row | null>(null),
    [toast, setToast] = useState(''),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [categoryFilter, setCategoryFilter] = useState('all'),
    [dateFrom, setDateFrom] = useState(''),
    [dateTo, setDateTo] = useState(''),
    [period, setPeriod] = useState('Month'),
    [printReport, setPrintReport] = useState(false),
    [kind, setKind] = useState('expense'),
    [form, setForm] = useState<any>({
      amount: '',
      category_id: '',
      account_id: '',
      note: '',
      occurred_on: today(),
    }),
    [limitForm, setLimitForm] = useState<any>({ category_id: '', amount: '' }),
    [accountForm, setAccountForm] = useState<any>({
      name: '',
      type: 'cash',
      balance: '0',
    }),
    [categoryForm, setCategoryForm] = useState<any>({
      name: '',
      kind: 'expense',
      color: '#4F5BD5',
    }),
    [currency, setCurrency] = useState('PHP');
  const notify = (s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(''), 2600);
  };
  const openManagedDetails = (type: 'account' | 'category', item: Row) => {
    setManagedDetails({ type, item });
  };
  const openManagedEdit = (type: 'account' | 'category', item: Row) => {
    setManagedDetails(null);
    setManaging({ type, item });
    if (type === 'account') {
      setAccountForm({ name: item.name || '', type: item.type || 'cash', balance: String(item.balance ?? 0) });
      setModal('account');
    } else {
      setCategoryForm({ name: item.name || '', kind: item.kind === 'income' ? 'income' : 'expense', color: item.color || '#4F5BD5' });
      setModal('category');
    }
  };
  const deleteManagedRow = async (target = managing) => {
    if (!target || !user) return;
    const { type, item } = target;
    const label = type === 'account' ? 'account' : 'category';
    if (!window.confirm(`Delete ${label} "${item.name}"? This cannot be undone.`)) return;
    setBusy(true);
    const table = type === 'account' ? 'accounts' : 'categories';
    const foreignKey = type === 'account' ? 'account_id' : 'category_id';
    const linkedTransactions = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq(foreignKey, item.id).eq('user_id', user.id);
    const linkedBudgets = type === 'category'
      ? await supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('category_id', item.id).eq('user_id', user.id)
      : { count: 0, error: null };
    if (linkedTransactions.error || linkedBudgets.error) {
      setBusy(false);
      notify('Could not check linked records. Please try again.');
      return;
    }
    if ((linkedTransactions.count || 0) > 0 || (linkedBudgets.count || 0) > 0) {
      setBusy(false);
      notify(type === 'account'
        ? 'This account has transactions. Reassign those transactions before deleting it.'
        : 'This category has transactions or budgets. Reassign or remove those records before deleting it.');
      return;
    }
    const { error } = await supabase.from(table).delete().eq('id', item.id).eq('user_id', user.id);
    setBusy(false);
    if (error) {
      notify(error.message);
    } else {
      setModal('');
      setManaging(null);
      setManagedDetails(null);
      await load(user.id);
      notify(`${type === 'account' ? 'Account' : 'Category'} deleted`);
    }
  };
  const load = async (uid: string) => {
    const [p, a, c, b, t, g, bills] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('accounts').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('categories').select('*').eq('user_id', uid).order('name'),
      supabase
        .from('budgets')
        .select('*,categories(*)')
        .eq('user_id', uid)
        .order('month', { ascending: false }),
      supabase
        .from('transactions')
        .select('*,accounts(name,type),categories(name,color,icon)')
        .eq('user_id', uid)
        .order('occurred_on', { ascending: false })
        .limit(500),
      supabase.from('savings_goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('bill_reminders').select('*').eq('user_id', uid).order('due_date', { ascending: true }),
    ]);
    if (p.data) {
      setProfile(p.data);
      setProfileName(p.data.display_name || '');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setProfileEmail(currentUser?.email || '');
      setCurrency(p.data.currency || 'PHP');
    }
    if (a.data) setAccounts(a.data);
    if (c.data) setCategories(c.data);
    if (b.data) setBudgets(b.data);
    if (t.data) setTransactions(t.data);
    if (g.data) setSavingsGoals(g.data);
    if (bills.data) setBillReminders(bills.data);
  };
  const isGoogleUser = (authUser: any) => authUser?.app_metadata?.provider === 'google' || (authUser?.identities || []).some((identity: any) => identity.provider === 'google');
  const beginGoogleVerification = async (googleUser: any) => {
    const userId = String(googleUser?.id || '');
    const cleanEmail = String(googleUser?.email || '').trim().toLowerCase();
    if (!userId || !cleanEmail) {
      setUser(null);
      setAuthError('Google did not return an email address. Please choose a Google account with an email address.');
      await supabase.auth.signOut({ scope: 'local' });
      return;
    }
    const pendingKey = 'budget-google-pending:' + userId;
    const verifiedKey = 'budget-google-verified:' + userId;
    const savedPending = localStorage.getItem(pendingKey);
    if (savedPending) {
      try {
        setPendingVerification(JSON.parse(savedPending));
        setUser(null);
        setVerificationCode(['', '', '', '', '', '']);
        return;
      } catch { localStorage.removeItem(pendingKey); }
    }
    if (localStorage.getItem(verifiedKey) === 'yes') {
      setUser(googleUser);
      load(userId);
      setSetupRequired(!localStorage.getItem('budget-setup-' + userId));
      return;
    }
    if (googleVerificationStarted.current.has(userId)) return;
    googleVerificationStarted.current.add(userId);
    setUser(null);
    setAuthFlowPending(true);
    setVerifyError('');
    try {
      await api.post('/api/email-verification/start', { email: cleanEmail, userId, purpose: 'google' });
      const pending = { email: cleanEmail, userId, purpose: 'google' };
      localStorage.setItem(pendingKey, JSON.stringify(pending));
      setPendingVerification(pending);
      setVerificationCode(['', '', '', '', '', '']);
      setTrustDevice(false);
      setResendSeconds(60);
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || 'Unable to send your Google sign-in verification code.';
      setAuthError(message);
      notify(message);
      await supabase.auth.signOut({ scope: 'local' });
    } finally { setAuthFlowPending(false); }
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const authUser = data.session?.user;
      if (authUser && isGoogleUser(authUser)) {
        beginGoogleVerification(authUser);
      } else {
        setUser(authUser || null);
        if (authUser) {
          load(authUser.id);
          setSetupRequired(!localStorage.getItem('budget-setup-' + authUser.id));
        }
      }
      setBoot(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (s?.user && isGoogleUser(s.user)) {
        if (event === 'SIGNED_IN') {
          localStorage.removeItem('budget-google-verified:' + s.user.id);
          localStorage.removeItem('budget-google-pending:' + s.user.id);
          googleVerificationStarted.current.delete(s.user.id);
        }
        beginGoogleVerification(s.user);
        return;
      }
      setUser(s?.user || null);
      if (s?.user) {
        load(s.user.id);
        setSetupRequired(!localStorage.getItem('budget-setup-' + s.user.id));
      } else {
        setSetupRequired(false);
        setAccounts([]);
        setCategories([]);
        setBudgets([]);
        setTransactions([]);
        setSavingsGoals([]);
        setBillReminders([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('budget-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => {
    if (!pendingVerification || resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [pendingVerification, resendSeconds]);
  const expenses = transactions.filter(t => t.kind === 'expense'),
    income = transactions.filter(t => t.kind === 'income');
  const spent = expenses
      .filter(t => t.occurred_on >= monthStart())
      .reduce((a, t) => a + Number(t.amount), 0),
    earned = income
      .filter(t => t.occurred_on >= monthStart())
      .reduce((a, t) => a + Number(t.amount), 0);
  const monthlyBudget = budgets
      .filter(b => b.month === monthStart())
      .reduce((a, b) => a + Number(b.amount), 0),
    remaining = monthlyBudget - spent;
  const budgetRows = budgets
    .filter(b => b.month === monthStart())
    .map(b => ({
      ...b,
      spent: expenses
        .filter(
          t => t.category_id === b.category_id && t.occurred_on >= monthStart()
        )
        .reduce((a, t) => a + Number(t.amount), 0),
    }));
  const billDueState = (bill: Row) => {
    const due = new Date(bill.due_date + 'T00:00:00');
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - current.getTime()) / 86400000);
    const reminderActive = !bill.paid_at && days >= 0 && days <= Number(bill.reminder_days_before ?? 1);
    return {
      days,
      overdue: !bill.paid_at && days < 0,
      reminderActive,
      label: bill.paid_at ? 'Paid' : days < 0 ? `Overdue by ${Math.abs(days)}d` : days === 0 ? 'Due today' : `Due in ${days}d`,
    };
  };
  const sortedBills = [...billReminders].sort((a, b) => {
    if (Boolean(a.paid_at) !== Boolean(b.paid_at)) return a.paid_at ? 1 : -1;
    return String(a.due_date).localeCompare(String(b.due_date));
  });
  const overdueBillsCount = billReminders.filter(b => billDueState(b).overdue).length;
  const dailyLimit =
    Math.max(0, remaining) /
    Math.max(
      1,
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
      ).getDate() -
        new Date().getDate() +
        1
    );
  const visible = transactions.filter(
    t =>
      (filter === 'all' || t.kind === filter) &&
      (categoryFilter === 'all' || t.category_id === categoryFilter) &&
      (!dateFrom || t.occurred_on >= dateFrom) &&
      (!dateTo || t.occurred_on <= dateTo) &&
      (!query ||
        [t.note, t.categories?.name, t.accounts?.name]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()))
  );
  const reportRows = useMemo(() => {
    const map = new Map<string, number>();
    expenses
      .filter(t =>
        period === 'Today'
          ? t.occurred_on === today()
          : period === 'Week'
            ? new Date(t.occurred_on) >= new Date(Date.now() - 7 * 86400000)
            : period === 'Year'
              ? t.occurred_on.slice(0, 4) === today().slice(0, 4)
              : t.occurred_on.slice(0, 7) === today().slice(0, 7)
      )
      .forEach(t => {
        const n = t.categories?.name || 'Other';
        map.set(n, (map.get(n) || 0) + Number(t.amount));
      });
    return [...map].map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [transactions, period]);
  const monthBars = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - 5 + i);
        const key = d.toISOString().slice(0, 7);
        return {
          month: d.toLocaleDateString('en', { month: 'short' }),
          income: income
            .filter(t => t.occurred_on.startsWith(key))
            .reduce((a, t) => a + Number(t.amount), 0),
          expense: expenses
            .filter(t => t.occurred_on.startsWith(key))
            .reduce((a, t) => a + Number(t.amount), 0),
        };
      }),
    [transactions]
  );
  const authSubmit = async (e: any) => {
    e.preventDefault();
    setAuthError('');
    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords do not match.'); return;
    }
    if (authMode === 'signup' && !termsAccepted) {
      setAuthError('Please accept the Terms and Privacy Policy.'); return;
    }
    setBusy(true);
    setAuthFlowPending(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (authMode === 'signup') {
        const response = await api.post('/api/email-verification/start', {
          email: cleanEmail, password, displayName: displayName.trim(), purpose: 'signup',
        });
        setPendingVerification({ email: cleanEmail, userId: response.data.userId, password, purpose: 'signup' });
        setVerificationCode(['', '', '', '', '', '']);
        setVerifyError('');
        setTrustDevice(false);
        setResendSeconds(60);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        const userId = data.user.id;
        await supabase.auth.signOut({ scope: 'local' });
        const deviceToken = localStorage.getItem('budget-trusted-device:' + cleanEmail) || '';
        const response = await api.post('/api/email-verification/start', {
          email: cleanEmail, userId, purpose: 'login', deviceToken,
        });
        if (response.data.trusted) {
          const login = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          if (login.error) throw login.error;
        } else {
          setPendingVerification({ email: cleanEmail, userId, password, purpose: 'login' });
          setVerificationCode(['', '', '', '', '', '']);
          setVerifyError('');
          setTrustDevice(false);
          setResendSeconds(60);
        }
      }
    } catch (err: any) {
      const rawMessage = err?.response?.data?.error || err.message || 'Unable to authenticate';
      const message = /resend|testing emails|verify a domain|validation_error|statuscode.*403/i.test(rawMessage)
        ? 'We could not send the verification email. Email delivery needs a verified sending domain. Please contact support or try again later.'
        : rawMessage;
      setAuthError(message);
      notify(message.toLowerCase().includes('invalid login') ? 'Wrong email or password.' : message);
    } finally {
      setAuthFlowPending(false);
      setBusy(false);
    }
  };
  const submitVerification = async (e: any) => {
    e.preventDefault();
    if (!pendingVerification) return;
    const code = verificationCode.join('');
    if (!/^\d{6}$/.test(code)) { setVerifyError('Enter all six digits.'); return; }
    setBusy(true);
    setAuthFlowPending(true);
    setVerifyError('');
    try {
      const response = await api.post('/api/email-verification/verify', {
        email: pendingVerification.email,
        userId: pendingVerification.userId,
        purpose: pendingVerification.purpose,
        code,
        trustDevice,
      });
      if (response.data.trustedDeviceToken) {
        localStorage.setItem('budget-trusted-device:' + pendingVerification.email, response.data.trustedDeviceToken);
      }
      if (pendingVerification.purpose === 'google') {
        localStorage.setItem('budget-google-verified:' + pendingVerification.userId, 'yes');
        localStorage.removeItem('budget-google-pending:' + pendingVerification.userId);
        const { data: currentUser, error: currentUserError } = await supabase.auth.getUser();
        if (currentUserError || !currentUser.user) throw currentUserError || new Error('Your Google session expired. Please sign in again.');
        setUser(currentUser.user);
        load(currentUser.user.id);
        setSetupRequired(!localStorage.getItem('budget-setup-' + currentUser.user.id));
      } else {
        const login = await supabase.auth.signInWithPassword({
          email: pendingVerification.email,
          password: pendingVerification.password,
        });
        if (login.error) throw login.error;
      }
      setPendingVerification(null);
      setVerificationCode(['', '', '', '', '', '']);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || 'Unable to verify this code.';
      setVerifyError(message);
    } finally {
      setAuthFlowPending(false);
      setBusy(false);
    }
  };
  const resendVerification = async () => {
    if (!pendingVerification || resendSeconds > 0 || busy) return;
    setBusy(true);
    setVerifyError('');
    try {
      await api.post('/api/email-verification/start', {
        email: pendingVerification.email,
        userId: pendingVerification.userId,
        purpose: pendingVerification.purpose,
      });
      setResendSeconds(60);
      setVerificationCode(['', '', '', '', '', '']);
      notify('A new verification code was sent.');
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || 'Unable to resend the code.';
      setVerifyError(message);
      if (message.match(/(wait|seconds)/i)) setResendSeconds(60);
    } finally { setBusy(false); }
  };
  const changeVerificationEmail = () => {
    if (!pendingVerification) return;
    if (pendingVerification.purpose === 'google') {
      localStorage.removeItem('budget-google-pending:' + pendingVerification.userId);
      googleVerificationStarted.current.delete(pendingVerification.userId);
      setPendingVerification(null);
      setVerificationCode(['', '', '', '', '', '']);
      setVerifyError('');
      supabase.auth.signOut({ scope: 'local' });
      return;
    }
    setEmail(pendingVerification.email);
    setAuthMode(pendingVerification.purpose === 'signup' ? 'signup' : 'login');
    setPendingVerification(null);
    setVerificationCode(['', '', '', '', '', '']);
    setVerifyError('');
    setAuthError('');
  };
  const updateVerificationDigit = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    if (digits.length > 1) {
      const next = [...verificationCode];
      digits.split('').forEach((digit, offset) => { if (index + offset < 6) next[index + offset] = digit; });
      setVerificationCode(next);
      codeRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }
    const next = [...verificationCode];
    next[index] = digits;
    setVerificationCode(next);
    if (digits && index < 5) codeRefs.current[index + 1]?.focus();
  };
  const sendPasswordReset = async (e: any) => {
    e.preventDefault(); setBusy(true); setAuthError('');
    try {
      await api.post('/api/password-reset/start', { email: email.trim() });
      setResetStep('code'); setResetCode(''); setResetSent(true);
      notify('If the account exists, a reset code has been sent.');
    } catch (err: any) {
      const message = err?.response?.data?.error || err.message || 'Unable to send a reset code.';
      setAuthError(message);
    } finally { setBusy(false); }
  };
  const verifyPasswordResetCode = async (e: any) => {
    e.preventDefault(); setBusy(true); setAuthError('');
    try {
      const result = await api.post('/api/password-reset/verify', { email: email.trim(), code: resetCode });
      setResetGrant(result.data.resetGrant); setResetStep('password'); setAuthError('');
      notify('Code verified. Choose your new password.');
    } catch (err: any) {
      setAuthError(err?.response?.data?.error || err.message || 'That code could not be verified.');
    } finally { setBusy(false); }
  };
  const completePasswordReset = async (e: any) => {
    e.preventDefault(); setAuthError('');
    if (resetNewPassword.length < 8) { setAuthError('Password must be at least 8 characters.'); return; }
    if (resetNewPassword !== resetConfirmPassword) { setAuthError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await api.post('/api/password-reset/complete', { resetGrant, password: resetNewPassword });
      setResetMode(false); setResetSent(false); setResetStep('email'); setResetCode(''); setResetGrant('');
      setResetNewPassword(''); setResetConfirmPassword(''); setPassword('');
      setAuthError(''); notify('Password updated. You can now log in.');
    } catch (err: any) {
      setAuthError(err?.response?.data?.error || err.message || 'Unable to update your password.');
    } finally { setBusy(false); }
  };
  const saveRecoveredPassword = async (e: any) => {
    e.preventDefault();
    if (newPassword.length < 8) { notify('Use at least 8 characters for your new password.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) notify(error.message);
    else { setRecoveryMode(false); setNewPassword(''); notify('Password updated successfully.'); }
  };
  const finishSetup = async (e: any) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from('profiles').update({ currency: setupCurrency, monthly_income: Number(setupIncome || 0) }).eq('id', user.id);
    setBusy(false);
    if (error) { notify(error.message); return; }
    localStorage.setItem('budget-setup-' + user.id, 'yes');
    setSetupRequired(false); setCurrency(setupCurrency); await load(user.id); notify('Your budget is ready.');
  };
  const openAdd = () => {
    setEditing(null);
    setKind('expense');
    setForm({
      amount: '',
      category_id: categories.find(c => c.kind === 'expense')?.id || '',
      account_id: accounts[0]?.id || '',
      note: '',
      occurred_on: today(),
    });
    setModal('transaction');
  };
  const saveTx = async (e: any) => {
    e.preventDefault();
    if (!Number(form.amount) || Number(form.amount) <= 0 || !form.account_id) {
      notify('Enter a valid amount and choose an account');
      return;
    }
    setBusy(true);
    const payload = {
      user_id: user.id,
      account_id: form.account_id,
      category_id: form.category_id || null,
      kind,
      amount: Number(form.amount),
      note: form.note,
      occurred_on: form.occurred_on,
    };
    const res = editing
      ? await supabase.from('transactions').update(payload).eq('id', editing.id).eq('user_id', user.id)
      : await supabase.from('transactions').insert(payload);
    setBusy(false);
    if (res.error) {
      notify(res.error.message);
      return;
    }
    setModal('');
    setEditing(null);
    await load(user.id);
    notify(editing ? 'Transaction updated' : 'Transaction saved');
  };
  const editTx = (t: Row) => {
    setEditing(t);
    setKind(t.kind);
    setForm({
      amount: String(t.amount),
      category_id: t.category_id || '',
      account_id: t.account_id,
      note: t.note,
      occurred_on: t.occurred_on,
    });
    setSelected(null);
    setModal('transaction');
  };
  const deleteTx = async (t: Row) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', t.id)
      .eq('user_id', user.id);
    if (error) notify(error.message);
    else {
      setSelected(null);
      await load(user.id);
      notify('Transaction deleted');
    }
  };
  const saveBudget = async (e: any) => {
    e.preventDefault();
    if (!limitForm.category_id || !Number(limitForm.amount) || Number(limitForm.amount) <= 0) {
      notify('Choose a category and enter a valid monthly limit.');
      return;
    }
    setBusy(true);
    const payload = {
      user_id: user.id,
      category_id: limitForm.category_id,
      month: editingBudget?.month || monthStart(),
      amount: Number(limitForm.amount),
    };
    const result = editingBudget
      ? await supabase.from('budgets').update(payload).eq('id', editingBudget.id).eq('user_id', user.id)
      : await supabase.from('budgets').upsert(payload, { onConflict: 'user_id,category_id,month' });
    setBusy(false);
    if (result.error) notify(result.error.message);
    else {
      setModal('');
      setEditingBudget(null);
      await load(user.id);
      notify(editingBudget ? 'Budget updated' : 'Budget saved');
    }
  };
  const deleteBudget = async (b: Row) => {
    if (!window.confirm(`Delete the ${b.categories?.name || 'category'} budget?`)) return;
    const { error } = await supabase.from('budgets').delete().eq('id', b.id).eq('user_id', user.id);
    if (error) notify(error.message);
    else {
      setSelectedBudget(null);
      await load(user.id);
      notify('Budget deleted');
    }
  };
  const saveGoal = async (e: any) => {
    e.preventDefault();
    const name = String(goalForm.name || '').trim();
    const targetAmount = Number(goalForm.target_amount);
    const savedAmount = Number(goalForm.saved_amount || 0);
    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(savedAmount) || savedAmount < 0) {
      notify('Enter a goal name, a target above zero, and a valid saved amount.');
      return;
    }
    setBusy(true);
    const payload = {
      user_id: user.id,
      name,
      target_amount: targetAmount,
      saved_amount: savedAmount,
      target_date: goalForm.target_date || null,
    };
    const result = editingGoal
      ? await supabase.from('savings_goals').update(payload).eq('id', editingGoal.id).eq('user_id', user.id)
      : await supabase.from('savings_goals').insert(payload);
    setBusy(false);
    if (result.error) {
      notify(result.error.message);
    } else {
      setModal('');
      setEditingGoal(null);
      setGoalForm({ name: '', target_amount: '', saved_amount: '0', target_date: '' });
      await load(user.id);
      notify(editingGoal ? 'Savings goal updated' : 'Savings goal created');
    }
  };
  const deleteGoal = async (goal: Row) => {
    if (!window.confirm(`Delete the savings goal "${goal.name}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from('savings_goals').delete().eq('id', goal.id).eq('user_id', user.id);
    setBusy(false);
    if (error) notify(error.message);
    else {
      setModal('');
      setEditingGoal(null);
      await load(user.id);
      notify('Savings goal deleted');
    }
  };
  const saveBill = async (e: any) => {
    e.preventDefault();
    const title = String(billForm.title || '').trim();
    const amount = Number(billForm.amount);
    const dueDate = String(billForm.due_date || '');
    const reminderDays = Number(billForm.reminder_days_before);
    if (!title || !Number.isFinite(amount) || amount <= 0 || !dueDate || ![0, 1, 3, 7].includes(reminderDays)) {
      notify('Enter a bill name, valid amount, due date and reminder schedule.');
      return;
    }
    setBusy(true);
    const payload = {
      user_id: user.id,
      title,
      amount,
      due_date: dueDate,
      reminder_days_before: reminderDays,
      notes: String(billForm.notes || '').trim() || null,
    };
    const result = editingBill
      ? await supabase.from('bill_reminders').update(payload).eq('id', editingBill.id).eq('user_id', user.id)
      : await supabase.from('bill_reminders').insert(payload);
    setBusy(false);
    if (result.error) {
      notify(result.error.message);
    } else {
      setModal('');
      setEditingBill(null);
      setBillForm({ title: '', amount: '', due_date: today(), reminder_days_before: '1', notes: '' });
      await load(user.id);
      notify(editingBill ? 'Bill reminder updated' : 'Bill reminder added');
    }
  };
  const toggleBillPaid = async (bill: Row) => {
    setBusy(true);
    const { error } = await supabase.from('bill_reminders').update({ paid_at: bill.paid_at ? null : new Date().toISOString() }).eq('id', bill.id).eq('user_id', user.id);
    setBusy(false);
    if (error) notify(error.message);
    else {
      await load(user.id);
      notify(bill.paid_at ? 'Bill marked unpaid' : 'Bill marked as paid');
    }
  };
  const deleteBill = async (bill: Row) => {
    if (!window.confirm(`Delete the bill reminder "${bill.title}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from('bill_reminders').delete().eq('id', bill.id).eq('user_id', user.id);
    setBusy(false);
    if (error) notify(error.message);
    else {
      setModal('');
      setEditingBill(null);
      await load(user.id);
      notify('Bill reminder deleted');
    }
  };
  const saveAccount = async (e: any) => {
    e.preventDefault();
    const name = accountForm.name.trim();
    const balance = Number(accountForm.balance);
    if (!name || !Number.isFinite(balance)) {
      notify('Enter an account name and a valid starting balance.');
      return;
    }
    setBusy(true);
    const isEditing = managing?.type === 'account';
    const result = isEditing
      ? await supabase.from('accounts').update({ name, type: accountForm.type, balance }).eq('id', managing!.item.id).eq('user_id', user.id)
      : await supabase.from('accounts').insert({ user_id: user.id, name, type: accountForm.type, balance });
    setBusy(false);
    if (result.error) notify(result.error.message);
    else {
      setModal('');
      setManaging(null);
      setAccountForm({ name: '', type: 'cash', balance: '0' });
      await load(user.id);
      notify(isEditing ? 'Account updated' : 'Account added');
    }
  };
  const saveCategory = async (e: any) => {
    e.preventDefault();
    const name = categoryForm.name.trim();
    if (!name || !/^#[0-9A-Fa-f]{6}$/.test(categoryForm.color)) {
      notify('Enter a category name and choose a valid color.');
      return;
    }
    setBusy(true);
    const isEditing = managing?.type === 'category';
    const result = isEditing
      ? await supabase.from('categories').update({ name, kind: categoryForm.kind, color: categoryForm.color }).eq('id', managing!.item.id).eq('user_id', user.id)
      : await supabase.from('categories').insert({ user_id: user.id, name, kind: categoryForm.kind, color: categoryForm.color, icon: 'circle' });
    setBusy(false);
    if (result.error) notify(result.error.message);
    else {
      setModal('');
      setManaging(null);
      await load(user.id);
      notify(isEditing ? 'Category updated' : 'Category added');
    }
  };
  const saveProfile = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ currency, monthly_income: Number(profile.monthly_income || 0) })
      .eq('id', user.id);
    if (error) notify(error.message);
    else {
      await load(user.id);
      notify('Settings saved');
    }
  };
  const saveProfileDetails = async (e: any) => {
    e.preventDefault();
    const cleanName = profileName.trim();
    const cleanEmail = profileEmail.trim().toLowerCase();
    if (!cleanName) { notify('Please enter your full name.'); return; }
    if (!cleanEmail) { notify('Please enter your email address.'); return; }
    setBusy(true);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: cleanName })
      .eq('id', user.id);
    if (profileError) {
      setBusy(false);
      notify(profileError.message);
      return;
    }
    const { error: metadataError } = await supabase.auth.updateUser({ data: { display_name: cleanName } });
    if (metadataError) {
      setBusy(false);
      notify(metadataError.message);
      return;
    }
    let emailChanged = false;
    if (cleanEmail !== String(user.email || '').toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({ email: cleanEmail });
      if (emailError) {
        setBusy(false);
        await load(user.id);
        notify('Name saved, but email was not changed: ' + emailError.message);
        return;
      }
      emailChanged = true;
    }
    setBusy(false);
    await load(user.id);
    notify(emailChanged ? 'Name saved. Check your inbox to confirm the new email.' : 'Profile updated');
  };
  const updateProfilePassword = async (e: any) => {
    e.preventDefault();
    if (profilePassword.length < 8) { notify('Use at least 8 characters for your new password.'); return; }
    if (profilePassword !== profilePasswordConfirm) { notify('Passwords do not match.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: profilePassword });
    setBusy(false);
    if (error) notify(error.message);
    else {
      setProfilePassword('');
      setProfilePasswordConfirm('');
      notify('Password updated successfully');
    }
  };
  const uploadProfileAvatar = async (e: any) => {
    const file = e.target.files?.[0] as File | undefined;
    if (!file || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify('Choose a JPG, PNG or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Profile photos must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = user.id + '/avatar.' + extension;
    setBusy(true);
    let croppedFile: Blob;
    try {
      croppedFile = await cropAvatarToSquare(file);
    } catch (cropError: any) {
      setBusy(false);
      notify(cropError?.message || 'Unable to prepare this profile photo.');
      e.target.value = '';
      return;
    }
    const { error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(path, croppedFile, { upsert: true, contentType: file.type, cacheControl: '3600' });
    if (uploadError) {
      setBusy(false);
      notify(uploadError.message);
      e.target.value = '';
      return;
    }
    const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path);
    const avatarUrl = data.publicUrl + '?v=' + Date.now();
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);
    setBusy(false);
    e.target.value = '';
    if (saveError) notify(saveError.message);
    else {
      setProfile(current => ({ ...current, avatar_url: avatarUrl }));
      await load(user.id);
      notify('Profile photo updated');
    }
  };
  const exportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Account', 'Note', 'Amount'],
      ...visible.map(t => [
        t.occurred_on,
        t.kind,
        t.categories?.name || 'Uncategorized',
        t.accounts?.name || 'Account',
        t.note || '',
        Number(t.amount || 0).toFixed(2),
      ]),
    ];
    const csv = rows
      .map(r =>
        r.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')
      )
      .join(String.fromCharCode(10));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget-transactions-' + today() + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportPDF = () => {
    setPrintReport(true);
    window.setTimeout(() => {
      const finishPrint = () => {
        setPrintReport(false);
        window.removeEventListener('afterprint', finishPrint);
      };
      window.addEventListener('afterprint', finishPrint);
      window.print();
    }, 150);
  };
  const finishOnboard = () => {
    localStorage.setItem('budget-onboarded', 'yes');
    setOnboard(false);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setPage('Home');
  };
  if (boot)
    return (
      <div className="splash">
        <img className="brandmark" src="/budget-logo.svg" alt="Budget wallet logo" />
        <b>Budget</b>
        <span>Make every peso count.</span>
      </div>
    );
  if (authFlowPending) return <div className="splash"><img className="brandmark" src="/budget-logo.svg" alt="Budget wallet logo" /><b>Budget</b><span>Securing your sign-in…</span></div>;
  if (!user && pendingVerification)
    return (
      <div className="auth-shell">
        <div className="auth-card verify-card">
          <img className="brandmark" src="/budget-logo.svg" alt="Budget wallet logo" />
          <span className="eyebrow">{pendingVerification.purpose === 'google' ? 'GOOGLE EMAIL VERIFICATION' : 'EMAIL VERIFICATION'}</span>
          <h1>Check your email</h1>
          <p className="muted">{pendingVerification.purpose === 'google' ? 'Google account selected. We sent a 6-digit security code to ' : 'We sent a 6-digit code to '}<b>{pendingVerification.email}</b>. It expires in 10 minutes.</p>
          <form className="stack verify-form" onSubmit={submitVerification}>
            <div className="verify-code-grid" aria-label="Six-digit verification code">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={element => { codeRefs.current[index] = element; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  aria-label={`Verification digit ${index + 1}`}
                  value={digit}
                  onChange={event => updateVerificationDigit(index, event.target.value)}
                  onPaste={event => {
                    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    if (pasted) { event.preventDefault(); updateVerificationDigit(0, pasted); }
                  }}
                  onKeyDown={event => { if (event.key === 'Backspace' && !digit && index > 0) codeRefs.current[index - 1]?.focus(); }}
                />
              ))}
            </div>
            {pendingVerification.purpose !== 'google' && <label className="terms-check trust-device-check"><input type="checkbox" checked={trustDevice} onChange={event => setTrustDevice(event.target.checked)} /><span>Trust this device for 30 days</span></label>}
            {verifyError && <p className="error">{verifyError}</p>}
            <button className="primary wide" disabled={busy || verificationCode.join('').length !== 6}>{busy ? 'Verifying…' : 'Verify email'}</button>
          </form>
          <button type="button" className="text-button wide verify-resend" disabled={busy || resendSeconds > 0} onClick={resendVerification}>{resendSeconds > 0 ? `Resend code in 0:${String(resendSeconds).padStart(2, '0')}` : 'Resend code'}</button>
          <button type="button" className="text-button wide" onClick={changeVerificationEmail}>Change email</button>
        </div>
      </div>
    );
  if (!user)
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <img className="brandmark" src="/budget-logo.svg" alt="Budget wallet logo" />
          <span className="eyebrow">YOUR MONEY, IN FOCUS</span>
          <h1>{onboard ? 'A calmer way to manage money' : resetMode ? 'Reset your password' : authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p className="muted">{onboard ? 'Track spending, plan budgets and understand your habits.' : resetMode ? 'We’ll send a 6-digit password reset code to your email.' : authMode === 'signup' ? 'Start with a clear picture of your finances.' : 'Sign in to pick up where you left off.'}</p>
          {onboard ? (
            <>
              <div className="onboard-list">
                <div>
                  <span>01</span>
                  <section>
                    <b>Track spending</b>
                    <small>Every peso, in one place.</small>
                  </section>
                </div>
                <div>
                  <span>02</span>
                  <section>
                    <b>Set budgets</b>
                    <small>Know your limits before you spend.</small>
                  </section>
                </div>
                <div>
                  <span>03</span>
                  <section>
                    <b>See reports</b>
                    <small>Find patterns and make better plans.</small>
                  </section>
                </div>
              </div>
              <button className="primary wide" onClick={finishOnboard}>
                Get started <ArrowUpRight size={17} />
              </button>
              <button className="text-button wide" onClick={finishOnboard}>
                Skip
              </button>
            </>
          ) : resetMode ? (
            <>
            {resetStep === 'email' ? (
              <form onSubmit={sendPasswordReset} className="stack">
                <p className="muted">Enter the email linked to your BudgetBuddy account. We will send you a 6-digit reset code.</p>
                <label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
                {authError && <p className="error">{authError}</p>}
                <button disabled={busy} className="primary wide">{busy ? 'Sending code…' : 'Send reset code'}</button>
              </form>
            ) : resetStep === 'code' ? (
              <form onSubmit={verifyPasswordResetCode} className="stack">
                <p className="muted">Enter the 6-digit code sent to <b>{email}</b>. The code expires in 10 minutes.</p>
                <label>6-digit reset code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={resetCode} onChange={e=>setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></label>
                {authError && <p className="error">{authError}</p>}
                <button disabled={busy || resetCode.length !== 6} className="primary wide">{busy ? 'Verifying…' : 'Verify code'}</button>
                <button type="button" className="text-button wide" onClick={()=>{setResetStep('email');setResetCode('');setAuthError('')}}>Change email</button>
              </form>
            ) : (
              <form onSubmit={completePasswordReset} className="stack">
                <p className="success-note">Code verified. Set a new password for your account.</p>
                <label>New password<input required minLength={8} type="password" value={resetNewPassword} onChange={e=>setResetNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
                <label>Confirm new password<input required minLength={8} type="password" value={resetConfirmPassword} onChange={e=>setResetConfirmPassword(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" /></label>
                {authError && <p className="error">{authError}</p>}
                <button disabled={busy} className="primary wide">{busy ? 'Updating…' : 'Reset password'}</button>
              </form>
            )}
            <button type="button" className="text-button wide" onClick={()=>{setResetMode(false);setResetSent(false);setResetStep('email');setResetGrant('');setAuthError('')}}>Back to log in</button>
            </>
          ) : (
            <>
              <div className="auth-tabs"><button className={authMode==='login'?'active':''} onClick={()=>{setAuthMode('login');setAuthError('')}}>Log In</button><button className={authMode==='signup'?'active':''} onClick={()=>{setAuthMode('signup');setAuthError('')}}>Sign Up</button></div>
              <form onSubmit={authSubmit} className="stack auth-form">
                {authMode==='signup'&&<label>Full name<input required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" /></label>}
                <label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
                <label>Password<div className="password-field"><input required minLength={authMode==='signup'?8:6} type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={authMode==='signup'?'At least 8 characters':'Your password'} autoComplete={authMode==='signup'?'new-password':'current-password'} /><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></div></label>
                {authMode==='signup'&&<label>Confirm password<input required minLength={8} type={showPassword?'text':'password'} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" /></label>}
                {authMode==='signup'&&<label className="terms-check"><input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} /><span>I agree to the <a href="#terms" onClick={e=>{e.preventDefault();notify('Terms of Use: use Budget responsibly and keep your login secure.')}}>Terms</a> and <a href="#privacy" onClick={e=>{e.preventDefault();notify('Privacy: your finance records are private to your account and protected by database policies.')}}>Privacy Policy</a>.</span></label>}
                {authMode==='login'&&<button type="button" className="text-button forgot-link" onClick={()=>{setResetMode(true);setAuthError('');setResetSent(false);setResetStep('email');setResetCode('');setResetGrant('')}}>Forgot password?</button>}
                {authError&&<p className="error">{authError}</p>}
                <button disabled={busy} className="primary wide">{busy?'Please wait…':authMode==='signup'?'Create account':'Log in'}</button>
              </form>
              {authMode==='login' && <p className="auth-footnote">New to Budget? Create an account using the Sign Up tab.</p>}
            </>
          )}
        </div>
      </div>
    );
  if (user && recoveryMode) return <div className="auth-shell"><div className="auth-card"><img className="brandmark" src="/budget-logo.svg" alt="Budget wallet logo" /><span className="eyebrow">SECURE YOUR ACCOUNT</span><h1>Choose a new password</h1><form className="stack" onSubmit={saveRecoveredPassword}><label>New password<input required minLength={8} type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters" /></label><button className="primary wide" disabled={busy}>{busy?'Saving…':'Update password'}</button></form></div></div>;
  if (user && setupRequired) return <div className="auth-shell"><div className="auth-card"><img className="brandmark" src="/budget-logo.svg" alt="Budget wallet logo" /><span className="eyebrow">ONE LAST STEP</span><h1>Set up your money</h1><p className="muted">Choose your currency and monthly income. You can change these anytime in Settings.</p><form className="stack" onSubmit={finishSetup}><label>Currency<select value={setupCurrency} onChange={e=>setSetupCurrency(e.target.value)}><option value="PHP">PHP · Philippine Peso</option><option value="USD">USD · US Dollar</option><option value="EUR">EUR · Euro</option><option value="GBP">GBP · Pound Sterling</option></select></label><label>Monthly income<input type="number" min="0" value={setupIncome} onChange={e=>setSetupIncome(e.target.value)} placeholder="Optional" /></label><button className="primary wide" disabled={busy}>{busy?'Saving…':'Continue to Budget'}</button></form></div></div>;
  const tabs = [
    ['Home', Home],
    ['Transactions', ArrowLeftRight],
    ['Budgets', Wallet],
    ['Reports', ChartNoAxesCombined],
    ['Settings', Settings],
  ] as const;
  const Header = ({ title, sub }: { title: string; sub?: string }) => (
    <header className="topbar">
      <div>
        <div className="eyebrow">
          GOOD{' '}
          {new Date().getHours() < 12
            ? 'MORNING'
            : new Date().getHours() < 18
              ? 'AFTERNOON'
              : 'EVENING'}
        </div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <button className={`avatar header-avatar${profile.avatar_url ? ' has-photo' : ''}`} onClick={() => setPage('Settings')} aria-label="Open Settings">
        {profile.avatar_url
          ? <img className="header-avatar-image" src={profile.avatar_url} alt="" />
          : (profile.display_name || user.email || 'P').slice(0, 1).toUpperCase()}
      </button>
    </header>
  );
  const SpendingCard = () => (
    <div
      className="spend-card dashboard-clickable"
      role="button"
      tabIndex={0}
      aria-label="View monthly spending transactions"
      onClick={() => { setFilter('expense'); setPage('Transactions'); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter('expense'); setPage('Transactions'); } }}
    >
      <div className="spend-top">
        <span>MONTHLY SPENDING</span>
        <button
          type="button"
          className="month-pill month-pill-button"
          aria-label="Open monthly reports"
          onClick={e => { e.stopPropagation(); setPeriod('Month'); setPage('Reports'); }}
        >
          <CalendarDays size={13} />{' '}
          {new Date().toLocaleDateString('en', {
            month: 'short',
            year: 'numeric',
          })}
        </button>
      </div>
      <div className="spend-number">{money(spent, currency)}</div>
      <div className="spend-sub">
        of {money(monthlyBudget, currency)} budgeted
      </div>
      <div className="progress light">
        <i
          style={{
            width:
              Math.min(100, monthlyBudget ? (spent / monthlyBudget) * 100 : 0) +
              '%',
          }}
        />
      </div>
      <div className="spend-bottom">
        <b>
          {monthlyBudget ? Math.round((spent / monthlyBudget) * 100) : 0}% used
        </b>
        <span>{money(dailyLimit, currency)} daily limit</span>
      </div>
      {remaining < 0 && (
        <div className="over-warning">
          You're {money(Math.abs(remaining), currency)} over budget. Take a
          moment to review spending.
        </div>
      )}
    </div>
  );
  const Stat = ({
    label,
    value,
    detail,
    icon: Icon,
    positive,
    onClick,
  }: {
    label: string;
    value: number;
    detail: string;
    icon: any;
    positive: boolean;
    onClick: () => void;
  }) => (
    <button type="button" className="stat-card dashboard-stat-clickable" onClick={onClick}>
      <div className="stat-icon">
        <Icon size={17} />
      </div>
      <span>{label}</span>
      <b>{money(value, currency)}</b>
      <small>{detail}</small>
    </button>
  );
  const CategoryLine = ({ b }: { b: any }) => (
    <div className="category-line">
      <div
        className="cat-icon"
        style={{
          background: (b.categories?.color || b.color || '#4F5BD5') + '18',
          color: b.categories?.color || b.color || '#4F5BD5',
        }}
      >
        {(() => {
          const I =
            categoryIcons[b.categories?.name || b.name] || CircleDollarSign;
          return <I size={17} />;
        })()}
      </div>
      <div className="cat-main">
        <div className="cat-title">
          <b>{b.categories?.name || b.name}</b>
          <span>
            {money(b.spent ?? 0, currency)}{' '}
            <small>/ {money(b.amount, currency)}</small>
          </span>
        </div>
        <div className="progress">
          <i
            className={b.spent > b.amount ? 'danger' : ''}
            style={{
              width:
                Math.min(100, b.amount ? (b.spent / b.amount) * 100 : 0) + '%',
              background: b.categories?.color || b.color || '#4F5BD5',
            }}
          />
        </div>
      </div>
      <span className="percent">
        {b.amount ? Math.round(((b.spent || 0) / b.amount) * 100) : 0}%
      </span>
    </div>
  );
  const TransactionLine = ({ t }: { t: Row }) => (
    <button className="transaction-line" onClick={() => setSelected(t)}>
      <div
        className={'tx-icon ' + (t.kind === 'income' ? 'income' : 'expense')}
      >
        {(() => {
          const I = categoryIcons[t.categories?.name] || CircleDollarSign;
          return <I size={18} />;
        })()}
      </div>
      <div className="tx-main">
        <b>{t.note || t.categories?.name || 'Transaction'}</b>
        <small>
          {t.categories?.name || 'Uncategorized'} ·{' '}
          {t.accounts?.name || 'Account'}
        </small>
      </div>
      <div className={'tx-amount ' + (t.kind === 'income' ? 'positive' : '')}>
        {t.kind === 'income' ? '+' : '−'}
        {money(t.amount, currency)}
        <small>
          {new Date(t.occurred_on + 'T12:00:00').toLocaleDateString('en', {
            month: 'short',
            day: 'numeric',
          })}
        </small>
      </div>
    </button>
  );
  const exportIncome = visible.filter(t => t.kind === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const exportExpenses = visible.filter(t => t.kind === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return (
    <div className="app-shell">
      {printReport && (
        <section className="print-report">
          <header className="print-report-header">
            <div className="print-brand">BUDGETBUDDY</div>
            <h1>Financial transaction report</h1>
            <p>Prepared {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Account: {profile.display_name || user.email || 'Personal account'}</p>
            <p>Currency: {currency} · {visible.length} transaction{visible.length === 1 ? '' : 's'}</p>
          </header>
          <div className="print-summary-grid">
            <div><span>Total income</span><strong>{money(exportIncome, currency)}</strong></div>
            <div><span>Total expenses</span><strong>{money(exportExpenses, currency)}</strong></div>
            <div><span>Net cash flow</span><strong>{money(exportIncome - exportExpenses, currency)}</strong></div>
          </div>
          <h2>Transaction details</h2>
          {visible.length ? (
            <table className="print-transactions">
              <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Note</th><th className="amount">Amount</th></tr></thead>
              <tbody>{visible.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.occurred_on + 'T12:00:00').toLocaleDateString('en-PH')}</td>
                  <td>{t.kind === 'income' ? 'Income' : 'Expense'}</td>
                  <td>{t.categories?.name || 'Uncategorized'}</td>
                  <td>{t.accounts?.name || 'Account'}</td>
                  <td>{t.note || '—'}</td>
                  <td className="amount">{money(t.amount, currency)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p>No transactions match the selected filters.</p>}
          <footer className="print-report-footer">Generated by BudgetBuddy · Keep this report for your personal records.</footer>
        </section>
      )}
      <main className={`app-main${page === 'Settings' ? ' settings-main' : ''}`}>
        {page === 'Home' && (
          <>
            <Header
              title="Your overview"
              sub="Here’s how your money is doing."
            />
            <SpendingCard />
            <div className="stats-grid">
              <Stat
                label="Earnings"
                value={earned}
                detail="This month"
                icon={TrendingUp}
                positive
                onClick={() => { setFilter('income'); setPage('Transactions'); }}
              />
              <Stat
                label="Bills & spend"
                value={spent}
                detail="This month"
                icon={TrendingDown}
                positive={false}
                onClick={() => { setFilter('expense'); setPage('Transactions'); }}
              />
            </div>
            <section className="section">
              <div className="section-head">
                <div>
                  <h2>Budget progress</h2>
                  <p>Keep an eye on your categories</p>
                </div>
                <button
                  className="link-button"
                  onClick={() => setPage('Budgets')}
                >
                  View all <ChevronRight size={15} />
                </button>
              </div>
              {budgetRows.length ? (
                budgetRows
                  .slice(0, 4)
                  .map(b => (
                    <button
                      type="button"
                      key={b.id}
                      className="budget-item-trigger dashboard-category-trigger"
                      onClick={() => setSelectedBudget(b)}
                      aria-label={`View ${b.categories?.name || 'category'} budget details`}
                    >
                      <CategoryLine b={b} />
                    </button>
                  ))
              ) : (
                <div className="empty-inline">
                  No budgets yet. Set a category limit to get started.
                </div>
              )}
            </section>
            <section className="section">
              <div className="section-head bills-section-head">
                <div>
                  <h2>Bill reminders</h2>
                  <p>{overdueBillsCount ? `${overdueBillsCount} overdue · ` : ''}{billReminders.filter(b => !b.paid_at).length} unpaid bills</p>
                </div>
                <button className="link-button" onClick={() => { setEditingBill(null); setBillForm({ title: '', amount: '', due_date: today(), reminder_days_before: '1', notes: '' }); setModal('bill'); }}>
                  ＋ Add bill
                </button>
              </div>
              {sortedBills.length ? (
                <div className="bill-list">
                  {sortedBills.map(bill => {
                    const dueInfo = billDueState(bill);
                    return (
                      <div className="bill-item" key={bill.id}>
                        <button type="button" className="bill-main" onClick={() => { setEditingBill(bill); setBillForm({ title: bill.title, amount: String(bill.amount), due_date: bill.due_date, reminder_days_before: String(bill.reminder_days_before ?? 1), notes: bill.notes || '' }); setModal('bill'); }}>
                          <span className="bill-copy">
                            <b>{bill.title}</b>
                            <small>{new Date(bill.due_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}{dueInfo.reminderActive ? ' · Reminder active' : ''}</small>
                          </span>
                          <span className="bill-value">{money(bill.amount, currency)}</span>
                          <span className={'bill-status ' + (bill.paid_at ? 'paid' : dueInfo.overdue ? 'overdue' : dueInfo.reminderActive ? 'due-soon' : 'upcoming')}>{dueInfo.label}</span>
                          <Pencil size={14} className="bill-edit-icon" />
                        </button>
                        <button type="button" className={bill.paid_at ? 'bill-paid-button is-paid' : 'bill-paid-button'} disabled={busy} onClick={() => toggleBillPaid(bill)}>
                          {bill.paid_at ? 'Mark unpaid' : 'Mark paid'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state bill-empty">
                  <Bell size={23} />
                  <b>No bill reminders yet</b>
                  <p>Add rent, utilities, subscriptions or other bills to keep track of due dates.</p>
                </div>
              )}
            </section>
            <section className="section">
              <div className="section-head">
                <div>
                  <h2>Recent activity</h2>
                  <p>Your latest transactions</p>
                </div>
                <button
                  className="link-button"
                  onClick={() => setPage('Transactions')}
                >
                  See all <ChevronRight size={15} />
                </button>
              </div>
              {transactions.slice(0, 4).map(t => (
                <TransactionLine key={t.id} t={t} />
              ))}
            </section>
          </>
        )}
        {page === 'Transactions' && (
          <>
            <Header
              title="Transactions"
              sub="Every in and out, all together."
            />
            <div className="searchbox">
              <Search size={17} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search transactions"
              />
              <button onClick={exportCSV} aria-label="Export CSV">
                <Download size={17} />
              </button>
            </div>
            <div className="chips">
              {[
                ['all', 'All'],
                ['expense', 'Expenses'],
                ['income', 'Income'],
              ].map(([v, l]) => (
                <button
                  className={filter === v ? 'chip active' : 'chip'}
                  onClick={() => setFilter(v)}
                  key={v}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="transaction-filters">
              <label className="category-filter-field">
                <select aria-label="Category filter" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="date-filter-field">
                {!dateFrom && <span>From</span>}
                <input aria-label="From date" type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} />
              </label>
              <label className="date-filter-field">
                {!dateTo && <span>To</span>}
                <input aria-label="To date" type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} />
              </label>
              <button
                type="button"
                className="clear-filters"
                onClick={() => { setCategoryFilter('all'); setDateFrom(''); setDateTo(''); setQuery(''); setFilter('all'); }}
                disabled={categoryFilter === 'all' && !dateFrom && !dateTo && !query && filter === 'all'}
              >
                Clear filters
              </button>
            </div>
            <div className="section-head">
              <h2>{visible.length} transactions</h2>
              <button className="icon-button" onClick={exportPDF}>
                <Download size={17} />
              </button>
            </div>
            {visible.length ? (
              visible.map(t => <TransactionLine key={t.id} t={t} />)
            ) : (
              <div className="empty-state">
                <Search size={25} />
                <b>No transactions found</b>
                <p>Try another search or add a transaction.</p>
              </div>
            )}
          </>
        )}
        {page === 'Budgets' && (
          <>
            <Header title="Your budgets" sub="A plan for every peso." />
            <div className="budget-total">
              <span>MONTHLY PLAN</span>
              <b>{money(monthlyBudget, currency)}</b>
              <div className="progress light">
                <i
                  style={{
                    width:
                      Math.min(
                        100,
                        monthlyBudget ? (spent / monthlyBudget) * 100 : 0
                      ) + '%',
                  }}
                />
              </div>
              <small>
                {money(spent, currency)} spent · {money(remaining, currency)}{' '}
                remaining
              </small>
            </div>
            <div className="section-head">
              <h2>Categories</h2>
              <button
                className="link-button"
                onClick={() => {
                  setEditingBudget(null);
                  setLimitForm({
                    category_id:
                      categories.find(c => c.kind === 'expense')?.id || '',
                    amount: '',
                  });
                  setModal('budget');
                }}
              >
                ＋ Set limit
              </button>
            </div>
            {budgetRows.length ? (
              budgetRows.map(b => (
                <div key={b.id} className="budget-row-wrap">
                  <button type="button" className="budget-item-trigger" onClick={() => setSelectedBudget(b)} aria-label={`View ${b.categories?.name || 'category'} budget details`}>
                    <CategoryLine b={b} />
                  </button>
                  {b.spent >= b.amount && (
                    <small className="warning-text">
                      Budget reached · consider adjusting your limit
                    </small>
                  )}
                  {b.amount &&
                    b.spent / b.amount >= 0.8 &&
                    b.spent < b.amount && (
                      <small className="warning-text">
                        80% of this budget used
                      </small>
                    )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Wallet size={25} />
                <b>No budgets set yet</b>
                <p>Add a category limit to start tracking your plan.</p>
              </div>
            )}
            <div className="section-head savings-goals-heading">
              <div>
                <h2>Savings goals</h2>
                <p>Turn your plans into progress.</p>
              </div>
              <button className="link-button" onClick={() => { setEditingGoal(null); setGoalForm({ name: '', target_amount: '', saved_amount: '0', target_date: '' }); setModal('goal'); }}>
                ＋ Add goal
              </button>
            </div>
            {savingsGoals.length ? (
              <div className="savings-goals-list">
                {savingsGoals.map(goal => {
                  const progress = Math.min(100, (Number(goal.saved_amount || 0) / Number(goal.target_amount || 1)) * 100);
                  return (
                    <button type="button" className="savings-goal-card" key={goal.id} onClick={() => { setEditingGoal(goal); setGoalForm({ name: goal.name, target_amount: String(goal.target_amount), saved_amount: String(goal.saved_amount || 0), target_date: goal.target_date || '' }); setModal('goal'); }}>
                      <span className="savings-goal-top"><b>{goal.name}</b><small>{Math.round(progress)}%</small></span>
                      <span className="progress"><i style={{ width: progress + '%' }} /></span>
                      <span className="savings-goal-bottom"><b>{money(goal.saved_amount, currency)} saved</b><small>of {money(goal.target_amount, currency)}</small></span>
                      {goal.target_date && <span className="savings-goal-date">Target date · {new Date(goal.target_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state savings-goals-empty">
                <Sparkles size={24} />
                <b>No savings goals yet</b>
                <p>Create a goal and track how close you are to reaching it.</p>
              </div>
            )}
          </>
        )}
        {page === 'Reports' && (
          <>
            <Header title="Reports" sub="The bigger picture, made clear." />
            <div className="chips">
              {['Today', 'Week', 'Month', 'Year'].map(v => (
                <button
                  className={period === v ? 'chip active' : 'chip'}
                  onClick={() => setPeriod(v)}
                  key={v}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="report-card">
              <h2>Spending by category</h2>
              <p>Where your money went</p>
              {reportRows.length ? (
                <>
                  <div className="donut-wrap">
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={reportRows}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={3}
                        >
                          {reportRows.map((r, i) => (
                            <Cell key={i} fill={r.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => money(Number(v), currency)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                      <b>
                        {money(
                          reportRows.reduce((a, r) => a + r.value, 0),
                          currency
                        )}
                      </b>
                      <small>Total spent</small>
                    </div>
                  </div>
                  <div className="legend">
                    {reportRows.map(r => (
                      <div key={r.name}>
                        <i style={{ background: r.color }} />
                        <span>{r.name}</span>
                        <b>{money(r.value, currency)}</b>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-inline">
                  No spending in this period yet.
                </div>
              )}
            </div>
            <div className="report-card">
              <h2>Monthly cash flow</h2>
              <p>Income compared with expenses</p>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthBars}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v: any) => money(Number(v), currency)} />
                  <Bar dataKey="income" fill="#25A77A" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expense" fill="#4F5BD5" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span>● Income</span>
                <span>● Expenses</span>
              </div>
            </div>
            <div className="net-card">
              <span>NET BALANCE THIS MONTH</span>
              <b>{money(earned - spent, currency)}</b>
              <small>Income minus spending</small>
            </div>
            <div className="export-row">
              <button className="secondary" onClick={exportCSV}>
                <Download size={16} /> Export CSV
              </button>
              <button className="secondary" onClick={exportPDF}>
                <Download size={16} /> Export PDF
              </button>
            </div>
          </>
        )}
        {page === 'Settings' && (
          <>
            <Header title="Settings" sub="Make Budget feel like yours." />
            <div
              className="profile-card profile-summary-card profile-accordion-header"
              role="button"
              tabIndex={0}
              aria-expanded={profileAccordionOpen}
              aria-controls="profile-accordion-panel"
              onClick={() => setProfileAccordionOpen(open => !open)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setProfileAccordionOpen(open => !open); } }}
            >
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-circle">
                  {profile.avatar_url
                    ? <img className="profile-avatar-image" src={profile.avatar_url} alt="Profile photo" />
                    : <div className="avatar large">{(profile.display_name || user.email || 'P').slice(0, 1).toUpperCase()}</div>}
                </div>
                <button type="button" className="avatar-edit-button" onClick={event => { event.stopPropagation(); avatarInputRef.current?.click(); }} disabled={busy} aria-label="Change profile photo"><Pencil size={13} /></button>
                <input ref={avatarInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfileAvatar} />
              </div>
              <div className="profile-summary-text">
                <b>{profile.display_name || user.email?.split('@')[0]}</b>
                <small>{user.email}</small>
              </div>
              <ChevronRight className={`profile-accordion-chevron${profileAccordionOpen ? ' is-open' : ''}`} size={19} aria-hidden="true" />
            </div>
            <p className="profile-help profile-photo-help">Profile photos: JPG, PNG or WebP, up to 5 MB. Only you can upload or replace your photo.</p>
            <div id="profile-accordion-panel" className={`profile-accordion-panel${profileAccordionOpen ? ' is-open' : ''}`} aria-hidden={!profileAccordionOpen}>
              <div className="profile-accordion-inner">
            <section className="section">
              <div className="section-head">
                <h2>Profile management</h2>
              </div>
              <form className="stack profile-management-form" onSubmit={saveProfileDetails}>
                <label>Full name<input required maxLength={80} value={profileName} onChange={event => setProfileName(event.target.value)} placeholder="Your full name" autoComplete="name" /></label>
                <label>Email address<input required type="email" value={profileEmail} onChange={event => setProfileEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
                <p className="profile-help">Changing your email requires confirmation through your inbox. Your current email stays active until confirmed.</p>
                <button className="primary wide" disabled={busy}>{busy ? 'Saving…' : 'Save profile details'}</button>
              </form>
              <div className="profile-security-block">
                <h3>Change password</h3>
                <form className="stack" onSubmit={updateProfilePassword}>
                  <label>New password<input required minLength={8} type="password" value={profilePassword} onChange={event => setProfilePassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></label>
                  <label>Confirm new password<input required minLength={8} type="password" value={profilePasswordConfirm} onChange={event => setProfilePasswordConfirm(event.target.value)} placeholder="Re-enter new password" autoComplete="new-password" /></label>
                  <button className="secondary wide" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
                </form>
              </div>
            </section>
              </div>
            </div>
            <section className="section">
              <div className="section-head">
                <h2>Preferences</h2>
              </div>
              <label className="setting-row">
                Currency
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                >
                  <option value="PHP">PHP · Philippine Peso</option>
                  <option value="USD">USD · US Dollar</option>
                  <option value="EUR">EUR · Euro</option>
                  <option value="GBP">GBP · Pound Sterling</option>
                </select>
              </label>
              <label className="setting-row">
                Monthly income
                <input
                  type="number"
                  value={profile.monthly_income || 0}
                  onChange={e =>
                    setProfile({ ...profile, monthly_income: e.target.value })
                  }
                />
              </label>
              <button className="primary wide" onClick={saveProfile}>
                Save preferences
              </button>
              <button className="setting-row" onClick={() => setDark(!dark)}>
                <span>Appearance</span>
                <b>
                  {dark ? 'Dark mode' : 'Light mode'}{' '}
                  <span className="toggle">
                    {dark ? <Moon size={14} /> : <Sun size={14} />}
                  </span>
                </b>
              </button>
            </section>
            <section className="section">
              <div className="section-head">
                <h2>Accounts</h2>
                <button
                  className="link-button"
                  onClick={() => { setManaging(null); setAccountForm({ name: '', type: 'cash', balance: '0' }); setModal('account'); }}
                >
                  ＋ Add
                </button>
              </div>
              {accounts.map(a => (
                <button type="button" className="setting-row manageable-row" key={a.id} onClick={() => openManagedDetails('account', a)} aria-label={`View account ${a.name} details`}>
                  <span><CreditCard size={17} /> {a.name} <small>{a.type}</small></span>
                  <b>{money(a.balance, currency)}</b>
                </button>
              ))}
            </section>
            <section className="section">
              <div className="section-head">
                <h2>About</h2>
              </div>
              <div className="about-brand"><img src="/budget-logo.svg" alt="Budget logo" /><div><b>Budget</b><small>Personal finance, in focus.</small></div><span>v1.0</span></div>
            </section>
            <section className="section">
              <div className="section-head">
                <h2>Categories</h2>
                <button
                  className="link-button"
                  onClick={() => { setManaging(null); setCategoryForm({ name: '', kind: 'expense', color: '#4F5BD5' }); setModal('category'); }}
                >
                  ＋ Add
                </button>
              </div>
              {categories.map(c => (
                <button type="button" className="setting-row manageable-row" key={c.id} onClick={() => openManagedDetails('category', c)} aria-label={`View category ${c.name} details`}>
                  <span><i className="color-dot" style={{ background: c.color }} /> {c.name} <small>{c.kind}</small></span>
                </button>
              ))}
            </section>
            <button className="danger-button wide" onClick={signOut}>
              <LogOut size={17} /> Log out
            </button>
          </>
        )}
      </main>
      <button className="fab" onClick={openAdd}>
        <Plus size={25} />
      </button>
      <nav className="bottom-nav">
        {tabs.map(([name, Icon]) => (
          <button
            key={name}
            className={page === name ? 'nav-item active' : 'nav-item'}
            onClick={() => setPage(name)}
          >
            <Icon size={20} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      {modal && (
        <div className="overlay" onClick={() => setModal('')}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-head">
              <h2>
                {modal === 'transaction'
                  ? editing
                    ? 'Edit transaction'
                    : 'Add transaction'
                  : modal === 'budget'
                    ? editingBudget ? 'Edit category limit' : 'Set category limit'
                    : modal === 'goal'
                    ? editingGoal ? 'Edit savings goal' : 'Create savings goal'
                    : modal === 'bill'
                      ? editingBill ? 'Edit bill reminder' : 'Add bill reminder'
                      : modal === 'account'
                        ? managing?.type === 'account' ? 'Edit account' : 'Add account'
                        : managing?.type === 'category' ? 'Edit category' : 'Add category'}
              </h2>
              <button className="icon-button" onClick={() => setModal('')}>
                <X size={20} />
              </button>
            </div>
            {modal === 'transaction' && (
              <form className="stack" onSubmit={saveTx}>
                <div className="segmented">
                  <button
                    type="button"
                    className={kind === 'expense' ? 'selected' : ''}
                    onClick={() => {
                      setKind('expense');
                      setForm({
                        ...form,
                        category_id:
                          categories.find(c => c.kind === 'expense')?.id || '',
                      });
                    }}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={kind === 'income' ? 'selected' : ''}
                    onClick={() => {
                      setKind('income');
                      setForm({
                        ...form,
                        category_id:
                          categories.find(c => c.kind === 'income')?.id || '',
                      });
                    }}
                  >
                    Income
                  </button>
                </div>
                <label>
                  Amount
                  <input
                    autoFocus
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={form.category_id}
                    onChange={e =>
                      setForm({ ...form, category_id: e.target.value })
                    }
                  >
                    <option value="">Choose category</option>
                    {categories
                      .filter(c => c.kind === kind || c.kind === 'both')
                      .map(c => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Account
                  <select
                    required
                    value={form.account_id}
                    onChange={e =>
                      setForm({ ...form, account_id: e.target.value })
                    }
                  >
                    <option value="">Choose account</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={form.occurred_on}
                    onChange={e =>
                      setForm({ ...form, occurred_on: e.target.value })
                    }
                  />
                </label>
                <label>
                  Note
                  <input
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="What was this for?"
                  />
                </label>
                <button className="primary wide" disabled={busy}>
                  {busy ? 'Saving…' : 'Save transaction'}
                </button>
              </form>
            )}
            {modal === 'budget' && (
              <form className="stack" onSubmit={saveBudget}>
                <label>
                  Category
                  <select
                    required
                    value={limitForm.category_id}
                    onChange={e =>
                      setLimitForm({
                        ...limitForm,
                        category_id: e.target.value,
                      })
                    }
                  >
                    {categories
                      .filter(c => c.kind === 'expense')
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Monthly limit
                  <input
                    required
                    min="1"
                    type="number"
                    value={limitForm.amount}
                    onChange={e =>
                      setLimitForm({ ...limitForm, amount: e.target.value })
                    }
                    placeholder="5000"
                  />
                </label>
                <p className="muted small">
                  You'll see reminders when spending reaches 80% and 100% of
                  this limit.
                </p>
                <button className="primary wide" disabled={busy}>{busy ? 'Saving…' : editingBudget ? 'Update limit' : 'Save limit'}</button>
              </form>
            )}
            {modal === 'goal' && (
              <form className="stack" onSubmit={saveGoal}>
                <label>
                  Goal name
                  <input required maxLength={80} value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="e.g. Emergency fund" />
                </label>
                <label>
                  Target amount
                  <input required min="0.01" step="0.01" type="number" value={goalForm.target_amount} onChange={e => setGoalForm({ ...goalForm, target_amount: e.target.value })} placeholder="20000" />
                </label>
                <label>
                  Amount saved so far
                  <input required min="0" step="0.01" type="number" value={goalForm.saved_amount} onChange={e => setGoalForm({ ...goalForm, saved_amount: e.target.value })} placeholder="0" />
                </label>
                <label>
                  Target date (optional)
                  <input type="date" value={goalForm.target_date} onChange={e => setGoalForm({ ...goalForm, target_date: e.target.value })} />
                </label>
                <button type="submit" className="primary wide" disabled={busy}>{busy ? 'Saving…' : editingGoal ? 'Save changes' : 'Create goal'}</button>
                {editingGoal && <button type="button" className="danger-button wide" disabled={busy} onClick={() => deleteGoal(editingGoal)}><Trash2 size={16} /> Delete goal</button>}
              </form>
            )}
            {modal === 'bill' && (
              <form className="stack" onSubmit={saveBill}>
                <label>
                  Bill name
                  <input required maxLength={100} value={billForm.title} onChange={e => setBillForm({ ...billForm, title: e.target.value })} placeholder="e.g. Electricity bill" />
                </label>
                <label>
                  Amount
                  <input required min="0.01" step="0.01" type="number" value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: e.target.value })} placeholder="1500" />
                </label>
                <label>
                  Due date
                  <input required type="date" min={today()} value={billForm.due_date} onChange={e => setBillForm({ ...billForm, due_date: e.target.value })} />
                </label>
                <label>
                  Remind me
                  <select value={billForm.reminder_days_before} onChange={e => setBillForm({ ...billForm, reminder_days_before: e.target.value })}>
                    <option value="0">On the due date</option>
                    <option value="1">1 day before</option>
                    <option value="3">3 days before</option>
                    <option value="7">7 days before</option>
                  </select>
                </label>
                <label>
                  Notes (optional)
                  <input maxLength={500} value={billForm.notes} onChange={e => setBillForm({ ...billForm, notes: e.target.value })} placeholder="Reference number or details" />
                </label>
                <button type="submit" className="primary wide" disabled={busy}>{busy ? 'Saving…' : editingBill ? 'Save changes' : 'Add bill reminder'}</button>
                {editingBill && <button type="button" className="danger-button wide" disabled={busy} onClick={() => deleteBill(editingBill)}><Trash2 size={16} /> Delete bill</button>}
              </form>
            )}
            {modal === 'account' && (
              <form className="stack" onSubmit={saveAccount}>
                <label>
                  Account name
                  <input
                    required
                    value={accountForm.name}
                    onChange={e =>
                      setAccountForm({ ...accountForm, name: e.target.value })
                    }
                    placeholder="My bank"
                  />
                </label>
                <label>
                  Type
                  <select
                    value={accountForm.type}
                    onChange={e =>
                      setAccountForm({ ...accountForm, type: e.target.value })
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="card">Card</option>
                  </select>
                </label>
                <label>
                  {managing ? 'Current balance' : 'Starting balance'}
                  <input
                    type="number"
                    value={accountForm.balance}
                    onChange={e => setAccountForm({ ...accountForm, balance: e.target.value })}
                  />
                </label>
                <button type="submit" className="primary wide" disabled={busy}>{busy ? 'Saving…' : managing?.type === 'account' ? 'Save changes' : 'Add account'}</button>
                {managing?.type === 'account' && <button type="button" className="danger-button wide" disabled={busy} onClick={deleteManagedRow}><Trash2 size={16} /> Delete</button>}
              </form>
            )}
            {modal === 'category' && (
              <form className="stack" onSubmit={saveCategory}>
                <label>
                  Category name
                  <input
                    required
                    value={categoryForm.name}
                    onChange={e =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    placeholder="Health"
                  />
                </label>
                <label>
                  Type
                  <select
                    value={categoryForm.kind}
                    onChange={e => setCategoryForm({ ...categoryForm, kind: e.target.value })}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
                <label>
                  Color
                  <div className="color-input-row">
                    <input type="color" value={categoryForm.color} onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })} aria-label="Category color" />
                    <span>{categoryForm.color.toUpperCase()}</span>
                  </div>
                </label>
                <button type="submit" className="primary wide" disabled={busy}>{busy ? 'Saving…' : managing?.type === 'category' ? 'Save changes' : 'Add category'}</button>
                {managing?.type === 'category' && <button type="button" className="danger-button wide" disabled={busy} onClick={deleteManagedRow}><Trash2 size={16} /> Delete</button>}
              </form>
            )}
          </div>
        </div>
      )}
      {managedDetails && (
        <div className="overlay" onClick={() => setManagedDetails(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-head">
              <h2>{managedDetails.type === 'account' ? 'Account details' : 'Category details'}</h2>
              <button className="icon-button" onClick={() => setManagedDetails(null)} aria-label="Close details">
                <X size={20} />
              </button>
            </div>
            <div className="detail-amount managed-detail-title">{managedDetails.item.name}</div>
            <p className="muted center">{managedDetails.type === 'account' ? 'Account' : 'Category'}</p>
            <div className="detail-list">
              {managedDetails.type === 'account' ? (
                <>
                  <span>Type</span><b>{managedDetails.item.type}</b>
                  <span>Starting balance</span><b>{money(managedDetails.item.balance, currency)}</b>
                </>
              ) : (
                <>
                  <span>Type</span><b>{managedDetails.item.kind}</b>
                  <span>Color</span><b className="managed-color-value"><i className="color-dot" style={{ background: managedDetails.item.color }} />{(managedDetails.item.color || '#4F5BD5').toUpperCase()}</b>
                </>
              )}
            </div>
            <div className="detail-actions">
              <button className="secondary" onClick={() => openManagedEdit(managedDetails.type, managedDetails.item)}>
                <Pencil size={16} /> Edit
              </button>
              <button className="danger-button" onClick={() => deleteManagedRow(managedDetails)} disabled={busy}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedBudget && (
        <div className="overlay" onClick={() => setSelectedBudget(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-head">
              <h2>Budget details</h2>
              <button className="icon-button" onClick={() => setSelectedBudget(null)} aria-label="Close budget details"><X size={20} /></button>
            </div>
            <div className="detail-amount managed-detail-title">{selectedBudget.categories?.name || 'Category budget'}</div>
            <p className="muted center">Monthly category limit</p>
            <div className="detail-list">
              <span>Budget limit</span><b>{money(selectedBudget.amount, currency)}</b>
              <span>Spent</span><b>{money(selectedBudget.spent || 0, currency)}</b>
              <span>Remaining</span><b>{money(Number(selectedBudget.amount || 0) - Number(selectedBudget.spent || 0), currency)}</b>
              <span>Month</span><b>{selectedBudget.month}</b>
            </div>
            <div className="detail-actions">
              <button className="secondary" onClick={() => { const b = selectedBudget; setSelectedBudget(null); setEditingBudget(b); setLimitForm({ category_id: b.category_id, amount: String(b.amount) }); setModal('budget'); }}><Pencil size={16} /> Edit limit</button>
              <button className="danger-button" onClick={() => deleteBudget(selectedBudget)} disabled={busy}><Trash2 size={16} /> Delete</button>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-head">
              <h2>Transaction details</h2>
              <button className="icon-button" onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="detail-amount">
              {selected.kind === 'income' ? '+' : '−'}
              {money(selected.amount, currency)}
            </div>
            <p className="muted center">
              {selected.note || selected.categories?.name}
            </p>
            <div className="detail-list">
              <span>Category</span>
              <b>{selected.categories?.name || 'Uncategorized'}</b>
              <span>Account</span>
              <b>{selected.accounts?.name}</b>
              <span>Date</span>
              <b>{selected.occurred_on}</b>
            </div>
            <div className="detail-actions">
              <button className="secondary" onClick={() => editTx(selected)}>
                <Pencil size={16} /> Edit
              </button>
              <button
                className="danger-button"
                onClick={() => deleteTx(selected)}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
export default App;
