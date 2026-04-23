import React from "react";
import type { NumeroRifa } from "../domain/entities/RifaTypes";

interface GridProps {
  numeros: NumeroRifa[];
  selecionados: number[];
  onSelecionar: (num: number) => void;
}

export const GridNumeros: React.FC<GridProps> = ({
  numeros,
  selecionados,
  onSelecionar,
}) => {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10 sm:gap-3">
      {numeros.map((n) => {
        const isSelecionado = selecionados.includes(n.numero);
        const isPago = n.status === "pago";
        const isReservado = n.status === "reservado";
        const isDisponivel = !isPago && !isReservado;

        return (
          <button
            key={n.id}
            disabled={isPago || isReservado}
            onClick={() => onSelecionar(n.numero)}
            aria-label={`Número ${n.numero}${isPago ? ", pago" : isReservado ? ", reservado" : isSelecionado ? ", selecionado" : ""}`}
            aria-pressed={isSelecionado}
            className={[
              "group relative aspect-square w-full overflow-hidden rounded-2xl border text-center font-mono text-sm font-bold transition-all duration-200",
              "flex items-center justify-center",
              isPago
                ? "border-slate-200 bg-slate-100 text-slate-400 shadow-none"
                : "",
              isReservado
                ? "border-amber-200 bg-amber-50 text-amber-700 shadow-none"
                : "",
              isDisponivel && !isSelecionado
                ? "border-white/70 bg-white text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                : "",
              isSelecionado
                ? "scale-[1.03] border-blue-600 bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-[0_16px_30px_rgba(37,99,235,0.3)]"
                : "",
            ].join(" ")}
          >
            {isSelecionado && (
              <span className="absolute inset-x-0 top-0 h-1 bg-white/30" />
            )}

            <span className="relative z-10">
              {n.numero.toString().padStart(2, "0")}
            </span>

            {isPago && (
              <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-slate-300" />
            )}
            {isReservado && (
              <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-amber-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};
