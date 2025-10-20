const express = require('express')
const cookieParser = require('cookie-parser')
const conectarDB = require('./mongo.js')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const dotenv = require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieOptions = require('./cookieOptions.js')
const JWT_SECRET = process.env.JWT_SECRET
const {ObjectId} = require('mongodb')

console.log(cookieOptions);


const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials:true
}))


const authMiddleware = async(req,res,next)=>{
    try {
        const token = req.cookies.token

        if (!token) {
            console.log('No se ha enviado el token');
            
            return res.status(401).json({error:'Error de autenticación'})
        }else{
            console.log('EL token ha llegado correactamente');
            
            const payload = jwt.verify(token,JWT_SECRET)

            const id = payload.id

            const db = await conectarDB()
            const users = db.collection('users')

            const userData = await users.findOne({_id:new ObjectId(id)})

            delete userData.password

            console.log('EL usuario desde el middleware:',userData);

            req.user = userData

            next()
            
        }

    } catch (error) {
        console.log('Error en el authmiddleware');
        
        console.log(error);
        
        return res.status(401).json({error:'Error de autenticación'})
    }

}


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

            const fechaActual = new Date().toLocaleDateString('es-ES')

            console.log(fechaActual);
            
            const userData = {
                email:email, 
                username:username, 
                rol:'client', 
                fecha_Registro:fechaActual, 
                password:encripted_password
            }

            await users.insertOne(userData)

            const user_exists = await users.findOne({email:email})
            
            const token = jwt.sign({id:user_exists._id.toString()},JWT_SECRET)

            res.cookie('token',token,cookieOptions)

            return res.json({success:'Usuario registrado con éxito'})
               
        }

        
    } catch (error) {
        console.log('Error en la ruta de register');
        console.log(error);
        return res.json({error:'Error al registrar usuario'})
    }
})

app.post('/login',async(req,res)=>{
    try {
        const db = await conectarDB()
        const users = db.collection('users')
        const {email,password} = req.body

        const user_exists = await users.findOne({email:email})
        
        if (user_exists) {
            console.log('Email o username ya están en uso')

            const check = await bcrypt.compare(password,user_exists.password)

            if (check) {
                console.log('La contraseña es correcta');
                
                const token = jwt.sign({id:user_exists._id.toString()},JWT_SECRET)

                res.cookie('token',token,cookieOptions)
                
                return res.json({success:'Usuario logueado con éxito'})
            }else{
                console.log('La contraseña es incorrecta');
                return res.json({error:'La contraseña es incorrecta'})
            }
            
        }else{
            console.log('No hay ninguna cuenta asociada a ese email');
            return res.json({error:'No hay ninguna cuenta asociada a ese email'})
               
        }

        
    } catch (error) {
        console.log('Error en la ruta de login');
        console.log(error);
        return res.json({error:'Error al loguear usuario'})
    }
})


app.get('/profile',authMiddleware,(req,res)=>{
    console.log('El usuario desde el perfil:',req.user);
    
    return res.json({user:req.user})
})




app.listen(3000,()=>{
    console.log('Escuchando en el puerto 3000');
    
})