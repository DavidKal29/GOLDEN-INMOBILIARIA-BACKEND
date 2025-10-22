//Librerias requeridas
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
const {body,validationResult} = require('express-validator')
const {brevo, apiInstance} = require('./brevo.js')

const app = express()

//Configuración de la app
app.use(express.json())

app.use(express.urlencoded({extended:true}))

app.use(cookieParser())

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials:true
}))

//Middlewares
const CSRFProtection = require('./middlewares/CSRF.js')
const authMiddleware = require('./middlewares/authMiddleware.js')
const adminMiddleware = require('./middlewares/adminMiddleware.js')


//Routes
const authRoutes = require('./routes/auth.js')
app.use('/',authRoutes)

const profileRoutes = require('./routes/profile.js')
app.use('/',profileRoutes)

const housesRoutes = require('./routes/houses.js')
app.use('/',housesRoutes)

const passwordRoutes = require('./routes/password.js')
app.use('/',passwordRoutes)

const adminRoutes = require('./routes/admin.js')
app.use('/',adminRoutes)

app.get('/csrf-token',CSRFProtection,(req,res)=>{
    return res.json({csrfToken: req.csrfToken()})
})

//Ponemos a escuchar el servidor
app.listen(3000,()=>{
    console.log('Escuchando en el puerto 3000');
})