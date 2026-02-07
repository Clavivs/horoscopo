import * as GoogleAI from "@google/generative-ai";
// Extraemos la clase del espacio de nombres importado
const { GoogleGenAI } = GoogleAI;
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
    
    // Prompt más específico para evitar errores de parseo
    const prompt = `Actúa como un astrólogo profesional. Genera el horóscopo de hoy para los 12 signos del zodiaco. 
    Devuelve estrictamente un objeto JSON donde las llaves sean los nombres de los signos y los valores sean las predicciones.
    Ejemplo: {"Aries": "Hoy será un gran día...", "Tauro": "..."}
    No incluyas explicaciones, ni markdown, ni bloques de código. Solo el JSON puro.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Limpieza avanzada: Extrae lo que esté entre las llaves { } por si la IA añade texto extra
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se encontró un formato JSON válido en la respuesta.");
    
    const horoscopes = JSON.parse(jsonMatch[0]);
    return horoscopes;

  } catch (error) {
    console.error("DETALLE DEL ERROR:", error.message);
    const fallback = {};
    for (const sign of SIGNS) {
      fallback[sign.name] = "Las estrellas están tímidas hoy. Inténtalo más tarde.";
    }
    return fallback;
  }
}

async function updateIndexHtml() {
  try {
    const horoscopes = await generateAllHoroscopes();
    const date = new Date().toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let horoscopeHtml = "";
    for (const sign of SIGNS) {
      // Usamos el nombre del signo para buscar en el JSON
      const prediccion = horoscopes[sign.name] || "Predicción no disponible.";
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
    <title>Horóscopo Diario</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f4f4f9; }
        h1 { text-align: center; color: #2c3e50; text-transform: capitalize; }
        .sign { background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h2 { margin-top: 0; color: #34495e; border-bottom: 2px solid #3498db; display: inline-block; }
        p { color: #555; }
    </style>
</head>
<body>
    <h1>${date}</h1>
    <main>${horoscopeHtml}</main>
</body>
</html>`;
  
    await fs.writeFile('index.html', html);
    console.log("✅ index.html generado con éxito");
  } catch (error) {
    console.error("Error crítico actualizando el HTML:", error);
  }
}

updateIndexHtml();
