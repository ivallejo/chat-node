CREATE TABLE entrenamiento (
    id SERIAL PRIMARY KEY,
    preguntas TEXT[] NOT NULL, -- Almacena las preguntas como un array de texto
    respuesta TEXT NOT NULL,   -- La respuesta asociada
    etiqueta TEXT NOT NULL,     -- La etiqueta para clasificar el tema
    type VARCHAR(10) NOT NULL
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
    etiqueta TEXT NOT NULL,
    type VARCHAR(10) NOT NULL
);

CREATE TABLE entity_types (
    id SERIAL PRIMARY KEY,          -- Identificador único
    entity_type VARCHAR(50) NOT NULL UNIQUE -- Tipo de entidad (ej.: 'nombre')
);
CREATE TABLE named_entities (
    id SERIAL PRIMARY KEY,          -- Identificador único
    entity_type_id INT NOT NULL,    -- Referencia al tipo de entidad
    entity_value VARCHAR(100) NOT NULL, -- Valor de la entidad (ej.: 'Luis')
    language VARCHAR(10) NOT NULL,  -- Idioma asociado (ej.: 'es'),
    FOREIGN KEY (entity_type_id) REFERENCES entity_types (id) -- Clave foránea
);

INSERT INTO entity_types (entity_type)
VALUES
    ('nombre');

INSERT INTO named_entities (entity_type_id, entity_value, language)
VALUES
    (1, 'Luis', 'es'),
    (1, 'Sabina', 'es'),
    (1, 'Margareth', 'es'),
    (1, 'Emilia', 'es'),
    (1, 'Gambino', 'es');

delete from entrenamiento
delete from variaciones_preguntas;

select * from entrenamiento;
select * from variaciones_preguntas;