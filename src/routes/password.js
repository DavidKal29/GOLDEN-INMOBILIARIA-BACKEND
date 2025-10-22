const express = require('express')
const router = express.Router()
const dotenv = require('dotenv').config()
const CSRFProtection = require('../middlewares/CSRF.js')
const conectarDB = require('../mongo.js')
const {body,validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET


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
router.post('/forgotPassword',validadorRecuperarPassword,CSRFProtection, async(req, res) => {
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
router.post('/changePassword/:token',validadorChangePassword,async(req,res)=>{
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

module.exports = router