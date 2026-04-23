import React, { useEffect, useRef, useState } from "react";

interface CompradorData {
  nome: string;
  telefone: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  selecionados: number[];
  onConfirmar: (dados: CompradorData) => void;
}

export const ModalCheckout: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  selecionados,
  onConfirmar,
}) => {
  const [formData, setFormData] = useState<CompradorData>({
    nome: "",
    telefone: "",
  });
  const [errors, setErrors] = useState<Partial<CompradorData>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) firstInputRef.current?.focus();
  }, [isOpen]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enviar reserva"
    >
      <div
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/70 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:max-h-[88vh] sm:max-w-lg sm:rounded-[30px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600 sm:text-xs">
              Reserva manual
            </p>
            <h2 className="mt-1 text-xl font-extrabold leading-tight text-slate-900 sm:text-lg">
              Enviar pedido no WhatsApp
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="border-b border-blue-100 bg-linear-to-r from-blue-50 to-cyan-50 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
                  Números selecionados
                </p>
                <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-slate-800 sm:max-w-[280px]">
                  {sortedNums
                    .map((n) => n.toString().padStart(2, "0"))
                    .join(" · ")}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 px-4 py-3 text-left shadow-sm sm:min-w-[132px] sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:text-xs">
                  Total
                </p>
                <p className="mt-1 text-3xl font-extrabold leading-none text-blue-700 sm:text-2xl">
                  {totalFmt}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 px-4 py-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:px-6"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nome completo
              </label>
              <input
                ref={firstInputRef}
                required
                type="text"
                autoComplete="name"
                className={`w-full rounded-2xl border px-4 py-3 text-base outline-none transition-colors sm:text-sm ${
                  errors.nome
                    ? "border-red-400 bg-red-50 focus:border-red-500"
                    : "border-slate-300 bg-white focus:border-blue-500"
                }`}
                placeholder="João Pedro Silva"
                value={formData.nome}
                onChange={(e) => {
                  setFormData({ ...formData, nome: e.target.value });
                  if (errors.nome) setErrors({ ...errors, nome: undefined });
                }}
              />
              {errors.nome && (
                <p className="mt-1 text-xs text-red-500">{errors.nome}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                WhatsApp
              </label>
              <input
                required
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                className={`w-full rounded-2xl border px-4 py-3 text-base outline-none transition-colors sm:text-sm ${
                  errors.telefone
                    ? "border-red-400 bg-red-50 focus:border-red-500"
                    : "border-slate-300 bg-white focus:border-blue-500"
                }`}
                placeholder="(63) 99999-9999"
                value={formData.telefone}
                onChange={(e) => {
                  setFormData({ ...formData, telefone: e.target.value });
                  if (errors.telefone) {
                    setErrors({ ...errors, telefone: undefined });
                  }
                }}
              />
              {errors.telefone && (
                <p className="mt-1 text-xs text-red-500">{errors.telefone}</p>
              )}
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-linear-to-r from-blue-600 to-blue-500 py-3.5 text-base font-bold text-white shadow-[0_16px_30px_rgba(37,99,235,0.25)] transition hover:brightness-105 sm:text-sm"
            >
              Enviar no WhatsApp
            </button>

            <p className="px-2 text-center text-sm leading-6 text-slate-400 sm:text-xs">
              Sua mensagem será enviada para confirmação manual da reserva.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
