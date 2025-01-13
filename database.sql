CREATE TABLE entrenamiento (
    id SERIAL PRIMARY KEY,
    preguntas TEXT[] NOT NULL, -- Almacena las preguntas como un array de texto
    respuesta TEXT NOT NULL,   -- La respuesta asociada
    etiqueta TEXT NOT NULL     -- La etiqueta para clasificar el tema
);

CREATE TABLE consultas_no_resueltas (
    id SERIAL PRIMARY KEY,
    pregunta TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE variaciones_preguntas (
    id SERIAL PRIMARY KEY,
    pregunta_original TEXT NOT NULL,
    variacion TEXT NOT NULL,
    etiqueta TEXT NOT NULL
);

delete from entrenamiento
delete from variaciones_preguntas;

select * from entrenamiento;
select * from variaciones_preguntas;