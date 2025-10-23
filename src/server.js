//Librerias requeridas
const express = require('express')
const cookieParser = require('cookie-parser')
const conectarDB = require('./mongo.js')
const cors = require('cors')

//Inicialización de la app
const app = express()

//Configuración de la app
app.use(express.json())

app.use(express.urlencoded({extended:true}))

app.use(cookieParser())

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials:true
}))

//CSRF Middleware
const CSRFProtection = require('./middlewares/CSRF.js')

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

//Ruta para obtener el CSRF Token
app.get('/csrf-token',CSRFProtection,(req,res)=>{
    return res.json({csrfToken: req.csrfToken()})
})

//Ponemos a escuchar el servidor
app.listen(3000,()=>{
    console.log('Escuchando en el puerto 3000');
})