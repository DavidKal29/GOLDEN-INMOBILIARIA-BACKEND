const dotenv = require('dotenv').config()

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_URI

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

const conectarDB = async () => {
  try {

    //Vemos si la conexión sigue activa
    if (db) {
        console.log('Reutilizamos la conexión de la base de datos');
        return db
    }

    //Conectamos con el cliente
    await client.connect();
    
    //Obtenemos la base de datos que por defecto es la que está en la MONGO_URI
    db = client.db()

    //Avisamos que la base de datos ha sido obtenida
    console.log('Obtenemos de 0 la conexión a la base de datos');

    //Devolvemos la conexion
    return db

  } catch (error) {
    //Informamos del error
    console.log('Error al intentar conectar con la DB');
    console.log(error);
    
  }
}


module.exports = conectarDB

