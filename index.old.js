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


const esSaludo = (texto) =>  {
  const saludos = [
    'hola', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos', 'hey', 'hi', 'hello', '¿qué tal?', 
    '¿cómo estás?', '¿cómo te va?', '¿qué pasa?', 'qué tal', 'qué onda', 'qué hay', 'buenas', 'saluditos', 
    'bienvenido', 'bienvenida', '¿qué tal?', 'hola qué tal', '¿cómo andas?', 'hey, ¿cómo estás?', 'hola amigo',
    'buen día', 'buenas tardes a todos', 'buenas noches a todos', 'saludos cordiales', 'hola gente', 
    '¿cómo te va?', 'qué pasa amigo', '¡ey!', '¡hola hola!', 'buenos días amigo', 'hola ¿cómo estás?', 
    'hola, ¿qué tal?', 'hola ¿cómo va?', '¿todo bien?', 'qué tal todo', 'buen día, ¿cómo estás?', 
    'buen día ¿qué tal?', 'buenas, ¿cómo va todo?', 'hey, ¿qué tal?', '¿qué tal todo?', 'hola gente, ¿cómo va?', 
    'qué hay', '¿qué tal amigo?', 'buenas noches ¿cómo va?', 'saludos amigo', 'hola ¿qué pasa?', 'buenas ¿cómo va?', 
    'saludos ¿qué tal?', 'buen día ¿qué tal?', 'saludos ¿cómo va?', 'hola ¿qué onda?', 'buenas, ¿qué tal?', 
    'hola ¿qué pasa?', '¡hey, qué tal!', '¡buenas tardes!', '¡buenas noches!', '¿todo tranquilo?', 'saludos a todos', 
    'hola, ¿cómo andas?', 'hola ¿qué tal todo?', '¿cómo te encuentras?', '¿todo bien contigo?', '¡buenas!, ¿qué tal?', 
    '¡hola!, ¿qué pasa?', 'buenas, ¿todo bien?', '¡qué onda!', 'hola ¿cómo va todo?', '¡saludos!, ¿cómo estás?', 
    '¿qué onda amigo?', '¡hola!, ¿qué tal todo?', '¡buenas!, ¿todo bien?', '¡hola!, ¿cómo andas?', '¿qué tal, amigo?', 
    '¡saludos! ¿cómo va?', 'hola, ¿todo bien?', 'hola ¿qué tal, todo bien?', '¡buenas!, ¿cómo te va?', '¡hola! ¿cómo va todo?',
    '¡hola!, ¿todo tranquilo?', '¡hola!, ¿cómo te encuentras?', '¡qué pasa!, ¿todo bien?', '¡saludos!, ¿cómo te va?', 
    '¡buenas!, ¿cómo estás?', 'hola, ¿cómo te encuentras?', '¡hey!, ¿cómo va?', '¡hola!, ¿qué tal?', 'hola, ¿qué pasa?, todo bien?', 
    '¡hola! ¿qué tal todo?', '¿cómo va todo?', 'hola, ¿cómo estás tú?', 'buenas, ¿qué tal todo?', '¡hola!, ¿qué tal amigo?', 
    'hola ¿cómo te va todo?', '¡buenas!, ¿qué pasa?', 'holaa', 'hoolaa', 'holaa amigo', 'holas', 'holii', 'buenas tardesito', 
    'buennas', 'buenos diass', 'buenass', 'heyy', 'holaa qué tal', 'ke tal', 'ke onda', 'buenos díasss', 'holaaaa', 
    '¿que tal?', 'holaaa', 'que tall', 'buens', 'ke tal', 'holitas', 'holi', '¿todo bienn?', 'buenass tardes', 
    'k tal', 'k pasa', 'holaa todo bien', 'que talss', 'quehonda', 'hola ke tal', 'buenass noches', 'holaa amigo',
    'ola', 'olaa', 'olass', 'ola que tal', 'ola ke tal', 'ola todo bien', 'ola todo bienn', 'holaaa que tal', 'holaaa',
    'ke tal ola', 'olas ke tal', 'olass amigo', 'olaaa', 'holaaa ke tal', 'hola ola', 'hola olass', 'holaa ¿qué tal?', 
    'holaaa ¿cómo estás?', 'ola ¿todo bien?', 'qué onda ola', 'ola ¿qué pasa?', 'holas ¿todo bien?', 'holi, ¿cómo vas?',
    'holita, ¿cómo estás?', 'buenos días, ¿cómo estás?', 'olaa ¿qué tal?', 'hola, ¿todo bien?', 'holas, ¿cómo andas?', 
    'hola ¿cómo te encuentras?', 'holaa ¿cómo va todo?', 'buenas tardes ¿cómo estás?', 'buenas noches ¿cómo estás?', 
    'buenos días ¿cómo te va?', 'hey ¿cómo te va?', 'qué tal ¿todo bien?', '¿qué tal, amigo?, ¿todo bien?', 'buenas, ¿cómo va?',
    '¡hey!, ¿qué tal todo?', 'buenas ¿qué tal todo?', '¡hola!, ¿todo tranquilo?', '¡holaaaa!', 'qué tal ¿todo bien?, amigo',
    '¡hola! ¿cómo va todo?', '¡buenas!, ¿todo en orden?', '¡hola! ¿qué tal amigo?', '¡buenas!, ¿todo en orden?', 'qué tal, ¿todo bien?',
    '¡holi! ¿cómo estás?', '¿todo bien? ¡Hola!', '¡hey!, ¿todo bien?', 'buenos días, ¿cómo te va?', '¡hola!, ¿todo bien amigo?',
    '¡qué tal!, ¿todo bien?', 'holis, ¿cómo va todo?', '¡buenas!, ¿cómo te encuentras?', '¡buenas!, ¿todo en orden?', 'hola ¿todo tranquilo?',
    'hola ¿cómo va todo?', 'buenas, ¿qué pasa amigo?', '¡hola!, ¿qué tal todo?, ¿todo bien?', '¡saludos!, ¿cómo va todo?', 
    'hola, ¿todo bien?', 'buenas, ¿cómo va eso?', '¿todo bien?, ¡hola!', 'saludos, ¿cómo va todo?', 'holi, ¿cómo va todo?'
  ];

  const palabras = texto.toLowerCase().split(/\s+/);
  return palabras.some(palabra => saludos.includes(palabra));
}

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
  const sessionId = req.headers['x-session-id'];
  const pregunta = req.query.consulta;
  const session = req.session;

  if (!pregunta) {
      return res.status(400).json({ message: 'La pregunta es requerida' });
  }

  let respuesta = []
  try {
      if(session.esperandoNombre) {
          const arrPregunta = pregunta.split(' ');
          let response;
          let saludo;
          if ( arrPregunta.length <= 1 ) {
            for (const pregunta of arrPregunta) {
              saludo = esSaludo(pregunta);
              if (saludo) continue;
              response = await managerPresentacion.process('es', `Me llamo ${pregunta}`);
              if(response.intent != 'None') {
                if(response.entities < 0) {
                  await pool.query(
                    `INSERT INTO named_entities (entity_type_id, entity_value, language) VALUES (1, $1, 'es')`,
                    [pregunta]
                  );
                }
                break;
              }; 
            }
          } else {
            response = await managerPresentacion.process('es', pregunta);
          }

          if(response) {
            response = response.intent == 'None' ? await managerPresentacion.process('es', pregunta) : response;

          } else {
            response = await manager.process('es', pregunta)
          }

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
            session.nombre = nombre || pregunta;

            const insertResult = await pool.query(
              'INSERT INTO usuarios (nombre, session_id) VALUES ($1, $2) RETURNING id',
              [session.nombre, sessionId]
            );

            if (nombre) {
              respuesta.push(`¡Hola, ${nombre}! Encantado de conocerte. ¿Qué tema te gustaría abordar?`)
            } else {
              respuesta.push(`¡Hola! Encantado de conocerte. ¿Qué tema te gustaría abordar?`);

              // Segunda respuesta
              const response = await manager.process('es', pregunta);
              if (response.answer) {
                respuesta.push(response.answer);
              } else {
                  const result = await pool.query(
                    'SELECT respuesta FROM entrenamiento WHERE $1 = ANY (preguntas) LIMIT 1',
                    [pregunta]
                  );
                  if (result.rows.length > 0) {
                    respuesta.push(result.rows[0].respuesta);
                  }
              }
              // Segunda respuesta

              return res.status(200).json({ respuesta });
            }
          } else {
            session.esperandoNombre = true;
            respuesta.push(`¡Hola! ¿Cuál es tu nombre para poder comenzar?`);
          }

          for (const item of respuesta) {
            await pool.query(
              'INSERT INTO conversaciones (session_id, pregunta, respuesta) VALUES ($1, $2, $3)',
              [sessionId, pregunta, item]
            );
          }
          
          return res.status(200).json({ respuesta });
      }

      const response = await manager.process('es', pregunta);

      if (response.answer) {
          respuesta.push(response.answer);
          // return res.status(200).json({ respuesta: [response.answer] });
      } else {
          const result = await pool.query(
              'SELECT respuesta FROM entrenamiento WHERE $1 = ANY (preguntas) LIMIT 1',
              [pregunta]
          );

          if (result.rows.length > 0) {
            respuesta.push(result.rows[0].respuesta);
            // return res.status(200).json({ respuesta: [result.rows[0].respuesta] });
          } else {
            await pool.query(
              'INSERT INTO consultas_no_resueltas (pregunta) VALUES ($1)',
              [pregunta]
            );
            respuesta.push('Lo siento, no tengo una respuesta para esa pregunta.');
            // return res.status(200).json({ respuesta: ['Lo siento, no tengo una respuesta para esa pregunta.'] });
          }
      }

      for (const item of respuesta) {
        await pool.query(
          'INSERT INTO conversaciones (session_id, pregunta, respuesta) VALUES ($1, $2, $3)',
          [sessionId, pregunta, item]
        );
      }
      return res.status(200).json({ respuesta });
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
    // console.log('Entidades nombradas:', res.rows);
    return res.rows;
  } catch (err) {
    console.error('Error al consultar entidades nombradas:', err);
  }
}
