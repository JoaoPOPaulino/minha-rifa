// src/components/ModalCheckout.tsx
import React, { useState, useEffect, useRef } from "react";

interface CompradorData {
  nome: string;
  telefone: string;
}

interface PixData {
  qr_code_base64: string;
  qr_code_copia_cola: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  selecionados: number[];
  onConfirmar: (dados: CompradorData) => void;
  isProcessing: boolean;
  pixData: PixData | null;
}

const TIMER_SECONDS = 15 * 60;

function useCountdown(active: boolean) {
  const [remaining, setRemaining] = useState(TIMER_SECONDS);
  useEffect(() => {
    if (!active) {
      setRemaining(TIMER_SECONDS);
      return;
    }
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);
  const m = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const s = (remaining % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export const ModalCheckout: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  selecionados,
  onConfirmar,
  isProcessing,
  pixData,
}) => {
  const [formData, setFormData] = useState<CompradorData>({
    nome: "",
    telefone: "",
  });
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Partial<CompradorData>>({});
  const countdown = useCountdown(!!pixData);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !pixData) firstInputRef.current?.focus();
  }, [isOpen, pixData]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const total = selecionados.length * 10;
  const totalFmt = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const sortedNums = [...selecionados].sort((a, b) => a - b);

  const validate = (): boolean => {
    const errs: Partial<CompradorData> = {};
    if (!formData.nome.trim()) errs.nome = "Informe seu nome";
    if (!formData.telefone.trim()) errs.telefone = "Informe seu WhatsApp";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onConfirmar(formData);
  };

  const handleCopy = async () => {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code_copia_cola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select textarea
    }
  };

  return (
    // Bottom-sheet on mobile, centered on desktop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={pixData ? "Pagamento PIX" : "Finalizar reserva"}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-[30px] border border-white/70 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:rounded-[30px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              {pixData ? "Pagamento" : "Checkout"}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">
              {pixData ? "Pague com PIX" : "Finalizar reserva"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          {pixData ? (
            /* ── PIX Screen ── */
            <div className="px-5 py-6 flex flex-col items-center text-center gap-4">
              {/* Timer badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-2 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Reserva garantida por{" "}
                <span className="font-bold tabular-nums">{countdown}</span>
              </div>

              {/* QR Code */}
              <div className="border border-gray-200 rounded-xl p-3 shadow-sm">
                <img
                  src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
                  alt="QR Code PIX para pagamento"
                  className="w-44 h-44 block"
                />
              </div>

              <p className="text-sm text-gray-500">
                Escaneie no app do seu banco ou use o código abaixo
              </p>

              {/* Copy-paste area */}
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-left">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-2">
                  PIX Copia e Cola
                </p>
                <p className="text-xs font-mono text-gray-500 break-all leading-relaxed line-clamp-3">
                  {pixData.qr_code_copia_cola}
                </p>
              </div>

              <button
                onClick={handleCopy}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-900 text-white hover:bg-black active:scale-[0.98]"
                }`}
              >
                {copied ? "✓ Código copiado!" : "Copiar código PIX"}
              </button>

              <p className="text-xs text-gray-400">
                Após o pagamento, confirmaremos sua reserva via WhatsApp
              </p>
            </div>
          ) : (
            /* ── Checkout Form ── */
            <>
              {/* Order summary */}
              <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Números selecionados
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800 leading-relaxed">
                      {sortedNums
                        .map((n) => n.toString().padStart(2, "0"))
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Total
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-blue-700">
                      {totalFmt}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nome completo
                  </label>
                  <input
                    ref={firstInputRef}
                    required
                    type="text"
                    autoComplete="name"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-colors ${
                      errors.nome
                        ? "border-red-400 focus:border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-blue-500 bg-white"
                    }`}
                    placeholder="João Pedro Silva"
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (errors.nome)
                        setErrors({ ...errors, nome: undefined });
                    }}
                  />
                  {errors.nome && (
                    <p className="mt-1 text-xs text-red-500">{errors.nome}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-colors ${
                      errors.telefone
                        ? "border-red-400 focus:border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-blue-500 bg-white"
                    }`}
                    placeholder="(00) 90000-0000"
                    value={formData.telefone}
                    onChange={(e) => {
                      setFormData({ ...formData, telefone: e.target.value });
                      if (errors.telefone)
                        setErrors({ ...errors, telefone: undefined });
                    }}
                  />
                  {errors.telefone && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.telefone}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`mt-2 w-full rounded-2xl py-3.5 text-sm font-bold text-white transition ${
                    isProcessing
                      ? "bg-blue-300"
                      : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_16px_30px_rgba(37,99,235,0.25)] hover:brightness-105"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Gerando PIX…
                    </span>
                  ) : (
                    `Gerar PIX · ${totalFmt}`
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 pb-1">
                  Sua reserva é garantida por 15 minutos após gerar o PIX
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
