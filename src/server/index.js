import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from "mongodb";
import Joi from 'joi';
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


app.listen(5000);