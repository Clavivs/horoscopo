import { GoogleGenerativeAI } from '@google/generative-ai';
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

async function generateAllHoroscopes() {
  const horoscopes = {};
  console.log(`Iniciando generación con pausas obligatorias...`);

  // Configuramos el modelo sin filtros complejos para evitar errores de importación
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  for (const sign of SIGNS) {
    try {
      console.log(`Solicitando ${sign.name}...`);
      
      const prompt = `Escribe un horóscopo muy corto para ${sign.name} hoy en español. Máximo 2 frases. Solo el texto.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      if (text) {
        horoscopes[sign.name] = text;
        console.log(`✅ ${sign.name} ok.`);
      } else {
        throw new Error("Respuesta vacía");
      }

    } catch (error) {
      console.error(`❌ Error en ${sign.name}:`, error.message);
      horoscopes[sign.name] = "Las estrellas están alineándose... Vuelve en unos minutos.";
    }

    // LA PAUSA AHORA ESTÁ FUERA DEL TRY/CATCH
    // Esto garantiza que el script tarde 180 segundos (3 min) sí o sí.
    if (sign.name !== "Piscis") {
      console.log("Esperando 15 segundos para no saturar la API...");
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  return horoscopes;
}

async function updateIndexHtml() {
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const horoscopes = await generateAllHoroscopes();

  let horoscopeHtml = "";
  for (const sign of SIGNS) {
    const text = horoscopes[sign.name] || "Contenido no disponible.";
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
    body { font-family: sans-serif; margin: 0; background-color: #0f0c29; color: #eee; }
    .container { max-width: 800px; margin: 30px auto; padding: 25px; background: #1a1a2e; border-radius: 15px; }
    h1 { color: #f0ad4e; text-align: center; }
    .date { color: #5bc0de; text-align: center; }
    .sign { margin-top: 20px; padding: 10px; border-bottom: 1px solid #333; }
    .footer { font-size: 0.8em; text-align: center; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Horóscopo Diario</h1>
    <p class="date">${date}</p>
    ${horoscopeHtml}
    <p class="footer">Actualizado: ${new Date().toLocaleTimeString('es-ES')}</p>
  </div>
</body>
</html>`;

  await fs.writeFile('index.html', newContent);
  
  try {
    await execAsync('git config user.name "github-actions[bot]"');
    await execAsync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    await execAsync('git add index.html');
    await execAsync('git commit -m "Update horoscopo"');
    await execAsync('git push origin main');
    console.log('GitHub actualizado.');
  } catch (e) {
    console.log('Git sin cambios.');
  }
}

updateIndexHtml();
