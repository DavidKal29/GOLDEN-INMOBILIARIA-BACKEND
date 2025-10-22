const express = require('express')
const router = express.Router()
const dotenv = require('dotenv').config()
const CSRFProtection = require('../middlewares/CSRF.js')
const conectarDB = require('../mongo.js')
const {body,validationResult} = require('express-validator')
const authMiddleware = require('../middlewares/authMiddleware.js')
const {ObjectId} = require('mongodb')

router.get('/houses/:category',async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const category = req.params.category

        const houses = await housesCollection.find({category:`${category}`, rented:false}).toArray()
        

        if (houses.length>0) {
            console.log('Casas obtenidas con exito');

            return res.json({houses:houses.reverse()})
            
        }else{
            console.log('No se han obtenido las casas');

            return res.json({error:'No se han obtenido las casas'})
            
        }

    } catch (error) {
        console.log('Error al obtener las casas');

        return res.json({error:'Error al obtener las casas'})
        
    }
})

router.get('/house/:id',authMiddleware,async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const id = req.params.id

        console.log('El id de la casa:',id);
        

        const house = await housesCollection.findOne({_id:new ObjectId(id), rented:false})

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



const paymentValidator = [
  body('nombre_titular')
    .trim()
    .notEmpty().withMessage('El nombre del titular no puede estar vacío')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[A-Za-zÀ-ÖØ-öø-ÿ'´`-\s]+$/).withMessage('El nombre contiene caracteres no permitidos')
    .customSanitizer(val => (val || '').replace(/\s+/g, ' ').trim())
    .escape(),

  body('numero_tarjeta')
    .trim()
    .notEmpty().withMessage('El número de tarjeta no puede estar vacío')
    .customSanitizer(val => (val || '').replace(/\s+/g, ''))
    .matches(/^[0-9]{13,19}$/).withMessage('El número de tarjeta debe contener entre 13 y 19 dígitos'),

  
  body('cvv')
    .trim()
    .notEmpty().withMessage('El CVV no puede estar vacío')
    .matches(/^[0-9]{3,4}$/).withMessage('El CVV debe tener 3 o 4 dígitos')
    .customSanitizer(val => (val || '').replace(/\s+/g, '')),

  body('mes')
    .trim()
    .notEmpty().withMessage('El mes de expiración no puede estar vacío')
    .isInt({ min: 1, max: 12 }).withMessage('El mes debe ser un número entre 1 y 12')
    .toInt(),

  body('year')
    .trim()
    .notEmpty().withMessage('El año de expiración no puede estar vacío')
    .isInt({ min: 1000 }).withMessage('Año inválido')
    .customSanitizer(v => parseInt(v, 10))
    .custom((year, { req }) => {
      const month = Number(req.body.mes);
      const yr = Number(year);

      if (Number.isNaN(month) || Number.isNaN(yr)) {
        throw new Error('Mes o año inválido')
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1

      // Si el año es menor que el actual, expirada
      if (yr < currentYear) {
        throw new Error('La tarjeta está expirada');
      }

      // Si mismo año pero mes menor, expirada
      if (yr === currentYear && month < currentMonth) {
        throw new Error('La tarjeta está expirada');
      }

      // Maximo tarjetas de 10 años 
      if (yr > currentYear + 10) {
        throw new Error('Año de expiración poco realista');
      }

      return true;
    })
]


router.post('/buyHouse/:id',CSRFProtection,authMiddleware,paymentValidator,async(req,res)=>{
    try {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0].msg})
        }

        const db = await conectarDB()
        const houses = db.collection('houses')
        const users = db.collection('users')

        const id = req.params.id

        const house_rented = await houses.findOne({_id:new ObjectId(id), rented: true})

        console.log(house_rented);
        

        if (house_rented) {
            console.log('La casa ya no está disponible');
            
            return res.json({error:'La casa que intentas comprar ya no está a la venta'})
        }else{
            console.log('La casa sigue disponible');

            await houses.updateOne({_id: new ObjectId(id)},{$set:{rented:true, id_user: new ObjectId(req.user._id)}})

            console.log('La casa ha sido añadida a la lista de compras del usuario');

            console.log('La casa ya no está a la venta');

            return res.json({success:'Casa comprada con éxito'})  
            
        }

    } catch (error) {
        console.log(error);
        console.log('Error en la ruta de buyHouse');
        return res.json({error:'Error al intentar comprar la casa'})
           
    }
})


module.exports = router