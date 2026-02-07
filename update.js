import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { GoogleGenAI } = require("@google/generative-ai");

import * as fs from 'fs/promises';

const apiKey = process.env.GEMINI_API_KEY;
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
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Actúa como un astrólogo profesional. Genera el horóscopo de hoy para los 12 signos del zodiaco. 
    Devuelve estrictamente un objeto JSON donde las llaves sean los nombres de los signos y los valores sean las predicciones en español.
    Ejemplo: {"Aries": "Hoy será un gran día...", "Tauro": "..."}
    No incluyas explicaciones, ni markdown, ni bloques de código. Solo el JSON puro.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Limpieza de seguridad por si la IA devuelve ```json ... ```
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se encontró JSON");
    
    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error("ERROR EN GEMINI:", error.message);
    const fallback = {};
    for (const sign of SIGNS) {
      fallback[sign.name] = "Las estrellas están en mantenimiento. Vuelve pronto.";
    }
    return fallback;
  }
}

async function updateIndexHtml() {
  try {
    const horoscopes = await generateAllHoroscopes();
    const date = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    let horoscopeHtml = "";
    for (const sign of SIGNS) {
      const prediccion = horoscopes[sign.name] || "Sin predicción disponible.";
      horoscopeHtml += `
      <div class="sign">
        <h2>${sign.name} ${sign.symbol}</h2>
        <p>${prediccion}</p>
      </div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Horóscopo de Hoy</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f0f2f5; }
        h1 { text-align: center; color: #1a202c; }
        .sign { background: white; padding: 20px; margin-bottom: 15px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        h2 { margin: 0 0 10px 0; color: #2d3748; border-bottom: 3px solid #6366f1; display: inline-block; }
        p { color: #4a5568; margin: 0; }
    </style>
</head>
<body>
    <h1>${date}</h1>
    <main>${horoscopeHtml}</main>
</body>
</html>`;
  
    await fs.writeFile('index.html', html);
    console.log("✅ ¡Horóscopo actualizado con éxito!");
  } catch (error) {
    console.error("Error crítico:", error);
  }
}

updateIndexHtml();
