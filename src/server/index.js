import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from "mongodb";
import chalk from 'chalk';
import Joi from "joi";
// import userSchema from "../schemas/validate.js";

dotenv.config();


const app = express().use(express.json()).use(cors());

const mongoClient = new MongoClient(process.env.Mongo_URL);
let db;

const userSchema = Joi.object({
    name: Joi.string().required(),
    // to: Joi.string().min(1).required(),
});
const messageSchema = Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid('message','private_message').required()
});


mongoClient.connect().then(() => {
	db = mongoClient.db("DB_teste");
    console.log(chalk.bold.blue("Banco de dados MongoDB conectado!"));
});


app.post("/participants", async(req, res)=>{
    const name = req.body;
    const validation = userSchema.validate({...name});
    if(!validation.error){
        console.log(chalk.bold.green("name pass"));
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
            await db.collection("messages").insertOne({from:name.name, to: "Todos", text: 'entra na sala...', type: 'status', time: time.toTimeString().split(" ")[0]});
            res.sendStatus(201);
        }
    }
    catch(err){
        res.status(500).send(err);
    }
    }else{
        console.log(chalk.bold.red("name fail"));
        res.status(400).send("Nome inválido!");
    }
});


app.post("/messages", async(req, res)=>{
    const {to, text, type} = req.body;
    const from = req.header("User");
    const time = new Date();
    const validation = messageSchema.validate({from, to, text, type});
    if(!validation.error){
        console.log(chalk.bold.green("mensage pass"));
    try{
        const user = await db.collection("participants").findOne({name: from});
        if(!user){
            console.log(chalk.bold.red("Usuário não existe!"));
            res.status(422).send("Usuário não existe!");
            return;
        }
        await db.collection("messages").insertOne({from, to, text, type, time: time.toTimeString().split(" ")[0]});
        console.log(chalk.bold.green(`Mensagem enviada de ${from} para ${to}`));
        res.sendStatus(201);
    }catch(err){
        res.status(500).send(err);
    }
    }else{
        console.log(chalk.bold.red("mensage fail - " + validation.error));
        res.status(422).send();
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
    const user = req.header("User");
    const send = [];
    console.log(chalk.bold.blue(`Requisição com limite de ${limit} mensagens`));
    try{
        if(limit){
            const messages = await db.collection("messages").find({$or:[{to:"todos"},{to:"Todos"},{to: user},{from: user},{type: "message"}]}).limit(parseInt(limit)).sort({$natural:-1}).toArray();
            messages.forEach(message =>{send.unshift(message)});
            res.send(send);
        }else{
            const messages = await db.collection("messages").find({$or:[{to:"todos"},{to:"Todos"},{to: user},{from: user},{type: "message"}]}).sort({$natural:-1}).toArray();
            res.send(messages);
        }
        
    }
    catch(err){
        res.status(500).send(err);
    }
});
app.post("/status", async(req, res)=>{
    const name = req.header("user");
    try{
        const user = await db.collection("participants").findOne({name: name});
        if(!user){
            console.log(chalk.bold.red("Usuário não existe!"));
            res.status(404).send("Usuário não existe!");
            return;
        }
        await db.collection("participants").updateOne({name}, {$set:{lastStatus: Date.now()}});
        console.log(chalk.bold.green(`Status atualizado para ${name}`));
        res.sendStatus(200);
    }catch(err){
        res.status(500).send(err);
    }
});

setInterval(async()=>{
    const users = await db.collection("participants").find({}).toArray();
    users.forEach(user =>{
        if(Date.now() - user.lastStatus > 1000*10){
            db.collection("messages").insertOne({
                to: "Todos",
                from: user.name, 
                text: 'saiu da sala...', 
                type: 'status', 
                time: new Date().toTimeString().split(" ")[0]
            });
            db.collection("participants").deleteOne({name: user.name});
            console.log(chalk.bold.red(`Usuário ${user.name} saiu da sala!`));
        }
    });
}, 15000);

app.listen(5000);