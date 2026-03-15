import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash"; 

if (!apiKey) {
  throw new Error("GEMINI_API_KEY no está configurada.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const SIGNS = [
  { name: "Aries", symbol: "♈" }, { name: "Tauro", symbol: "♉" },
  { name: "Géminis", symbol: "♊" }, { name: "Cáncer", symbol: "♋" },
  { name: "Leo", symbol: "♌" }, { name: "Virgo", symbol: "♍" },
  { name: "Libra", symbol: "♎" }, { name: "Escorpio", symbol: "♏" },
  { name: "Sagitario", symbol: "♐" }, { name: "Capricornio", symbol: "♑" },
  { name: "Acuario", symbol: "♒" }, { name: "Piscis", symbol: "♓" }
];

// --- FUNCIÓN MODIFICADA: GENERA UNO A UNO CON PAUSA ---
async function generateAllHoroscopes() {
  const horoscopes = {};
  console.log(`Iniciando generación signo por signo en ${MODEL_NAME}...`);

  const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
  });

  for (const sign of SIGNS) {
    try {
      console.log(`Solicitando predicción para ${sign.name}...`);
      
      const prompt = `Actúa como un astrólogo experto. Escribe una predicción corta (máximo 2 frases) para el signo ${sign.name} hoy en español. 
      Responde SOLO con el texto de la predicción, sin mencionar el nombre del signo ni usar formato JSON.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      horoscopes[sign.name] = response.text().trim();
      
      console.log(`✅ ${sign.name} obtenido con éxito.`);
      
      // PAUSA DE 15 SEGUNDOS: Para evitar el error de "servicio saturado"
      if (sign.name !== "Piscis") { // No esperamos después del último
        console.log("Esperando 15 segundos antes del siguiente signo...");
        await new Promise(resolve => setTimeout(resolve, 15000));
      }

    } catch (error) {
      console.error(`ERROR en ${sign.name}:`, error.message);
      horoscopes[sign.name] = "Las estrellas están alineándose... Vuelve en unos minutos para tu predicción.";
    }
  }

  return horoscopes;
}

// --- RESTO DEL CÓDIGO IGUAL A TU VERSIÓN ACTUAL ---
async function updateIndexHtml() {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const horoscopes = await generateAllHoroscopes();

  let horoscopeHtml = "";
  for (const sign of SIGNS) {
    const text = horoscopes[sign.name] || "Contenido no disponible temporalmente.";
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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background-color: #0f0c29; color: #eee; }
    .container { max-width: 800px; margin: 30px auto; padding: 25px; background: linear-gradient(to bottom, #24243e, #302b63, #0f0c29); border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #444; }
    h1 { color: #f0ad4e; text-align: center; text-transform: uppercase; letter-spacing: 2px; }
    .date { color: #5bc0de; font-weight: bold; text-align: center; margin-bottom: 20px; font-style: italic; }
    .sign { margin-top: 25px; padding: 15px; border-bottom: 1px dashed #555; transition: transform 0.3s; }
    .sign:hover { transform: scale(1.02); background: rgba(255,255,255,0.05); }
    .sign h2 { color: #f0ad4e; margin-top: 0; }
    .sign p { line-height: 1.6; font-size: 1.1em; color: #ddd; }
    .footer { margin-top: 40px; font-size: 0.8em; color: #888; text-align: center; border-top: 1px solid #444; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Horóscopo Diario</h1>
    <p class="date">Predicciones para hoy: ${date}</p>
    ${horoscopeHtml}
    <p class="footer">
    Generado por Inteligencia Artificial • © ${new Date().getFullYear()}<br>
    Última actualización: ${new Date().toLocaleTimeString('es-ES')}
    </p>
  </div>
</body>
</html>`;

  await fs.writeFile('index.html', newContent);
  
  try {
    await execAsync('git config user.name "github-actions[bot]"');
    await execAsync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    await execAsync('git add index.html');
    await execAsync('git commit -m "Horóscopo actualizado por signos [skip ci]"');
    await execAsync('git push origin main');
    console.log('GitHub actualizado correctamente.');
  } catch (error) {
    console.log('No hubo cambios o error en git:', error.message);
  }
}

updateIndexHtml();
