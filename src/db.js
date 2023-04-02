import { MongoClient } from "mongodb";

let db;

async function connecToDB(cb){
        //Connect to mongo db
        const client = new MongoClient('mongodb://127.0.0.1:27017');
        await client.connect();
    
        db = client.db('basic-app-db');

        cb();
}

export {
    db,
    connecToDB,
}