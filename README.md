# GOLDEN-KEY-INMOBILIARIA BACKEND

Esta es una **API/backend** para una web inmobiliaria en línea llamada **Golden Key Inmobiliaria**, especializada en ofrecer inmuebles de carácter abandonado, para poder ser compradas y adquiridas por los usuarios, dando un gran catálogo de inmuebles.

---

### Funcionalidades para la API:

- **Autenticación completa**: registro, login y recuperación de contraseña mediante JWT.
- **Gestión de usuarios**: crear y editar cuentas de usuario.
- **Gestión de Inmuebles**: Gran catálogo de inmuebles, con la posibilidad de filtrar y comprar, apareciendo en el perfil los comprados.
- **Protección de rutas** mediante **JWT**, asegurando que solo usuarios autorizados puedan acceder a ciertas operaciones.
- **CORS habilitado**, preparado para trabajar con frontend externo.
- **Envío de emails automáticos** para confirmaciones, notificaciones o recuperación de contraseña. Utilizando el servicio de Brevo(paquete indicado abajo).
- **Validación de datos** con `express-validator` para garantizar integridad y seguridad.
- **Middleware de seguridad** con `csurf` y `cookie-parser`.
- **Administración** con roles de usuario, donde el administrador puede ver todos los usuarios, inmuebles y editarlos.

---

### Requisitos

Para ejecutar este proyecto necesitas:

- **Node.js >= 18.x**
- **MySQL** (local o en la nube, en este caso Clever Cloud)
- Paquetes de Node.js incluidos en `package.json`:
  - `express`
  - `cors`
  - `dotenv`
  - `mongodb`
  - `jsonwebtoken`
  - `bcryptjs`
  - `cookie-parser`
  - `csurf`
  - `express-validator`
  - `nodemon`
  - `cross-env`
  - `@getbrevo/brevo`

---

### Instalación

1. **Clona el repositorio**  
   ```bash
   git clone https://github.com/DavidKal29/GOLDEN-INMOBILIARIA-BACKEND.git
   cd GOLDEN-INMOBILIARIA-BACKEND

2. **Instala las dependencias**  
   ```bash
    npm install

3. **Crea un .env en la raíz del proyecto y añade tus propios datos**
   ```bash
    MONGO_URI= (Uri de Mongo Atlas)
    FRONTEND_URL=
    JWT_SECRET=
    APIKEY= (Asegurate de tener cuenta en Brevo y tener la apikey válida)
    CORREO=


4. **Modo Desarrollo**
   ```bash
    npm run dev

5. **Modo Producción**
   ```bash
    npm start
 
