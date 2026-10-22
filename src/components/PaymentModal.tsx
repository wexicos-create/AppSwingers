import React, { useState } from 'react';
import { AppRegion, PaymentItem } from '../types';
import { X, CreditCard, Lock, ShieldCheck, Sparkles, CheckCircle2, DollarSign, Smartphone } from 'lucide-react';
import { showToast } from './Toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { kind: PaymentItem['kind']; ref: string; label: string; amount: number } | null;
  region: AppRegion;
  isEs: boolean;
  onSuccessPayment: (payment: PaymentItem) => void;
}

export function PaymentModal({ isOpen, onClose, item, region, isEs, onSuccessPayment }: PaymentModalProps) {
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardHolder, setCardHolder] = useState('J. Cervantes');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('389');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !item) return null;

  const isMx = region === 'MX';
  const currencyCode = isMx ? 'MXN' : 'USD';
  const currencySymbol = isMx ? '$' : '$';

  // 16% tax (IVA / Tax)
  const baseAmount = item.amount;
  const taxAmount = Math.round(baseAmount * 0.16 * 100) / 100;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      const newPayment: PaymentItem = {
        id: 'pay_' + Date.now(),
        kind: item.kind,
        ref: item.ref,
        label: item.label,
        amount: totalAmount,
        status: 'confirmado',
        ts: Date.now(),
      };
      onSuccessPayment(newPayment);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-purple-500/30 shadow-2xl flex flex-col gap-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/30">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {isEs ? 'Pasarela de Pago Segura' : 'Secure Payment Gateway'}
          </h2>
          <p className="text-xs text-purple-300 mt-1">
            {isEs ? 'Cifrado SSL de 256 bits • Cumplimiento PCI-DSS' : '256-bit SSL Encryption • PCI-DSS Compliant'}
          </p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center flex flex-col items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <div>
              <h3 className="font-bold text-lg">{isEs ? '¡Pago Aprobado con Éxito!' : 'Payment Approved Successfully!'}</h3>
              <p className="text-xs text-emerald-200 mt-1">{isEs ? 'Transacción registrada y abonada al monedero virtual.' : 'Transaction processed and credited.'}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay} className="flex flex-col gap-4">
            {/* Order Summary Box */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 text-xs">
              <div className="flex justify-between font-bold text-white text-sm">
                <span>{item.label}</span>
                <span>{currencySymbol}{totalAmount.toLocaleString()} {currencyCode}</span>
              </div>
              <div className="flex justify-between text-white/60 pt-1 border-t border-white/10">
                <span>{isEs ? 'Subtotal' : 'Subtotal'}</span>
                <span>{currencySymbol}{baseAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>{isEs ? 'Impuestos (16% IVA / Tax)' : 'Taxes (16%)'}</span>
                <span>{currencySymbol}{taxAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Digital Wallet buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => showToast(isEs ? 'Apple Pay simulado con éxito.' : 'Apple Pay simulated successfully.')}
                className="py-2.5 px-4 rounded-xl bg-black border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition"
              >
                <Smartphone className="w-4 h-4 text-white" />
                <span>Apple Pay</span>
              </button>
              <button
                type="button"
                onClick={() => showToast(isEs ? 'Google Pay simulado con éxito.' : 'Google Pay simulated successfully.')}
                className="py-2.5 px-4 rounded-xl bg-black border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition"
              >
                <Smartphone className="w-4 h-4 text-pink-400" />
                <span>Google Pay</span>
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-white/40 text-[10px] uppercase">{isEs ? 'O tarjeta de crédito / débito' : 'Or credit / debit card'}</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div>
              <label className="text-xs text-white/60 mb-1 block">{isEs ? 'Número de Tarjeta' : 'Card Number'}</label>
              <input
                type="text"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm font-mono tracking-wider"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block">{isEs ? 'Expiración (MM/AA)' : 'Expiry (MM/YY)'}</label>
                <input
                  type="text"
                  required
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm font-mono text-center"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">CVV</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-sm font-mono text-center tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-purple-600/30 hover:brightness-110 transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>{isEs ? `Pagar ${currencySymbol}${totalAmount.toLocaleString()} ${currencyCode}` : `Pay ${currencySymbol}${totalAmount.toLocaleString()} ${currencyCode}`}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
