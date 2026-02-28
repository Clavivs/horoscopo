import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash"; 

if (!apiKey) {
  throw new Error("GEMINI_API_KEY no está configurada.");
}

const genAI = new GoogleGenAI(apiKey);

const SIGNS = [
  { name: "Aries", symbol: "♈" }, { name: "Tauro", symbol: "♉" },
  { name: "Géminis", symbol: "♊" }, { name: "Cáncer", symbol: "♋" },
  { name: "Leo", symbol: "♌" }, { name: "Virgo", symbol: "♍" },
  { name: "Libra", symbol: "♎" }, { name: "Escorpio", symbol: "♏" },
  { name: "Sagitario", symbol: "♐" }, { name: "Capricornio", symbol: "♑" },
  { name: "Acuario", symbol: "♒" }, { name: "Piscis", symbol: "♓" }
];

async function generateAllHoroscopes() {
  console.log(`Usando modelo: ${MODEL_NAME}`);
  
  // CAMBIO 2: Prompt más estricto
  const prompt = `Return ONLY a JSON object with daily horoscopes in Spanish for these 12 signs. 
  Format: {"Aries": "...", "Tauro": "..."}. No markdown, no extra text.`;

  for (let i = 0; i < 3; i++) {
  try {
    const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        generationConfig: { responseMimeType: "application/json" } // FUERZA JSON
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // CAMBIO 3: Limpieza de JSON ultra-segura
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1) throw new Error("No JSON found in response");
    
    return JSON.parse(text.slice(start, end + 1));

  } catch (error) {
    console.error("DETALLE DEL ERROR:", error.message);
    // Si es error de cuota (429), esto se ejecutará
    const fallback = {};
    for (const sign of SIGNS) {
      fallback[sign.name] = "El servicio está temporalmente saturado. Inténtalo más tarde.";
    }
    return fallback;
  }
}
} //Fin del FOR
// --- Crear index.html ---
async function updateIndexHtml() {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const horoscopes = await generateAllHoroscopes();

  let horoscopeHtml = "";
  for (const sign of SIGNS) {
    const text = horoscopes[sign.name] || "Lo siento, hubo un error al obtener el horóscopo de hoy B.";
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
    <p class="footer">
    Generado automáticamente con la API de Gemini.<br>
    Última ejecución: ${new Date().toISOString()}
    </p>
  </div>
</body>
</html>`;

  await fs.writeFile('index.html', newContent);
  console.log('index.html actualizado exitosamente.');

  // --- Commit y push automático ---
  try {
    await execAsync('git config user.name "github-actions[bot]"');
    await execAsync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    await execAsync('git add index.html');
    await execAsync('git commit -m "Horóscopo actualizado automáticamente [skip ci]"');
    await execAsync('git push origin main');
    console.log('Cambios subidos a GitHub correctamente.');
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      console.log('No hay cambios en index.html, no se hace commit.');
    } else {
      console.error('Error al hacer commit/push:', error);
    }
  }
}

// Ejecutar
updateIndexHtml();
