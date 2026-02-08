import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';

// --- Configuración ---
// La clave se inyecta de los Secrets de GitHub
const apiKey = process.env.GEMINI_API_KEY; 
const model = "gemini-2.5-flash"; 
const signName = "Aries"; 

if (!apiKey) {
  throw new Error("GEMINI_API_KEY no está configurada en los Secrets de GitHub.");
}

const ai = new GoogleGenAI({ apiKey });

// Petición al modelo
const prompt = `Genera el horóscopo diario para el signo ${signName} para hoy. 
La respuesta debe ser solo el texto del horóscopo, sin encabezados, fechas o títulos. 
Máximo 120 palabras.`;

async function generateHoroscope() {
  console.log(`Generando horóscopo para ${signName}...`);
  try {
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = result.response.text();

    if (!text) {
      throw new Error("Respuesta vacía de Gemini");
    }

    return text.trim();

  } catch (error) {
    console.error("❌ Error al llamar a la API de Gemini:", error);
    process.exit(1); // IMPORTANTE, ver abajo
  }
}


async function updateIndexHtml() {
  const newHoroscope = await generateHoroscope();
  const date = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // El nuevo contenido HTML generado
  const newContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Horóscopo Diario de ${signName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; text-align: center; background-color: #f4f4f9; }
        .container { max-width: 600px; margin: 30px auto; padding: 25px; border: 1px solid #ccc; border-radius: 10px; background-color: #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        h1 { color: #d9534f; border-bottom: 2px solid #d9534f; padding-bottom: 10px; }
        .date { color: #5bc0de; font-weight: bold; margin-bottom: 20px; }
        .horoscope-text { font-size: 1.1em; line-height: 1.6; text-align: justify; }
        .footer { margin-top: 30px; font-size: 0.8em; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Horóscopo Diario: ${signName} ♈</h1>
        <p class="date">Actualizado para el día: ${date}</p>
        <div class="horoscope-text">
            <p>${newHoroscope}</p>
        </div>
        <p class="footer">Generado automáticamente con la API de Gemini.</p>
    </div>
</body>
</html>
`;

  await fs.writeFile('index.html', newContent);
  console.log('index.html actualizado exitosamente.');
}

updateIndexHtml();
