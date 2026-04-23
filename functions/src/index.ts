// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore"; // <-- NOVA IMPORTAÇÃO AQUI
import { MercadoPagoConfig, Payment } from "mercadopago";

// Inicializa o Admin para termos acesso total ao Firestore
admin.initializeApp();
const db = admin.firestore();

// Configura o Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
});
const payment = new Payment(client);

export const gerarPix = onCall(async (request) => {
  const { numeros, comprador, lote_id } = request.data;

  if (!numeros || numeros.length === 0 || !comprador) {
    throw new HttpsError("invalid-argument", "Dados incompletos.");
  }

  const valorTotal = numeros.length * 10;

  try {
    // 1. Cria a cobrança via PIX
    const pixRequest = await payment.create({
      body: {
        transaction_amount: valorTotal,
        payment_method_id: "pix",
        payer: {
          email: "comprador@emailfalso.com",
          first_name: comprador.nome,
        },
        description: `Rifa Beneficente - Números: ${numeros.join(", ")}`,
      },
    });

    const pixData = pixRequest.point_of_interaction?.transaction_data;
    const transactionId = pixRequest.id;

    if (!pixData || !transactionId) {
      throw new HttpsError("internal", "Erro ao gerar PIX no gateway.");
    }

    // 2. Atualiza os números no Firestore para "reservado"
    const batch = db.batch();

    for (const num of numeros) {
      const docId = `${lote_id}_num_${num.toString().padStart(3, "0")}`;
      const docRef = db.collection("numeros").doc(docId);

      batch.update(docRef, {
        status: "reservado",
        comprador_dados: comprador,
        id_transacao_pix: transactionId.toString(),
        reservado_em: FieldValue.serverTimestamp(), // <-- CORREÇÃO AQUI
      });
    }

    await batch.commit();

    // 3. Devolve o QR Code para o Front-end
    return {
      sucesso: true,
      qr_code_base64: pixData.qr_code_base64,
      qr_code_copia_cola: pixData.qr_code,
    };
  } catch (error) {
    console.error("Erro na função gerarPix:", error);
    throw new HttpsError("internal", "Falha ao processar o pagamento.");
  }
});
