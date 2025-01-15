const express = require('express');
const { NlpManager } = require('node-nlp');
const pool = require('./db');
const axios = require('axios');
const uuid = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const manager = new NlpManager({ languages: ['es']});

const managerPresentacion = new NlpManager({ languages: ['es'] });

const API_KEY = process.env.HF_TOKEN;

app.use(cors());
app.use(express.json());

const sesiones = {};

app.use((req, res, next) => {
    let sessionId = req.headers['x-session-id'];

    if (!sessionId) {
        sessionId = uuid.v4();
        res.setHeader('x-session-id', sessionId);
    }

    if (!sesiones[sessionId]) {
        sesiones[sessionId] = { esperandoNombre: true, nombre: null };
    }

    req.session = sesiones[sessionId];
    next();
});

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

app.post('/entrenar', async (req, res) => {
    const { preguntas, respuesta, etiqueta, type } = req.body;

    if (!preguntas || !respuesta || !etiqueta || !type) {
        return res.status(400).json({ message: 'Faltan datos para entrenar al bot' });
    }

    try {
        await preguntas.forEach(async (pregunta) => {
          manager.addDocument('es', pregunta, etiqueta);
        })
        
        await pool.query(
            'INSERT INTO entrenamiento (preguntas, respuesta, etiqueta, type) VALUES ($1, $2, $3, $4)',
            [preguntas, respuesta, etiqueta, type]
        );

        await preguntas.forEach(async (pregunta) => {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const variaciones = await generarVariaciones(pregunta);
          variaciones.forEach(async (variacion) => {
              await pool.query(
                  'INSERT INTO variaciones_preguntas (pregunta_original, variacion, etiqueta, type) VALUES ($1, $2, $3, $4)',
                  [pregunta, variacion, etiqueta, type]
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
  const session = req.session;

  if (!pregunta) {
      return res.status(400).json({ message: 'La pregunta es requerida' });
  }

  try {
      if(session.esperandoNombre) {
          const response = await managerPresentacion.process('es', pregunta);

          let nombre;
          let blnPresentation = false;
          if (response.intent == 'None') {
            const result = await pool.query(
              `SELECT entity_value FROM named_entities WHERE entity_value like '%${pregunta}%' LIMIT 1`
            );
            if (result.rows.length > 0) {
              nombre = pregunta;
              blnPresentation = true;
            }
          } else {
            const nombreEntity = response.entities.find((entity) => entity.entity === 'nombre');
            nombre = nombreEntity?.utteranceText;
            blnPresentation = true;
          }

          if (blnPresentation) {
            session.esperandoNombre = false;
            if (nombre) {
              session.nombre = nombre;
              session.esperandoNombre = false;

              return res.status(200).json({ respuesta: [`¡Hola, ${nombre}! Encantado de conocerte. ¿Cómo puedo ayudarte?`] });
            } else {
              session.nombre = pregunta;
              respuesta = `¡Hola! Encantado de conocerte. ¿Cómo puedo ayudarte?`;

              // Segunda respuesta
              const response = await manager.process('es', pregunta);
              let message;
              if (response.answer) {
                message = response.answer
              } else {
                  const result = await pool.query(
                    'SELECT respuesta FROM entrenamiento WHERE $1 = ANY (preguntas) LIMIT 1',
                    [pregunta]
                  );
                  if (result.rows.length > 0) {
                    message = result.rows[0].respuesta;
                  }
              }
              // Segunda respuesta

              return res.status(200).json({ respuesta: [ respuesta, message] });
            }
          } else {
            session.esperandoNombre = true;
            return res.status(200).json({ respuesta: ['¡Hola! ¿Cuál es tu nombre?'] });
          }
      }

      const response = await manager.process('es', pregunta);

      if (response.answer) {
          return res.status(200).json({ respuesta: [response.answer] });
      } else {
          const result = await pool.query(
              'SELECT respuesta FROM entrenamiento WHERE $1 = ANY (preguntas) LIMIT 1',
              [pregunta]
          );

          if (result.rows.length > 0) {
              return res.status(200).json({ respuesta: [result.rows[0].respuesta] });
          } else {
            await pool.query(
              'INSERT INTO consultas_no_resueltas (pregunta) VALUES ($1)',
              [pregunta]
            );
            return res.status(200).json({ respuesta: ['Lo siento, no tengo una respuesta para esa pregunta.'] });
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

(async () => {
    try {


        const data = await getNamedEntities();
       
        const groupedData = data.reduce((acc, item) => {
          if (!acc[item.entity_type]) {
            acc[item.entity_type] = [];
          }
          acc[item.entity_type].push(item.entity_value);
          return acc;
        }, {});
        
        for (const entityType in groupedData) {
          const entityValues = groupedData[entityType];
          await managerPresentacion.addNamedEntityText(entityType, entityValues, ['es']);
        }

        const resultPresentacion = await pool.query("SELECT * FROM entrenamiento where type = 'presentacion'");
        resultPresentacion.rows.forEach((row) => {
            row.preguntas.forEach((pregunta) => {
              managerPresentacion.addDocument('es', pregunta, row.etiqueta);
            });
            managerPresentacion.addAnswer('es', row.etiqueta, row.respuesta);
        });
        await managerPresentacion.train();


        const result = await pool.query("SELECT * FROM entrenamiento where type = 'general'");
        result.rows.forEach((row) => {
            row.preguntas.forEach((pregunta) => {
                manager.addDocument('es', pregunta, row.etiqueta);
            });
            manager.addAnswer('es', row.etiqueta, row.respuesta);
        });

        const resultVariaciones = await pool.query("SELECT * FROM variaciones_preguntas where type = 'general'");
        resultVariaciones.rows.forEach((row) => {
            manager.addDocument('es', row.variacion, row.etiqueta);
        });

        await manager.train();
        console.log('¡Entrenamiento completado con los datos iniciales!');
    } catch (error) {
        console.error('Error al cargar datos de la base de datos:', error);
    }
})();

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


async function getNamedEntities() {
  try {
    const query = `
      SELECT 
        e.entity_value, 
        t.entity_type, 
        e.language
      FROM 
        named_entities e
      JOIN 
        entity_types t
      ON 
        e.entity_type_id = t.id
    `;
    const res = await pool.query(query);
    console.log('Entidades nombradas:', res.rows);
    return res.rows;
  } catch (err) {
    console.error('Error al consultar entidades nombradas:', err);
  }
}