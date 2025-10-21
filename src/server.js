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
const csruf = require('csurf')

console.log(cookieOptions);


const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials:true
}))

const CSRFProtection = csruf({cookie:{cookieOptions}})

app.get('/csrf-token',CSRFProtection,(req,res)=>{
    return res.json({csrfToken: req.csrfToken()})
})

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


app.post('/register',CSRFProtection,async(req,res)=>{
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

app.post('/login',CSRFProtection,async(req,res)=>{
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

app.get('/logout',authMiddleware,(req,res)=>{
    try {
        res.clearCookie('token',cookieOptions)
        return res.json({success:'Sesión cerrada con éxito'})
    } catch (error) {
        return res.json({error:'Error al cerrar sesión'})
    }

})


app.post('/editProfile',CSRFProtection,authMiddleware,async(req,res)=>{
    try {
        const db = await conectarDB()
        const users = db.collection('users')
        const {email,username,phone,description} = req.body

        if (email===req.user.email && username===req.user.username && phone===req.user.phone && description === req.user.description) {
            console.log('Mínimo un campo debe ser distitno');
            
            return res.json({error:'Mínimo un campo debe ser distinto'})
        }
        
        const user_exists = await users.find(
            {
                _id:{$ne:new ObjectId(req.user._id)},
                $or:[{email:email},{username:username}]
                
            }
        ).toArray()

        if (user_exists.length>0) {
            console.log('Email o username ya están en uso');
            console.log(user_exists);
            
            return res.json({error:'Email o username ya están en uso'})
        }else{
            console.log('Datos nuevos inexistentes');

            await users.updateOne({_id:req.user._id},{$set:{email:email,username:username,phone:phone,description:description}})

            return res.json({success:'Datos editados con éxito'})
               
        }

        
    } catch (error) {
        console.log('Error en la ruta de editar perfil');
        console.log(error);
        return res.json({error:'Error al editar perfil'})
    }
})

app.get('/houses/:category',async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const category = req.params.category

        const houses = await housesCollection.find({category:`${category}`}).toArray()

        console.log(houses);
        

        if (houses.length>0) {
            console.log('Casas obtenidas con exito');

            return res.json({houses:houses})
            
        }else{
            console.log('No se han obtenido las casas');

            return res.json({error:'No se han obtenido las casas'})
            
        }

    } catch (error) {
        console.log('Error al obtener las casas');

        return res.json({error:'Error al obtener las casas'})
        
    }
})

app.get('/house/:id',async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const id = req.params.id

        const house = await housesCollection.findOne({_id:new ObjectId(id)})

        console.log(house);
        

        if (house) {
            console.log('Casa obtenida con exito');

            return res.json({house:house})
            
        }else{
            console.log('No se ha obtenido la casa');

            return res.json({error:'No se ha obtenido las casa'})
            
        }

    } catch (error) {
        console.log('Error al obtener la casa');
        console.log(error);
        

        return res.json({error:'Error al obtener la casa'})
        
    }
})




app.listen(3000,()=>{
    console.log('Escuchando en el puerto 3000');
    
})