const express = require('express')
const cookieParser = require('cookie-parser')

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())




app.listen(3000,()=>{
    console.log('Escuchando en el puerto 3000');
    
})