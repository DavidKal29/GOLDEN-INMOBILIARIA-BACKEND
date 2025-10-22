const express = require('express')
const router = express.Router()
const dotenv = require('dotenv').config()
const CSRFProtection = require('../middlewares/CSRF.js')
const conectarDB = require('../mongo.js')
const {body,validationResult} = require('express-validator')
const authMiddleware = require('../middlewares/authMiddleware.js')
const {ObjectId} = require('mongodb')

router.get('/profile',authMiddleware,(req,res)=>{
    
    return res.json({user:req.user})
})

const validadorEditProfile = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email no puede estar vacío')
        .isEmail().withMessage('Debes poner un email válido')
        .isLength({ min: 6, max: 150 }).withMessage('Email demasiado corto o largo')
        .normalizeEmail()
        .customSanitizer(val => (val || '').replace(/\s+/g, ''))
        .escape(),

    body('username')
        .trim()
        .notEmpty().withMessage('Username no puede estar vacío')
        .customSanitizer(val => (val || '').replace(/\s+/g, ''))
        .isLength({ min: 5, max: 15 }).withMessage('Username debe contener entre 5 y 15 carácteres')
        .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Solo se permiten letras, números, guion bajo y punto')
        .matches(/[a-zA-Z]/).withMessage('Mínimo una letra en Username')
        .escape(),

    body('phone')
        .trim()
        .optional({ checkFalsy: true })
        .matches(/^[0-9]+$/).withMessage('El teléfono solo puede contener números')
        .isLength({ min: 7, max: 15 }).withMessage('El teléfono debe tener entre 7 y 15 dígitos')
        .customSanitizer(val => (val || '').replace(/\s+/g, ''))
        .escape(),

    body('description')
        .trim()
        .isLength({min:0, max:100}).withMessage('Máximo 100 carácteres la descripción')
        .customSanitizer(val=>val.replace(/\s+/g, ' '))
        .escape()
]
router.post('/editProfile',CSRFProtection,validadorEditProfile,authMiddleware,async(req,res)=>{
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0].msg})
        }

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

router.get('/getMyHouses',authMiddleware,async(req,res)=>{
    try {
        const db = await conectarDB()
        const users = db.collection('users')
        const houses = db.collection('houses')

        const myHouses = await houses.find({id_user:new ObjectId(req.user._id), rented:true}).toArray()

        if (myHouses.length>0) {
            return res.json({houses:myHouses.reverse()})
        }else{
            return res.json({houses:[]})
        }
        
    } catch (error) {
        console.log(error);
        
        console.log('Error en get my houses');
        
        return res.json({error:'Error al obtener los datos de las casas del usuario'}) 
    }
})



module.exports = router
