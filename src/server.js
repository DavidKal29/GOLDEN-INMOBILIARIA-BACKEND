const express = require('express')
const cookieParser = require('cookie-parser')
const conectarDB = require('./mongo.js')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const dotenv = require('dotenv').config()

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials:true
}))

app.post('/register',async(req,res)=>{
    try {
        const db = await conectarDB()
        const users = db.collection('users')
        const {email,username,password} = req.body

        const user_exists = await users.findOne({$or:[{email:email},{username:username}]})

        if (user_exists) {
            console.log('Email o username ya están en uso');
            return res.json({error:'Email o username ya están en uso'})
        }else{
            console.log('El usuario no existe, seguimos con el proceso de registro');

            const encripted_password = await bcrypt.hash(password,10)

            await users.insertOne({email:email, username:username, password:encripted_password})

            console.log('Usuario metido con éxito en la base de datos');

            return res.json({success:'Usuario registrado con éxito'})
               
        }

        
    } catch (error) {
        console.log('Error en la ruta de register');
        console.log(error);
        return res.json({error:'Error al registrar usuario'})
    }
})




app.listen(3000,()=>{
    console.log('Escuchando en el puerto 3000');
    
})