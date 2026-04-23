import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

admin.initializeApp();
const db = admin.firestore();

type CompradorData = {
  nome: string;
  telefone: string;
};

type GerarPixRequest = {
  numeros: number[];
  comprador: CompradorData;
  lote_id: string;
};

type MercadoPagoOrderResponse = {
  id?: string | number;
  qr_code?: string;
  qr_code_base64?: string;
  transactions?: {
    payments?: Array<{
      id?: string | number;
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    }>;
  };
};

type MercadoPagoErrorResponse = {
  message?: string;
  error?: string;
  cause?: unknown;
};

function isMercadoPagoOrderResponse(
  value: MercadoPagoOrderResponse | MercadoPagoErrorResponse,
): value is MercadoPagoOrderResponse {
  return (
    "transactions" in value ||
    "qr_code" in value ||
    "qr_code_base64" in value ||
    "id" in value
  );
}

export const gerarPix = onCall(
  { secrets: ["MP_ACCESS_TOKEN", "MP_TEST_PAYER_EMAIL"] },
  async (request) => {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    const payerEmail = process.env.MP_TEST_PAYER_EMAIL;

    if (!accessToken) {
      throw new HttpsError(
        "failed-precondition",
        "MP_ACCESS_TOKEN não configurado.",
      );
    }

    if (!payerEmail) {
      throw new HttpsError(
        "failed-precondition",
        "MP_TEST_PAYER_EMAIL não configurado.",
      );
    }

    const { numeros, comprador, lote_id } = request.data as GerarPixRequest;

    if (
      !Array.isArray(numeros) ||
      numeros.length === 0 ||
      !comprador ||
      !lote_id
    ) {
      throw new HttpsError("invalid-argument", "Dados incompletos.");
    }

    if (!comprador.nome?.trim() || !comprador.telefone?.trim()) {
      throw new HttpsError("invalid-argument", "Dados do comprador inválidos.");
    }

    const numerosNormalizados = [...new Set(numeros.map((n) => Number(n)))];

    if (
      numerosNormalizados.some((n) => !Number.isInteger(n) || n < 1 || n > 200)
    ) {
      throw new HttpsError("invalid-argument", "Lista de números inválida.");
    }

    const docs = await Promise.all(
      numerosNormalizados.map(async (numero) => {
        const docId = `${lote_id}_num_${numero.toString().padStart(3, "0")}`;
        const docRef = db.collection("numeros").doc(docId);
        const snapshot = await docRef.get();

        return {
          numero,
          docId,
          docRef,
          data: snapshot.exists ? snapshot.data() : null,
        };
      }),
    );

    const ocupados = docs.filter(
      (item) =>
        item.data && item.data.status && item.data.status !== "disponivel",
    );

    if (ocupados.length > 0) {
      throw new HttpsError(
        "already-exists",
        `Os números ${ocupados.map((item) => item.numero).join(", ")} já estão ocupados.`,
      );
    }

    const valorTotal = (numerosNormalizados.length * 10).toFixed(2);
    const externalReference = `${lote_id}_${Date.now()}`;
    const idempotencyKey = randomUUID();

    try {
      const response = await fetch("https://api.mercadopago.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          type: "online",
          external_reference: externalReference,
          total_amount: valorTotal,
          description: `Rifa Beneficente - Números: ${numerosNormalizados.join(", ")}`,
          processing_mode: "automatic",
          payer: {
            email: payerEmail,
            first_name: comprador.nome.trim(),
          },
          transactions: {
            payments: [
              {
                amount: valorTotal,
                payment_method: {
                  id: "pix",
                  type: "bank_transfer",
                },
                expiration_time: "PT15M",
              },
            ],
          },
        }),
      });

      const orderData = (await response.json()) as
        | MercadoPagoOrderResponse
        | MercadoPagoErrorResponse;

      if (!response.ok) {
        console.error("Erro Mercado Pago Orders API:", orderData);
        throw new HttpsError(
          "internal",
          "Mercado Pago recusou a criação do PIX.",
        );
      }

      if (!isMercadoPagoOrderResponse(orderData)) {
        console.error("Resposta inesperada da Orders API:", orderData);
        throw new HttpsError(
          "internal",
          "Resposta inválida ao gerar QR Code PIX.",
        );
      }

      const paymentData = orderData.transactions?.payments?.[0];

      const qrCode = paymentData?.qr_code || orderData.qr_code;
      const qrCodeBase64 =
        paymentData?.qr_code_base64 || orderData.qr_code_base64;
      const transactionId = String(paymentData?.id || orderData.id || "");

      if (!qrCode || !qrCodeBase64 || !transactionId) {
        console.error("Resposta inesperada da Orders API:", orderData);
        throw new HttpsError(
          "internal",
          "Resposta inválida ao gerar QR Code PIX.",
        );
      }

      const batch = db.batch();

      docs.forEach(({ numero, docId, docRef }) => {
        batch.set(
          docRef,
          {
            id: docId,
            numero,
            lote_id,
            status: "reservado",
            comprador_dados: {
              nome: comprador.nome.trim(),
              telefone: comprador.telefone.trim(),
            },
            id_transacao_pix: transactionId,
            reservado_em: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

      await batch.commit();

      return {
        sucesso: true,
        qr_code_base64: qrCodeBase64,
        qr_code_copia_cola: qrCode,
        id_transacao_pix: transactionId,
      };
    } catch (error) {
      console.error("Erro na função gerarPix:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Falha ao processar o pagamento.");
    }
  },
);
