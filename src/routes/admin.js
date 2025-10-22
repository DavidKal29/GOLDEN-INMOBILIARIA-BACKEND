const express = require('express')
const router = express.Router()
const dotenv = require('dotenv').config()
const CSRFProtection = require('../middlewares/CSRF.js')
const conectarDB = require('../mongo.js')
const {body,validationResult} = require('express-validator')
const authMiddleware = require('../middlewares/authMiddleware.js')
const adminMiddleware = require('../middlewares/adminMiddleware.js')
const {ObjectId} = require('mongodb')


router.get('/users',authMiddleware,adminMiddleware,async(req,res)=>{
    try {
        const db = await conectarDB()
        const users = await db.collection('users')

        const usersData = await users.find({_id:{$ne: new ObjectId(req.user._id)}}).toArray()

        console.log(usersData);
        

        if (usersData.length>0) {
            console.log('Usuarios obtenidos con éxito');
            
            return res.json({users:usersData.reverse()})
        }else{
            console.log('No se han obtenido los usuarios, la lista está vacía');
            
            return res.json({error:'No hay usuarios registrados en la web'})
        }
    
    } catch (error) {
        console.log('Error desde admin users');

        console.log(error);

        return res.json({error:'Error al intentar obtener los usuarios de la web'})
        
    }
})

router.get('/admin/houses/:category/:rented',authMiddleware,adminMiddleware,async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const category = req.params.category

        const rented = req.params.rented === 'true'//Para que si es true, sea true, y sino false

        console.log('category:', category, 'rented:', rented, typeof rented);

        const houses = await housesCollection.find({category:`${category}`, rented:rented}).toArray()

        console.log(houses);
        

        if (houses.length>0) {
            console.log('Casas obtenidas con exito');

            return res.json({houses:houses.reverse()})
            
        }else{
            console.log('No se han obtenido las casas');

            return res.json({error:'No hay inmuebles con esas características'})
            
        }

    } catch (error) {
        console.log('Error al obtener las casas');

        return res.json({error:'Error al obtener las casas'})
        
    }
})

router.get('/admin/users/:id',authMiddleware,adminMiddleware,async(req,res)=>{
    try {
        db = await conectarDB()
        users = await db.collection("users")
        housesCollection = await db.collection("houses")

        const id = req.params.id

        console.log(id);
        

        const user = await users.findOne({_id: new ObjectId(id)})

        if (user) {
            console.log('Usuario obtenido');
            
            const houses = await housesCollection.find({id_user: new ObjectId(id)}).toArray()

            console.log('Casas obtenidas del usuario');

            return res.json({userData:{user: user, houses: houses.reverse()}})
            
        }else{
            console.log('El usuario no existe');

            return res.json({error:'El usuario que intentas ver no existe'})
            
        }      

    } catch (error) {
        console.log('Error al obtener los datos del usuario');
        console.log(error);
        

        return res.json({error:'Usuario inválido o inexistente'})
        
    }
})

router.get('/admin/delete_user/:id',authMiddleware,adminMiddleware,async(req,res)=>{
    try {
        db = await conectarDB()
        users = await db.collection("users")
        housesCollection = await db.collection("houses")

        const id = req.params.id

        const user = await users.findOne({_id: new ObjectId(id)})

        if (user) {
            console.log('Usuario obtenido');
            
            await users.deleteOne({_id: new ObjectId(id)})

            console.log('Usuario borrado con éxito');

            await housesCollection.updateMany({id_user: new ObjectId(id)},{$set:{id_user:'', rented:false}})

            console.log('Inmuebles del usuario borrados con exito');
            
            return res.json({success:'Usuario borrado con éxito'})
            
        }else{
            console.log('El usuario no existe');

            return res.json({error:'El usuario que intentas borrar no existe'})
            
        }      

    } catch (error) {
        console.log('Error al borrar al usuario');
        
        console.log(error);
        
        return res.json({error:'Error al borrar al usuario'})
        
    }
})

router.get('/admin/house/:id',authMiddleware,adminMiddleware,async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const id = req.params.id

        console.log('El id de la casa:',id);
        

        const house = await housesCollection.findOne({_id:new ObjectId(id)})

        console.log(house);
        

        if (house) {
            console.log('Casa obtenida con exito');

            return res.json({house:house})
            
        }else{
            console.log('No se ha obtenido la casa');

            return res.json({error:'No se ha obtenido la casa'})
            
        }

    } catch (error) {
        console.log('Error al obtener la casa');
        console.log(error);
        

        return res.json({error:'Error al obtener la casa'})
        
    }
})

const HouseValidator = [
    body('address')
        .trim()
        .notEmpty()
        .withMessage('La dirección no puede estar vacía'),
    body('bedrooms')
        .isInt({ min: 0 })
        .withMessage('El número de habitaciones debe ser un número entero mayor o igual a 0'),
    body('bathrooms')
        .isInt({ min: 0 })
        .withMessage('El número de baños debe ser un número entero mayor o igual a 0'),
    body('area_m2')
        .isFloat({ min: 0 })
        .withMessage('El área debe ser un número mayor o igual a 0'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número mayor o igual a 0'),
    body('image')
        .trim()
        .notEmpty()
        .withMessage('El enlace de la imagen no puede estar vacío'),
    body('category')
        .isIn(['house', 'castle', 'industrial'])
        .withMessage('La categoría debe ser house, castle o industrial')
]

router.post('/admin/house/:id',authMiddleware,adminMiddleware,HouseValidator,async(req,res)=>{
    try {
        
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0].msg})
        }

        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const id = req.params.id

        const {address,bedrooms,bathrooms,area_m2,price,image,category} = req.body

        console.log('El id de la casa:',id);
        
        await housesCollection.updateOne(
            {_id: new ObjectId(id)},
            {
                $set:{
                    address:address,
                    bedrooms:bedrooms,
                    bathrooms:bathrooms,
                    area_m2:area_m2,
                    price:price,
                    image:image,
                    category:category
                }
            },
            {upsert:true} //Para reutilizar el método en crear inmueble
        ) 
        

        return res.json({success:'Datos insertados con éxito'})

    } catch (error) {
        console.log('Error al editar la casa');
        console.log(error);   

        return res.json({error:'Error al insertar los datos del inmueble'})
        
    }
})

router.post('/admin/add_house',authMiddleware,adminMiddleware,HouseValidator,async(req,res)=>{
    try {
        
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({error:errors.array()[0].msg})
        }

        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const {address,bedrooms,bathrooms,area_m2,price,image,category} = req.body

        await housesCollection.insertOne(
            {
                address:address,
                bedrooms:bedrooms,
                bathrooms:bathrooms,
                area_m2:area_m2,
                price:price,
                image:image,
                category:category,
                rented:false
            }    
        ) 

        return res.json({success:'Datos insertados con éxito'})

    } catch (error) {
        console.log('Error al crear la casa');
        
        console.log(error);   

        return res.json({error:'Error al insertar los datos del inmueble'})
        
    }
})


router.get('/admin/reset_house/:id',authMiddleware,adminMiddleware,async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const id = req.params.id

        console.log('El id de la casa:',id);
        
        const house = await housesCollection.findOne({_id:new ObjectId(id)})

        console.log(house);
        

        if (house) {
            console.log('Casa obtenida con exito');

            await housesCollection.updateOne({_id:new ObjectId(id)},{$set:{id_user:'',rented:false}})

            return res.json({success:'Inmueble vuelve a estar disponible para la compra'})
            
        }else{
            console.log('No se ha obtenido la casa');

            return res.json({error:'No se ha obtenido la casa'})
            
        }

    } catch (error) {
        console.log('Error al resetear la casa');
        console.log(error);
        

        return res.json({error:'Error al resetear la casa'})
        
    }
})

router.get('/admin/delete_house/:id',authMiddleware,adminMiddleware,async(req,res)=>{
    try {
        db = await conectarDB()
        housesCollection = await db.collection("houses")

        const id = req.params.id

        const house = await housesCollection.findOne({_id: new ObjectId(id)})

        if (house) {
            console.log('Inmueble obtenido');
            
            await housesCollection.deleteOne({_id: new ObjectId(id)})

            console.log('Inmueble borrado con éxito');
            
            return res.json({success:'Inmueble borrado con éxito'})
            
        }else{
            console.log('El inmueble no existe');

            return res.json({error:'El inmueble que intentas borrar no existe'})
            
        }      

    } catch (error) {
        console.log('Error al borrar el inmueble');
        
        console.log(error);
        
        return res.json({error:'Error al borrar el inmueble'})
        
    }
})


module.exports = router