import { writeBatch, doc, collection } from "firebase/firestore";
import { db } from "../config/firebase";

export const popularLoteInicial = async () => {
  const batch = writeBatch(db);
  const numerosRef = collection(db, "numeros");

  for (let i = 1; i <= 200; i++) {
    const id = `lote_01_num_${i.toString().padStart(3, "0")}`;
    const docRef = doc(numerosRef, id);

    batch.set(docRef, {
      numero: i,
      lote_id: "lote_01",
      status: "disponivel",
    });
  }

  await batch.commit();
  console.log("Lote de 200 números criado com sucesso!");
};
