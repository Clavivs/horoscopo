import OpenAI from 'openai';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Ahora usamos la clave de GROQ
const apiKey = process.env.GROQ_API_KEY; 
const MODEL_NAME = "llama-3.3-70b-versatile"; // El modelo más potente y gratis de Groq

if (!apiKey) {
  throw new Error("GROQ_API_KEY no está configurada en los Secrets de GitHub.");
}

const groq = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1", // Servidor de Groq
});

const SIGNS = [
  { name: "Aries", symbol: "♈" }, { name: "Tauro", symbol: "♉" },
  { name: "Géminis", symbol: "♊" }, { name: "Cáncer", symbol: "♋" },
  { name: "Leo", symbol: "♌" }, { name: "Virgo", symbol: "♍" },
  { name: "Libra", symbol: "♎" }, { name: "Escorpio", symbol: "♏" },
  { name: "Sagitario", symbol: "♐" }, { name: "Capricornio", symbol: "♑" },
  { name: "Acuario", symbol: "♒" }, { name: "Piscis", symbol: "♓" }
];

async function generateAllHoroscopes() {
  console.log(`Solicitando horóscopos a Groq (${MODEL_NAME})...`);
  
  // Con Groq podemos pedir todos a la vez sin que se sature
  const prompt = `Actúa como un astrólogo experto. Genera un horóscopo diario corto (2 frases) para cada uno de los 12 signos en español. 
  Devuelve SOLO un objeto JSON con este formato: {"Aries": "...", "Tauro": "..."}. Sin texto extra.`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "Eres un astrólogo que solo responde en JSON puro." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" } // Esto fuerza a Groq a darte un JSON perfecto
    });

    const text = response.choices[0].message.content;
    return JSON.parse(text);

  } catch (error) {
    console.error("ERROR EN GROQ:", error.message);
    const fallback = {};
    for (const sign of SIGNS) {
      fallback[sign.name] = "Predicción en camino... las estrellas están cargando.";
    }
    return fallback;
  }
}

async function updateIndexHtml() {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const horoscopes = await generateAllHoroscopes();

  let horoscopeHtml = "";
  for (const sign of SIGNS) {
    const text = horoscopes[sign.name] || "No disponible.";
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
  <title>Horóscopo Diario Gratis</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; background-color: #0f0c29; color: #eee; }
    .container { max-width: 800px; margin: 30px auto; padding: 25px; background: #1a1a2e; border-radius: 15px; border: 1px solid #333; }
    h1 { color: #f0ad4e; text-align: center; }
    .date { color: #5bc0de; text-align: center; font-weight: bold; }
    .sign { margin-top: 20px; padding: 15px; border-bottom: 1px dashed #444; }
    .sign h2 { color: #f0ad4e; margin: 0; }
    .footer { margin-top: 30px; font-size: 0.8em; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Horóscopo Diario</h1>
    <p class="date">${date}</p>
    ${horoscopeHtml}
    <p class="footer">Generado con Groq AI • ${new Date().toLocaleTimeString('es-ES')}</p>
  </div>
</body>
</html>`;

  await fs.writeFile('index.html', newContent);
  
  try {
    await execAsync('git config user.name "github-actions[bot]"');
    await execAsync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    await execAsync('git add index.html');
    await execAsync('git commit -m "Horóscopo actualizado con Groq [skip ci]"');
    await execAsync('git push origin main');
    console.log('GitHub actualizado con éxito.');
  } catch (error) {
    console.log('Sin cambios en el repo.');
  }
}

updateIndexHtml();
