import { GoogleGenAI } from "@google/genai";
// Fuerza a que la consola nos diga qué versión está usando
import { VERSION } from "@google/genai"; 
console.log("Versión de la librería:", VERSION);
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
    // Usamos gemini-1.5-flash que es estable y rápido
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Devuelve un JSON con el horóscopo de hoy para los 12 signos: {"Aries": "...", ...}. Solo JSON, sin markdown.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Limpiamos el texto por si viene con bloques de código markdown
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("DETALLE DEL ERROR:", error.message);
    const fallback = {};
    for (const sign of SIGNS) {
      fallback[sign.name] = "Error temporal: " + error.message;
    }
    return fallback;
  }
}

async function updateIndexHtml() {
  const horoscopes = await generateAllHoroscopes();
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let horoscopeHtml = "";
  for (const sign of SIGNS) {
    horoscopeHtml += `<div class="sign"><h2>${sign.name} ${sign.symbol}</h2><p>${horoscopes[sign.name]}</p></div>`;
  }

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Horóscopo</title></head><body><h1>${date}</h1>${horoscopeHtml}</body></html>`;
  
  await fs.writeFile('index.html', html);
  console.log("✅ index.html generado");
}

updateIndexHtml();
