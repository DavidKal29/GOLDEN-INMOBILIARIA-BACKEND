const jwt = require('jsonwebtoken')
const dotenv = require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET
const conectarDB = require('../mongo.js')
const {ObjectId} = require('mongodb')

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

module.exports = authMiddleware