const express = require('express')
const router = express.Router()
const dotenv = require('dotenv').config()
const CSRFProtection = require('../middlewares/CSRF.js')
const conectarDB = require('../mongo.js')
const bcrypt = require('bcryptjs')
const {body,validationResult} = require('express-validator')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET
const cookieOptions = require('../cookieOptions.js')
const authMiddleware = require('../middlewares/authMiddleware.js')


const validadorRegister = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email no puede estar vacío')
        .isLength({ min: 6, max: 150 }).withMessage('Email demasiado corto o largo')
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape(),

    body('username')
        .trim()
        .notEmpty().withMessage('Username no puede estar vacío')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .isLength({min:5,max:15}).withMessage('Username debe contener entre 5 y 15 carácteres')
        .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Solo se permiten letras, números, guion bajo y punto')
        .matches(/[a-zA-Z]/).withMessage('Mínimo una letra en Username')
        .escape(),

    body('password')
        .trim()
        .notEmpty().withMessage('Password no puede estar vacío')
        .matches(/\d/).withMessage('Mínimo un dígito')
        .isLength({min:8,max:30}).withMessage('Password debe contener entre 8 y 30 carácteres')
        .matches(/[A-Z]/).withMessage('Mínimo una mayúscula en Password')
        .matches(/[#$€&%]/).withMessage('Mínimo un carácter especial en Password')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape()
        
]
router.post('/register',CSRFProtection,validadorRegister,async(req,res)=>{
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0].msg})
        }

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

router.post('/login',CSRFProtection,async(req,res)=>{
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


router.get('/logout',authMiddleware,(req,res)=>{
    try {
        res.clearCookie('token',cookieOptions)
        return res.json({success:'Sesión cerrada con éxito'})
    } catch (error) {
        return res.json({error:'Error al cerrar sesión'})
    }

})

module.exports = router