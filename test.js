const natural = require('natural');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const tokenizer = new natural.WordTokenizer();

const classifier = new natural.BayesClassifier();

classifier.addDocument('Hola', 'saludo');
classifier.addDocument('¿Cómo estás?', 'saludo');
classifier.addDocument('Me llamo Gambino', 'nombre');
classifier.addDocument('Mi nombre es Gambino', 'nombre');
classifier.addDocument('Quiero saber más sobre prevención de consumo', 'prevencion');
classifier.addDocument('¿Qué son las drogas?', 'drogas');
classifier.addDocument('¿Cuáles son los efectos del consumo de drogas?', 'drogas');
classifier.addDocument('¿Qué dice la ley sobre el consumo de drogas?', 'informacion_legal');
classifier.addDocument('¿Cuáles son las sanciones por consumir drogas en público?', 'informacion_legal');
classifier.addDocument('¿Qué debo hacer si creo que tengo un problema con las drogas?', 'que_hacer');
classifier.addDocument('¿Cómo puedo obtener ayuda si consumo drogas?', 'ayuda');
classifier.addDocument('¿Qué puedo hacer para prevenir el consumo de drogas?', 'prevencion');
classifier.addDocument('¿Cómo identificar si alguien tiene un problema con las drogas?', 'prevencion');
classifier.addDocument('¿Dónde puedo conseguir ayuda para dejar las drogas?', 'ayuda');
classifier.addDocument('¿Qué pasa si me atrapan con drogas en la calle?', 'informacion_legal');
classifier.addDocument('¿Las drogas son malas para la salud?', 'drogas');
classifier.addDocument('¿Cómo puedo saber si una persona está abusando de las drogas?', 'prevencion');

classifier.addDocument('¿Qué es el abuso de drogas?', 'abusodrogas');
classifier.addDocument('¿Cómo se define el abuso de drogas?', 'abusodrogas');
classifier.addDocument('¿Qué significa abuso de sustancias?', 'abusodrogas');
classifier.addDocument('¿Cuáles son los efectos del abuso de drogas?', 'abusodrogas');
classifier.addDocument('¿Qué consecuencias tiene el abuso de drogas?', 'abusodrogas');
classifier.addDocument('¿Las drogas pueden causar adicción?', 'adictivas');
classifier.addDocument('¿Las drogas son siempre peligrosas?', 'drogas');
classifier.addDocument('¿Las drogas afectan solo a los jóvenes?', 'efectos');
classifier.addDocument('¿Cómo afectan las drogas al cerebro?', 'efectos');
classifier.addDocument('¿Qué efectos tienen las drogas en el cuerpo?', 'efectos');
classifier.addDocument('¿Cómo puedo ayudar a un amigo que consume drogas?', 'ayuda.amigo');
classifier.addDocument('¿Qué debo hacer si tengo un amigo que está usando drogas?', 'ayuda.amigo');
classifier.addDocument('¿Qué puedo hacer para ayudar a una persona con problemas de drogas?', 'ayuda.amigo');
classifier.addDocument('¿Cómo puedo hablar con alguien que está luchando contra las drogas?', 'ayuda.amigo');
classifier.addDocument('¿Cómo puedo prevenir el consumo de drogas?', 'prevencion');
classifier.addDocument('¿Qué puedo hacer para prevenir el abuso de drogas?', 'prevencion');
classifier.addDocument('¿Cómo identificar a una persona que está consumiendo drogas?', 'prevencion');

classifier.train();

let userName = '';
const greetingWords = ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'hey'];

const getResponse = (message) => {
  const classification = classifier.classify(message);
  return classification;
};

const isGreeting = (message) => {
  const lowerCaseMessage = message.toLowerCase();
  return greetingWords.some(greeting => lowerCaseMessage.includes(greeting));
};

const askForName = () => {
  rl.question('Hola, ¿cuál es tu nombre? ', (name) => {
    if (isGreeting(name)) {
      console.log('¡Hola! ¿Me podrías decir tu nombre?');
      askForName();
    } else {
      userName = name;
      console.log(`Mucho gusto, ${userName}!`);
      startConversation();
    }
  });
};

const startConversation = () => {
  rl.on('line', (input) => {
    const response = getResponse(input);

    if (isGreeting(input)) {
      console.log('¡Hola! ¿Cómo puedo ayudarte hoy?');
    }
    else if (response === 'nombre') {
      console.log(`¡Hola ${userName}, qué gusto conocerte nuevamente!`);
    }
    else if (response === 'drogas') {
      console.log('Las drogas son sustancias que pueden alterar el funcionamiento normal del cuerpo y la mente. Pueden tener efectos nocivos para la salud.');
    }
    else if (response === 'prevencion') {
      console.log('Prevenir el consumo de drogas implica educar a las personas, ofrecer alternativas saludables y fomentar el autocuidado.');
    }
    else if (response === 'abusodrogas') {
      console.log('El abuso de drogas puede causar graves problemas de salud física y mental. Las personas que abusan de las drogas a menudo experimentan dependencia y efectos adversos en su bienestar.');
    }
    else if (response === 'efectos') {
      console.log('Las drogas pueden alterar el sistema nervioso central y causar daño al cerebro, problemas respiratorios y trastornos psicológicos.');
    }
    else if (response === 'informacion_legal') {
      console.log('La ley varía según el país, pero en general el consumo de drogas está prohibido y puede acarrear sanciones legales.');
    }
    else if (response === 'que_hacer') {
      console.log('Si crees que tienes un problema con las drogas, lo mejor es buscar ayuda profesional o acercarte a un centro de apoyo.');
    }
    else if (response === 'ayuda') {
      console.log('Puedes buscar ayuda en centros de tratamiento, organizaciones de apoyo o hablar con un profesional de la salud.');
    }
    else if (response === 'ayuda.amigo') {
      console.log('Lo más importante es ofrecer apoyo emocional, escuchar sin juzgar, y alentar a la persona a buscar ayuda profesional.');
    }
    else {
      console.log('Lo siento, no entendí eso. ¿Puedes intentar otra vez?');
    }
  });
};

askForName();
