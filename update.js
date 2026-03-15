import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const apiKey = process.env.GEMINI_API_KEY;
// Usamos el modelo más estable para evitar el error de "saturado"
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

async function generateAllHoroscopes() {
  console.log(`Solicitando horóscopos a: ${MODEL_NAME}`);
  
  const prompt = `Actúa como un astrólogo experto. Genera un horóscopo diario corto (máximo 2 frases) para cada uno de los 12 signos del zodiaco en español. 
  Devuelve EXCLUSIVAMENTE un objeto JSON con este formato: {"Aries": "...", "Tauro": "..."}. 
  No incluyas markdown, ni bloques de código, ni texto adicional. Solo el JSON puro.`;

  try {
    const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        // Relajamos los filtros para que no bloquee predicciones inofensivas
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Limpieza de seguridad extra
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1) throw new Error("No se encontró JSON en la respuesta.");
    
    return JSON.parse(text.slice(start, end + 1));

  } catch (error) {
    console.error("ERROR AL GENERAR:", error.message);
    // Fallback: Si falla, devolvemos un aviso digno para el usuario
    const fallback = {};
    for (const sign of SIGNS) {
      fallback[sign.name] = "Las estrellas están alineándose... Vuelve en unos minutos para tu predicción.";
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
    await execAsync('git push origin main');
    console.log('GitHub actualizado correctamente.');
  } catch (error) {
    console.log('No hubo cambios o error en git:', error.message);
  }
}

updateIndexHtml();
