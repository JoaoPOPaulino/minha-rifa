// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config/firebase";
import { GridNumeros } from "../components/GridNumeros";
import { ModalCheckout } from "../components/ModalCheckout";
import type { NumeroRifa } from "../domain/entities/RifaTypes";

const LOTE_ID = "lote_01";
const PRECO_UNITARIO = 10;
const TOTAL_NUMEROS = 200;

type FilterType = "todos" | "disponivel";

interface PixResponse {
  sucesso: boolean;
  qr_code_base64: string;
  qr_code_copia_cola: string;
}

interface CompradorData {
  nome: string;
  telefone: string;
}

export const Home = () => {
  const [numeros, setNumeros] = useState<NumeroRifa[]>([]);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code_base64: string;
    qr_code_copia_cola: string;
  } | null>(null);
  const [filter, setFilter] = useState<FilterType>("todos");

  useEffect(() => {
    const q = query(collection(db, "numeros"), where("lote_id", "==", LOTE_ID));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as NumeroRifa,
        );

        setNumeros(data.sort((a, b) => a.numero - b.numero));
        setErrorMessage("");
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar números da rifa:", error);
        setErrorMessage("Não foi possível carregar os números da rifa.");
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const stats = useMemo(
    () => ({
      pagos: numeros.filter((n) => n.status === "pago").length,
      reservados: numeros.filter((n) => n.status === "reservado").length,
      disponiveis: numeros.filter((n) => n.status === "disponivel").length,
    }),
    [numeros],
  );

  const progressPct = Math.round(
    ((stats.pagos + stats.reservados) / TOTAL_NUMEROS) * 100,
  );

  const filteredNumeros = useMemo(() => {
    if (filter === "disponivel") {
      return numeros.filter((n) => n.status === "disponivel");
    }

    return numeros;
  }, [numeros, filter]);

  const handleSelecao = (num: number) => {
    setSelecionados((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num],
    );
  };

  const handleConfirmarReserva = async (dadosComprador: CompradorData) => {
    setIsProcessing(true);

    try {
      const gerarPixFn = httpsCallable<
        {
          numeros: number[];
          comprador: CompradorData;
          lote_id: string;
        },
        PixResponse
      >(functions, "gerarPix");

      const response = await gerarPixFn({
        numeros: selecionados,
        comprador: dadosComprador,
        lote_id: LOTE_ID,
      });

      const data = response.data;

      if (data.sucesso) {
        setPixData({
          qr_code_base64: data.qr_code_base64,
          qr_code_copia_cola: data.qr_code_copia_cola,
        });
        setSelecionados([]);
      }
    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      alert("Erro ao processar o pagamento. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalSelecionado = selecionados.length * PRECO_UNITARIO;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="section-shell flex min-h-screen items-center justify-center px-4">
          <div className="glass-panel w-full max-w-md rounded-[28px] px-8 py-10 text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              carregando
            </p>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
              Preparando a rifa
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Estamos buscando os números disponíveis para você escolher.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="section-shell flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-red-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
              erro ao carregar
            </p>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
              Não conseguimos abrir a rifa
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40">
      <header className="section-shell pt-4 sm:pt-6">
        <div className="glass-panel overflow-hidden rounded-[28px]">
          <div className="relative px-5 py-6 sm:px-8 sm:py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.82),rgba(239,246,255,0.9))]" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 shadow-[0_16px_32px_rgba(37,99,235,0.28)]">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>

                  <div>
                    <span className="inline-flex rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                      Rifa beneficente
                    </span>
                    <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
                      Escolha seus números e participe agora
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                      Reserve seus números em segundos, pague via PIX e
                      acompanhe a disponibilidade em tempo real.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-right shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    valor por número
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-blue-700">
                    R$ {PRECO_UNITARIO},00
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Pagos
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {stats.pagos}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Reservados
                  </p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {stats.reservados}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Disponíveis
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.disponiveis}
                  </p>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-4 text-white shadow-[0_16px_32px_rgba(37,99,235,0.25)]">
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-100">
                    Progresso
                  </p>
                  <p className="mt-2 text-2xl font-extrabold">{progressPct}%</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-500">
                    {stats.pagos + stats.reservados} de {TOTAL_NUMEROS} números
                    ocupados
                  </span>
                  <span className="font-semibold text-blue-700">
                    {progressPct}% vendido
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section-shell mt-5">
        <div className="glass-panel rounded-[28px] p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">Mapa de números</h2>
              <p className="mt-1 text-sm text-slate-500">
                Toque nos números disponíveis para montar sua reserva.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {[
                  {
                    label: "Disponível",
                    cls: "bg-white border border-slate-200",
                  },
                  { label: "Selecionado", cls: "bg-blue-600" },
                  {
                    label: "Reservado",
                    cls: "bg-amber-100 border border-amber-200",
                  },
                  { label: "Pago", cls: "bg-slate-200" },
                ].map(({ label, cls }) => (
                  <span key={label} className="inline-flex items-center gap-2">
                    <span className={`h-3.5 w-3.5 rounded-md ${cls}`} />
                    {label}
                  </span>
                ))}
              </div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                {(["todos", "disponivel"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      filter === f
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {f === "todos" ? "Todos" : "Disponíveis"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredNumeros.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 py-16 text-center text-sm text-slate-400">
              Nenhum número disponível no momento.
            </div>
          ) : (
            <GridNumeros
              numeros={filteredNumeros}
              selecionados={selecionados}
              onSelecionar={handleSelecao}
            />
          )}
        </div>
      </section>

      {selecionados.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 px-3">
          <div className="section-shell">
            <div className="mx-auto flex max-w-3xl items-center gap-4 rounded-[26px] border border-white/70 bg-white/88 px-4 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  números selecionados
                </p>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {[...selecionados]
                    .sort((a, b) => a - b)
                    .map((n) => n.toString().padStart(2, "0"))
                    .join(" · ")}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-blue-700">
                  {totalSelecionado.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>

              <button
                onClick={() => setSelecionados([])}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                Limpar
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition hover:brightness-105"
              >
                Reservar agora
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalCheckout
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPixData(null);
        }}
        selecionados={selecionados}
        onConfirmar={handleConfirmarReserva}
        isProcessing={isProcessing}
        pixData={pixData}
      />
    </div>
  );
};
