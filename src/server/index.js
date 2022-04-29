import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from "mongodb";
import chalk from 'chalk';

dotenv.config();


const app = express().use(express.json()).use(cors());

const mongoClient = new MongoClient(process.env.Mongo_URL);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("DB_teste");
    console.log(chalk.bold.blue("Banco de dados MongoDB conectado!"));
});


app.post("/participants", async(req, res)=>{
    const name = req.body;
    try{
        const users = await db.collection("participants").find({}).toArray();
        if(users.find(user =>{
            return user.name === name.name;
        }))
        {
            console.log(chalk.bold.red("Usuário já existe!"));
            res.status(409).send("Participante já cadastrado!");
        }
        else{
            await db.collection("participants").insertOne({...name, lastStatus: Date.now()});
            console.log(chalk.bold.green(`Usuário: ${name.name} cadastrado com sucesso!`));
            let time = new Date();
            await db.collection("messages").insertOne({from:name.name, to: "todos", text: 'entra na sala...', type: 'status', time: time.toTimeString().split(" ")[0]});
            res.sendStatus(201);
        }
    }
    catch(err){
        res.status(500).send(err);
    }
});


app.post("/messages", async(req, res)=>{
    const {to, text, type} = req.body;
    const from = req.header("from");
    const time = new Date();
    try{
        await db.collection("messages").insertOne({from, to, text, type, time: time.toTimeString().split(" ")[0]});
        console.log(chalk.bold.green(`Mensagem enviada para ${to}`));
        res.sendStatus(201);
    }catch(err){
        res.status(500).send(err);
    }
});


app.get("/participants", async(req, res)=>{
    try{
        const users = await db.collection("participants").find({}).toArray();
        res.send(users);
    }
    catch(err){
        res.status(500).send(err);
    }
});


app.get("/messages", async(req, res)=>{
    const limit = req.query.limit;
    console.log(chalk.bold.blue(`Limite de ${limit}`));
    try{
        if(limit){
            const messages = await db.collection("messages").find({}).limit(parseInt(limit)).sort({$natural:-1}).toArray();
            res.send(messages);
        }else{
            const messages = await db.collection("messages").find({}).sort({$natural:-1}).toArray();
            res.send(messages);
        }
        
    }
    catch(err){
        res.status(500).send(err);
    }
});


app.listen(5000);