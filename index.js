const express = require('express');
const { NlpManager } = require('node-nlp');
const pool = require('./db');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3001;
const manager = new NlpManager({ languages: ['es'] });

const API_KEY = process.env.HF_TOKEN;;

app.use(cors());
app.use(express.json());

const generarVariaciones = async (pregunta) => {
  let variaciones = [];

  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/t5-base', 
      {
        inputs: pregunta,
        parameters: {
            num_return_sequences: 50,   // Número de variantes a generar (ajustado a 4)
            num_beams: 50,              // Número de haces (más haces)
            temperature: 1.5,           // Aumento de la creatividad
            top_p: 1,                   // Muestra más opciones
            max_length: 500             // Longitud máxima de las respuestas
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach((item) => {
        variaciones.push(item.translation_text);
      })
    } else {
      console.log('Estructura inesperada de la respuesta');
    }
  } catch (error) {
    console.error('Error al generar variantes:', error.response ? error.response.data : error.message);
  }

  return variaciones;
};


// Endpoint para entrenar al bot
app.post('/entrenar', async (req, res) => {
    const { preguntas, respuesta, etiqueta } = req.body;

    if (!preguntas || !respuesta || !etiqueta) {
        return res.status(400).json({ message: 'Faltan datos para entrenar al bot' });
    }

    // Guardar en la base de datos
    try {
        await preguntas.forEach(async (pregunta) => {
          manager.addDocument('es', pregunta, etiqueta);
        })
        
        await pool.query(
            'INSERT INTO entrenamiento (preguntas, respuesta, etiqueta) VALUES ($1, $2, $3)',
            [preguntas, respuesta, etiqueta]
        );

        await preguntas.forEach(async (pregunta) => {
          await new Promise(resolve => setTimeout(resolve, 60000));
          const variaciones = await generarVariaciones(pregunta);
          variaciones.forEach(async (variacion) => {
              await pool.query(
                  'INSERT INTO variaciones_preguntas (pregunta_original, variacion, etiqueta) VALUES ($1, $2, $3)',
                  [pregunta, variacion, etiqueta]
              );
              manager.addDocument('es', variacion, etiqueta); // Entrenar el bot con las variaciones
          });
        });

        manager.addAnswer('es', etiqueta, respuesta);
        await manager.train();
        res.status(200).json({ message: '¡Bot entrenado con éxito y datos guardados!' });
    } catch (error) {
        console.error('Error al guardar en la base de datos:', error);
        res.status(500).json({ message: 'Error al entrenar al bot' });
    }
});

app.get('/entrenamientos', async (req, res) => {
  try {
      const result = await pool.query('SELECT * FROM entrenamiento');
      res.status(200).json(result.rows);
  } catch (error) {
      console.error('Error al consultar datos:', error);
      res.status(500).json({ message: 'Error al consultar datos de entrenamiento' });
  }
});

app.get('/consultar', async (req, res) => {
  const pregunta = req.query.consulta;

  if (!pregunta) {
      return res.status(400).json({ message: 'La pregunta es requerida' });
  }

  try {
      const response = await manager.process('es', pregunta);

      if (response.answer) {
          return res.status(200).json({ respuesta: response.answer });
      } else {
          const result = await pool.query(
              'SELECT respuesta FROM entrenamiento WHERE $1 = ANY (preguntas) LIMIT 1',
              [pregunta]
          );

          if (result.rows.length > 0) {
              return res.status(200).json({ respuesta: result.rows[0].respuesta });
          } else {

              await pool.query(
                'INSERT INTO consultas_no_resueltas (pregunta) VALUES ($1)',
                [pregunta]
              );
              return res.status(200).json({ respuesta: 'Lo siento, no tengo una respuesta para esa pregunta.' });
          }
      }
  } catch (error) {
      console.error('Error al consultar al bot:', error);
      res.status(500).json({ message: 'Error al consultar al bot' });
  }
});

app.get('/consultas-no-resultas', async (req, res) => {
  try {
      const result = await pool.query('SELECT * FROM consultas_no_resueltas');
      res.status(200).json(result.rows);
  } catch (error) {
      console.error('Error al consultar datos:', error);
      res.status(500).json({ message: 'Error al consultar datos de entrenamiento' });
  }
});

app.get('/variaciones', async (req, res) => {
  try {
      const result = await pool.query('SELECT * FROM variaciones_preguntas');
      res.status(200).json(result.rows);
  } catch (error) {
      console.error('Error al consultar variaciones:', error);
      res.status(500).json({ message: 'Error al consultar variaciones de preguntas' });
  }
});

// Entrenar con datos previos de la base de datos al inicio del servidor
(async () => {
    try {
        const result = await pool.query('SELECT * FROM entrenamiento');
        result.rows.forEach((row) => {
            row.preguntas.forEach((pregunta) => {
                manager.addDocument('es', pregunta, row.etiqueta);
            });
            manager.addAnswer('es', row.etiqueta, row.respuesta);
        });

        const resultVariaciones = await pool.query('SELECT * FROM variaciones_preguntas');
        resultVariaciones.rows.forEach((row) => {
            manager.addDocument('es', row.variacion, row.etiqueta);
        });
        
        await manager.train();
        console.log('¡Entrenamiento completado con los datos iniciales!');
    } catch (error) {
        console.error('Error al cargar datos de la base de datos:', error);
    }
})();

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
