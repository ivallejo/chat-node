require("dotenv").config();
const cors = require('cors');
const OpenAI = require('openai');
const express = require('express');
const { Pool } = require('pg');
const { OPENAI_API_KEY, ASSISTANT_ID } = process.env;
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
});

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const assistantId = ASSISTANT_ID;
let pollingInterval;

async function createThread() {
    const thread = await openai.beta.threads.create();
    return thread;
}

async function addMessage(threadId, message) {
    const response = await openai.beta.threads.messages.create(
        threadId,
        {
            role: "user",
            content: message
        }
    );

    const query = `
        INSERT INTO conversations (thread_id, role, content)
        VALUES ($1, $2, $3)
    `;
    const values = [threadId, 'user', message];
    await pool.query(query, values);

    return response;
}

async function runAssistant(threadId) {
    try {
        const response = await openai.beta.threads.runs.create(
            threadId,
            { 
              assistant_id: assistantId
            }
        );
        return response;
    } catch (error) {
        throw error
    }
}

async function checkingStatus(res, threadId, runId) {
    const runObject = await openai.beta.threads.runs.retrieve(
        threadId,
        runId
    );

    const status = runObject.status;
    
    if(status == 'completed') {
        clearInterval(pollingInterval);

        const messagesList = await openai.beta.threads.messages.list(threadId);
        let messages = []
        
        const query_delete = `DELETE FROM conversations where thread_id = $1;`;
        const values_delete = [threadId];
        pool.query(query_delete, values_delete);

        messagesList.body.data.forEach(message => {

            const contents = message.content.map((content) => {
                return {
                    ...content,
                    role: message.role,
                }
            });
            messages.push(contents[0]);
        });

        const query_insert = `
            INSERT INTO conversations (thread_id, role, content)
            VALUES ($1, $2, $3);
        `;
        const values_insert = [threadId, 'assistant', messages];
        pool.query(query_insert, values_insert);

        res.json({ messages });
    }
}

app.get('/thread', (req, res) => {
    createThread().then(thread => {
        res.json({ threadId: thread.id });
    });
});

// app.post('/message', (req, res) => {
//     const { message, threadId } = req.body;
//     addMessage(threadId, message).then(message => {
//         runAssistant(threadId).then(run => {
//             const runId = run.id;           
            
//             pollingInterval = setInterval(() => {
//                 checkingStatus(res, threadId, runId);
//             }, 1000);
//         }).catch( ()=> {
//             res.json({ messages: 'No se permiten multiples solicitudes' });
//         });
//     });
// });

app.post('/message', async (req, res) => {
    try {
        const { message, threadId } = req.body;
        const addedMessage = await addMessage(threadId, message);
        const run = await runAssistant(threadId);

        const runId = run.id;
        pollingInterval = setInterval(() => {
            checkingStatus(res, threadId, runId).catch((error) => {
                console.error("Error checking status:", error);
                clearInterval(pollingInterval);
                res.status(500).json({ error: "Error checking status" });
            });
        }, 1000);
    } catch (error) {
        console.error("Error in /message:", error);
        res.status(500).json({ error });
    }
});

app.get('/message/:threadId', async (req, res) => {
    const { threadId } = req.params;

    const messagesList = await openai.beta.threads.messages.list(threadId);
    let messages = []

    messagesList.body.data.forEach(message => {

        const contents = message.content.map((content) => {
            return {
                ...content,
                role: message.role,
            }
        });
        messages.push(contents[0]);
    });

    res.json({ messages });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', () => {
    pool.end();
    process.exit();
});