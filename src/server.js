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
const {body,validationResult} = require('express-validator')
const {brevo, apiInstance} = require('./brevo.js')

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

            req.user = userData

            next()
            
        }

    } catch (error) {
        console.log('Error en el authmiddleware');
        
        console.log(error);
        
        return res.status(401).json({error:'Error de autenticación'})
    }

}

const adminMiddleware = (req,res,next)=>{
    try {
        if (req.user.rol === 'admin') {
            next()
        }else{
            return res.status(401).json({error:'Solo los administradores pueden visitar este espacio'})
        }
    } catch (error) {
        console.log('Error en el adminmiddleware');
        
        console.log(error);
        
        return res.status(401).json({error:'Error de autenticación'})
    }
}




//Validador de los inputs del register
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
app.post('/register',CSRFProtection,validadorRegister,async(req,res)=>{
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
app.post('/editProfile',CSRFProtection,validadorEditProfile,authMiddleware,async(req,res)=>{
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

app.get('/houses/:category',async(req,res)=>{
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

app.get('/house/:id',authMiddleware,async(req,res)=>{
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


app.post('/buyHouse/:id',CSRFProtection,authMiddleware,paymentValidator,async(req,res)=>{
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


app.get('/getMyHouses',authMiddleware,async(req,res)=>{
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


//Validador del email de recuperación de contraseña
const validadorRecuperarPassword = [
        body('email')
        .trim()
        .notEmpty().withMessage('Email no puede estar vacío')
        .isEmail().withMessage('Debes poner un email válido')
        .normalizeEmail()
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape()
]

// Ruta para enviar correo de recuperación
app.post('/forgotPassword',validadorRecuperarPassword,CSRFProtection, async(req, res) => {
    try {
        const errors = validationResult(req)
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg })
        }

        const db = await conectarDB()
        const users = db.collection('users')

        const { email } = req.body
        const user_exists = await users.findOne({email:email}) 

        if (user_exists) {
            const token = jwt.sign({ email: email }, JWT_SECRET)

            await users.updateOne({email: email},{$set:{token:token}})

            const sendSmtpEmail = {
                sender: { name: "Golden-Key", email: process.env.CORREO },
                to: [{ email }],
                subject: "Recuperar Contraseña",
                textContent: `Para recuperar la contraseña entra en este enlace -> ${process.env.FRONTEND_URL}/changePassword/${token}`,
                htmlContent: `<p>Para recuperar la contraseña, entra a -> <a href="${process.env.FRONTEND_URL}/changePassword/${token}">Recuperar Contraseña</a></p>`
            };

            await apiInstance.sendTransacEmail(sendSmtpEmail)

            return res.json({success:'Correo enviado con éxito'})

        } else {
            return res.json({ error: "No hay ninguna cuenta asociada a este correo" })
        }

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Error al enviar el email" })
    }
})



//Validador de cambio de contraseña
const validadorChangePassword = [
        
        body('new_password')
        .trim()
        .notEmpty().withMessage('Password no puede estar vacío')
        .matches(/\d/).withMessage('Mínimo un dígito')
        .isLength({min:8,max:30}).withMessage('Password debe contener entre 8 y 30 carácteres')
        .matches(/[A-Z]/).withMessage('Mínimo una mayúscula en Password')
        .matches(/[#$€&%]/).withMessage('Mínimo un carácter especial en Password')
        .customSanitizer(val=>(val || '').replace(/\s+/g,''))
        .escape()
        
]

//Ruta para cambiar contraseña
app.post('/changePassword/:token',validadorChangePassword,async(req,res)=>{
    try{
        const errors = validationResult(req)

        const db = await conectarDB()
        const users = db.collection('users')

        const token = req.params.token

        const decoded = jwt.verify(token,JWT_SECRET)
        const email = decoded.email

        const userData = await users.findOne({email:email, token:token})
        
        if (userData) {
            const {new_password,confirm_password} = req.body
            
            if (new_password===confirm_password) {
                
                
                const password_equals = await bcrypt.compare(new_password,userData.password)
                    
                if (password_equals) {
                    res.json({error:"La nueva contraseña no puede ser igual a la anterior"})
                }else{
                    if (!errors.isEmpty()) {
                        return res.status(400).json({ error: errors.array()[0].msg })
                    }
                        
                    const new_encripted_password = await bcrypt.hash(new_password,10)

                    await users.updateOne({email:email},{$set:{password:new_encripted_password}})

                    await users.updateOne({email:email},{$set:{token:''}})
                        
                    res.json({success:"Contraseña cambiada con éxito"})
                }
            }else{
                
                res.json({error:"Contraseñas no coinciden"})
            }
        }else{
            res.json({error:"Token inválido o expirado"})
        }
    }catch(error){
        console.log(error);
        
        res.json({error:"Token inválido o erroneo"})
    }
})


app.get('/users',authMiddleware,adminMiddleware,async(req,res)=>{
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

app.get('/admin/houses/:category/:rented',authMiddleware,adminMiddleware,async(req,res)=>{
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

app.get('/admin/users/:id',authMiddleware,adminMiddleware,async(req,res)=>{
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

app.get('/admin/delete_user/:id',authMiddleware,adminMiddleware,async(req,res)=>{
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

app.get('/admin/house/:id',authMiddleware,adminMiddleware,async(req,res)=>{
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

app.post('/admin/house/:id',authMiddleware,adminMiddleware,HouseValidator,async(req,res)=>{
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

app.post('/admin/add_house',authMiddleware,adminMiddleware,HouseValidator,async(req,res)=>{
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


app.get('/admin/reset_house/:id',authMiddleware,adminMiddleware,async(req,res)=>{
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







app.listen(3000,()=>{
    console.log('Escuchando en el puerto 3000');
    
})