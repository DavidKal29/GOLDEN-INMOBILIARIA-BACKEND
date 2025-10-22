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

module.exports = adminMiddleware