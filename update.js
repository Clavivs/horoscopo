import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';

// --- Configuración ---
const apiKey = process.env.GEMINI_API_KEY; 
const model = "gemini-2.5-flash";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY no está configurada en los Secrets de GitHub.");
}

const ai = new GoogleGenAI(apiKey);

// Lista de los 12 signos
const SIGNS = [
  { name: "Aries", symbol: "♈" },
  { name: "Tauro", symbol: "♉" },
  { name: "Géminis", symbol: "♊" },
  { name: "Cáncer", symbol: "♋" },
  { name: "Leo", symbol: "♌" },
  { name: "Virgo", symbol: "♍" },
  { name: "Libra", symbol: "♎" },
  { name: "Escorpio", symbol: "♏" },
  { name: "Sagitario", symbol: "♐" },
  { name: "Capricornio", symbol: "♑" },
  { name: "Acuario", symbol: "♒" },
  { name: "Piscis", symbol: "♓" }
];

// Generar horóscopos de los 12 signos en una sola llamada
async function generateAllHoroscopes() {
  console.log("Generando horóscopos para los 12 signos...");

  // Construimos un prompt que pida los 12 horóscopos separados
  const prompt = `Genera el horóscopo diario para los 12 signos del zodiaco. 
  Devuelve el resultado en formato JSON, donde cada clave sea el nombre del signo y el valor su horóscopo.
  Ejemplo de formato:
  {
    "Aries": "texto del horóscopo",
    "Tauro": "texto del horóscopo",
    ...
  }
  Cada horóscopo debe tener máximo 120 palabras y no incluir fechas ni títulos.`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    if (!result.text) {
      throw new Error("Respuesta vacía de Gemini");
    }

    // Convertimos el texto JSON en objeto
    const horoscopes = JSON.parse(result.text);
    return horoscopes;

  } catch (error) {
    console.error("❌ Error al generar horóscopos:", error);
    // fallback: texto de error para todos los signos
    const fallback = {};
    for (const sign of SIGNS) {
      fallback[sign.name] = "Lo siento, hubo un error al obtener el horóscopo de hoy.";
    }
    return fallback;
  }
}

// Función que crea index.html con los 12 horóscopos
async function updateIndexHtml() {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const horoscopes = await generateAllHoroscopes();

  let horoscopeHtml = "";

  for (const sign of SIGNS) {
    const text = horoscopes[sign.name] || "Lo siento, hubo un error al obtener el horóscopo de hoy.";
    horoscopeHtml += `
      <div class="sign">
        <h2>${sign.name} ${sign.symbol}</h2>
        <p>${text}</p>
      </div>
    `;
  }

  const newContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Horóscopo Diario</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f9; }
    .container { max-width: 800px; margin: 30px auto; padding: 25px; border: 1px solid #ccc; border-radius: 10px; background-color: #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    h1 { color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px; text-align: center; }
    .date { color: #5bc0de; font-weight: bold; text-align: center; margin-bottom: 20px; }
    .sign { margin-top: 25px; text-align: justify; }
    .sign h2 { color: #d9534f; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .footer { margin-top: 30px; font-size: 0.8em; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Horóscopo Diario</h1>
    <p class="date">Actualizado para el día: ${date}</p>

    ${horoscopeHtml}

    <p class="footer">Generado automáticamente con la API de Gemini.</p>
  </div>
</body>
</html>`;

  await fs.writeFile('index.html', newContent);
  console.log('index.html actualizado exitosamente.');
}

// Ejecutar
updateIndexHtml();
