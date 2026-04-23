// src/pages/Admin.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import type { NumeroRifa, StatusNumero } from "../domain/entities/RifaTypes";

const LOTE_ID = "lote_01";
const TOTAL_NUMEROS = 200;
const PRECO_UNITARIO = 10;

interface ManualFormData {
  nome: string;
  telefone: string;
  numerosTexto: string;
  status: Extract<StatusNumero, "reservado" | "pago">;
}

export const Admin: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [numeros, setNumeros] = useState<NumeroRifa[]>([]);
  const [loading, setLoading] = useState(true);

  const [manualForm, setManualForm] = useState<ManualFormData>({
    nome: "",
    telefone: "",
    numerosTexto: "",
    status: "pago",
  });
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "numeros"), where("lote_id", "==", LOTE_ID));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (docItem) => ({ id: docItem.id, ...docItem.data() }) as NumeroRifa,
        );

        setNumeros(data.sort((a, b) => a.numero - b.numero));
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar dados do admin:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      alert("Erro ao fazer login. Verifique as credenciais.");
    }
  };

  const handleLogout = () => signOut(auth);

  const totalArrecadado =
    numeros.filter((n) => n.status === "pago").length * PRECO_UNITARIO;
  const pendentes = numeros.filter((n) => n.status === "reservado").length;
  const disponiveis = numeros.filter((n) => n.status === "disponivel").length;
  const compradores = numeros.filter((n) => n.status !== "disponivel");

  const numerosOcupados = useMemo(
    () => new Map(numeros.map((n) => [n.numero, n])),
    [numeros],
  );

  const parseNumeros = (input: string) => {
    return [
      ...new Set(
        input
          .split(/[\s,;]+/)
          .map((item) => Number(item.trim()))
          .filter((num) => Number.isInteger(num)),
      ),
    ].sort((a, b) => a - b);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");
    setManualSuccess("");

    const nome = manualForm.nome.trim();
    const telefone = manualForm.telefone.trim();
    const numerosSelecionados = parseNumeros(manualForm.numerosTexto);

    if (!nome) {
      setManualError("Informe o nome do comprador.");
      return;
    }

    if (!telefone) {
      setManualError("Informe o telefone do comprador.");
      return;
    }

    if (numerosSelecionados.length === 0) {
      setManualError("Informe ao menos um número válido.");
      return;
    }

    const invalidos = numerosSelecionados.filter(
      (num) => num < 1 || num > TOTAL_NUMEROS,
    );

    if (invalidos.length > 0) {
      setManualError(
        `Existem números fora do intervalo permitido: ${invalidos.join(", ")}.`,
      );
      return;
    }

    const ocupados = numerosSelecionados.filter((num) => {
      const item = numerosOcupados.get(num);
      return item && item.status !== "disponivel";
    });

    if (ocupados.length > 0) {
      setManualError(
        `Os números ${ocupados.join(", ")} já estão reservados ou pagos.`,
      );
      return;
    }

    setIsSavingManual(true);

    try {
      const batch = writeBatch(db);

      numerosSelecionados.forEach((numero) => {
        const docId = `${LOTE_ID}_num_${numero.toString().padStart(3, "0")}`;
        const docRef = doc(db, "numeros", docId);

        batch.update(docRef, {
          status: manualForm.status,
          comprador_dados: {
            nome,
            telefone,
          },
          reservado_em: serverTimestamp(),
          id_transacao_pix: null,
        });
      });

      await batch.commit();

      setManualSuccess(
        `${numerosSelecionados.length} número(s) lançado(s) com sucesso para ${nome}.`,
      );

      setManualForm({
        nome: "",
        telefone: "",
        numerosTexto: "",
        status: "pago",
      });
    } catch (error) {
      console.error("Erro ao lançar números manualmente:", error);
      setManualError("Não foi possível salvar os números manualmente.");
    } finally {
      setIsSavingManual(false);
    }
  };

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_38%,#eff6ff_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.08),transparent_35%,rgba(15,23,42,0.08))]" />
        <div className="absolute -top-24 left-[-80px] h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-[-60px] h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-sm font-medium text-blue-700 backdrop-blur">
                Painel administrativo
              </span>

              <h1 className="mt-6 text-5xl font-black tracking-tight text-slate-900">
                Controle sua rifa com uma interface mais clara e segura.
              </h1>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Acompanhe pagamentos, reservas e disponibilidade em tempo real
                sem poluição visual. Tudo em um painel enxuto e profissional.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-4">
                {[
                  { label: "Tempo real", value: "Live" },
                  { label: "Lotes", value: "01+" },
                  { label: "Gestão", value: "PIX" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/70 bg-white/60 p-4 shadow-sm backdrop-blur"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="w-full">
            <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/20">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                    <path d="M9.5 12.5l1.7 1.7 3.8-4.2" />
                  </svg>
                </div>

                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                  acesso restrito
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  Entrar no painel
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use suas credenciais para acessar a gestão da rifa e
                  acompanhar as reservas em tempo real.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@rifa.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  Entrar no painel
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-blue-800">
                Ambiente administrativo protegido. Acesso permitido somente para
                o responsável pela campanha.
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-10 pt-4 sm:pt-6">
        <div className="section-shell">
          <div className="glass-panel rounded-[30px] p-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Carregando painel administrativo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10 pt-4 sm:pt-6">
      <div className="section-shell space-y-6">
        <header className="glass-panel rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                Painel administrativo
              </p>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                Gestão do Lote 01
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Acompanhe reservas, pagamentos e disponibilidade em tempo real.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Sessão
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {user.email}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Total arrecadado
            </p>
            <p className="mt-3 text-3xl font-extrabold text-emerald-600">
              {totalArrecadado.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          <div className="glass-panel rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Aguardando pagamento
            </p>
            <p className="mt-3 text-3xl font-extrabold text-amber-600">
              {pendentes}
            </p>
          </div>

          <div className="glass-panel rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Disponíveis
            </p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {disponiveis} / {TOTAL_NUMEROS}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.5fr]">
          <div className="glass-panel rounded-[30px] p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                Lançamento manual
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">
                Adicionar números vendidos
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Informe os números já vendidos ou reservados fora do sistema e
                vincule-os ao comprador.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Nome do comprador
                </label>
                <input
                  type="text"
                  value={manualForm.nome}
                  onChange={(e) =>
                    setManualForm((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder="João Pedro"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={manualForm.telefone}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      telefone: e.target.value,
                    }))
                  }
                  placeholder="(63) 99999-9999"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Números
                </label>
                <textarea
                  rows={4}
                  value={manualForm.numerosTexto}
                  onChange={(e) =>
                    setManualForm((prev) => ({
                      ...prev,
                      numerosTexto: e.target.value,
                    }))
                  }
                  placeholder="Ex.: 7, 12, 35, 88"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Separe por vírgula, espaço ou ponto e vírgula.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: "pago",
                      label: "Pago",
                      cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
                    },
                    {
                      value: "reservado",
                      label: "Reservado",
                      cls: "border-amber-200 bg-amber-50 text-amber-700",
                    },
                  ].map((option) => {
                    const active = manualForm.status === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setManualForm((prev) => ({
                            ...prev,
                            status: option.value as ManualFormData["status"],
                          }))
                        }
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                          active
                            ? option.cls
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {manualError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {manualError}
                </div>
              )}

              {manualSuccess && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {manualSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingManual}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingManual ? "Salvando..." : "Adicionar manualmente"}
              </button>
            </form>
          </div>

          <div className="glass-panel overflow-hidden rounded-[30px]">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-2xl font-extrabold">Reservas recentes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Últimos números reservados e pagos.
                </p>
              </div>

              <button
                type="button"
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-600"
              >
                + Criar Lote 02
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-400">
                    <th className="px-6 py-4 font-semibold">Nº</th>
                    <th className="px-6 py-4 font-semibold">Comprador</th>
                    <th className="px-6 py-4 font-semibold">Contato</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {compradores.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        Nenhuma reserva até o momento.
                      </td>
                    </tr>
                  ) : (
                    compradores.map((n) => (
                      <tr
                        key={n.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {n.numero.toString().padStart(3, "0")}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {n.comprador_dados?.nome ||
                            n.comprador?.nome ||
                            "N/A"}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {n.comprador_dados?.telefone ||
                            n.comprador?.telefone ||
                            "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              n.status === "pago"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {n.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {n.status === "reservado" && (
                            <button
                              type="button"
                              className="font-semibold text-blue-600 transition hover:text-blue-800"
                            >
                              Ver PIX
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
