const express = require('express');
const { NlpManager } = require('node-nlp');

const app = express();
const port = 3001;

// Crear el manager de NLP
const manager = new NlpManager({ languages: ['es'] });

// Entrenar el modelo
async function trainBot() {
    // // Agregar algunos documentos predeterminados (intenciones)
    // manager.addDocument('es', '¿Qué son las drogas?', 'informacion.drogas');
    // manager.addDocument('es', '¿Cómo prevenir el consumo de drogas?', 'prevencion');
    // manager.addDocument('es', '¿Cuáles son los efectos del consumo de drogas?', 'efectos');
    // manager.addDocument('es', '¿Cómo puedo ayudar a un amigo con drogas?', 'ayuda.amigo');
    // manager.addDocument('es', '¿Qué puedo hacer para no consumir drogas?', 'prevencion');

    // // Respuestas predeterminadas
    // manager.addAnswer('es', 'informacion.drogas', 'Las drogas son sustancias que alteran la función del sistema nervioso y pueden tener efectos muy dañinos para la salud.');
    // manager.addAnswer('es', 'prevencion', 'La prevención incluye educación, apoyo emocional, y promoción de hábitos saludables.');
    // manager.addAnswer('es', 'efectos', 'El consumo de drogas puede causar daños en el cerebro, problemas respiratorios, y trastornos mentales.');
    // manager.addAnswer('es', 'ayuda.amigo', 'Hablar con él, escuchar sin juzgar y buscar ayuda profesional son pasos importantes para ayudar a un amigo.');
    // manager.addAnswer('es', 'prevencion', 'La mejor manera de prevenir el consumo de drogas es educar desde temprana edad, fomentar la comunicación abierta y practicar hábitos saludables.');

    // // Entrenar el modelo
    // await manager.train();
    // manager.save();
}

// Endpoint para saludar y preguntar nombre
app.get('/saludar', (req, res) => {
    const nombre = req.query.nombre || 'visitante';
    res.send(`¡Hola, ${nombre}! Soy tu asistente virtual sobre prevención del consumo de drogas. ¿En qué puedo ayudarte?`);
});

// Endpoint para procesar consulta sobre drogas
app.get('/consultar', async (req, res) => {
    const consulta = req.query.consulta;
    if (!consulta) {
        return res.status(400).send('Por favor, proporciona una consulta.');
    }

    const response = await manager.process('es', consulta);
    res.json({
        pregunta: consulta,
        respuesta: response.answer || 'Lo siento, no puedo responder a esa pregunta en este momento.'
    });
});

// Nuevo endpoint para entrenar el bot dinámicamente con múltiples preguntas
app.post('/entrenar', express.json(), async (req, res) => {
    const { preguntas, respuesta, etiqueta } = req.body;

    if (!preguntas || !respuesta || !etiqueta || !Array.isArray(preguntas)) {
        return res.status(400).send('Debes enviar un array de preguntas, una respuesta y una etiqueta.');
    }

    // Agregar las preguntas al modelo
    preguntas.forEach(pregunta => {
        manager.addDocument('es', pregunta, etiqueta);
    });

    // Agregar la misma respuesta para todas las preguntas
    manager.addAnswer('es', etiqueta, respuesta);

    // Reentrenar el modelo
    await manager.train();
    manager.save();

    res.send('¡Bot entrenado con éxito!');
});

// Entrenar el bot con datos predeterminados y correr el servidor
trainBot().then(() => {
    app.listen(port, () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
    });
});
