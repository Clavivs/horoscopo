import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// --- Configuración ---
const apiKey = process.env.GEMINI_API_KEY;
// CORRECCIÓN: El modelo correcto es gemini-1.5-flash o gemini-2.0-flash-exp
const MODEL_NAME = "gemini-1.5-flash"; 

if (!apiKey) {
  throw new Error("GEMINI_API_KEY no está configurada en los Secrets de GitHub.");
}

const genAI = new GoogleGenAI(apiKey);

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

// --- Generar horóscopos ---
async function generateAllHoroscopes() {
  console.log("Generando horóscopos para los 12 signos...");

  const prompt = `Devuelve EXCLUSIVAMENTE un objeto JSON válido con el horóscopo de hoy para los 12 signos zodiacales. 
  Usa este formato: {"Aries": "...", "Tauro": "...", ...}. 
  No uses markdown, ni escribas nada fuera del JSON.`;

  try {
    // CORRECCIÓN: Así es como se inicializa el modelo realmente
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // CORRECCIÓN: La llamada correcta a la API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("📦 RESPUESTA GEMINI RAW:\n", text);

    // Limpiamos la respuesta por si Gemini mete texto extra o bloques ```json
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error("Gemini no devolvió un formato JSON válido");
    }

    const jsonString = text.slice(start, end + 1);
    return JSON.parse(jsonString);

 } catch (error) {
    console.error("--- ¡AQUÍ ESTÁ EL CULPABLE! ---");
    console.error("NOMBRE DEL ERROR:", error.name);
    console.error("MENSAJE:", error.message);
    console.error("------------------------------");
    
    const fallback = {};
    // ... resto de tu código
    for (const sign of SIGNS) {
      fallback[sign.name] = "Lo siento, hubo un error al obtener el horóscopo de hoy.";
    }
    return fallback;
  }
}

// --- Crear index.html ---
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
