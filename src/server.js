import fs from "fs";
import express from "express";
import { db, connecToDB } from "./db.js";
import admin from "firebase-admin";

const credentials = JSON.parse(
    fs.readFileSync('./credentials.json')
);

admin.initializeApp({
    credential: admin.credential.cert(credentials),
});

const app = express();
app.use(express.json());

app.use(async(req, res, next)=>{
    const { authtoken } = req.headers;

    if (authtoken){
        try{
            req.user = await admin.auth().verifyIdToken(authtoken);
        } catch(error){
            return res.sendStatus(400);
        }
    }

    req.user = req.user || {};

    next();
});

app.get('/api/articles/:name', async(req, res)=>{
    const { name } = req.params;
    const { uid } = req.user;

    await db.collection('articles').updateOne({ name },
        { $inc: { pageViews: 1 },
    });

    const article = await db.collection('articles').findOne({ name });

    if(article){
        const upvoteIds = article.upvoteIds || [];
        article.canUpvote = uid && !upvoteIds.includes(uid);
        res.json(article);
    }
    else{
        res.sendStatus(404);
    }
    
});

app.use((req, res, next)=>{
    if (req.user) {
        next();
    } else{
        res.sendStatus(401);
    }
});

app.put('/api/articles/:name/upvote', async(req, res)=>{
    const { name } = req.params;
    const { uid } = req.user;

    const article = await db.collection('articles').findOne({ name });

    if(article){
        const upvoteIds = article.upvoteIds || [];
        const canUpvote = uid && !upvoteIds.includes(uid);
        
        if(canUpvote){
            await db.collection('articles').updateOne({ name },
                { $inc: { upvotes: 1 },
                $push: { upvoteIds: uid }
            });
        }
        const updatedArticle = await db.collection('articles').findOne({ name });
        res.json(updatedArticle);
    } else{
        res.sendStatus(404);
    }

});

app.post('/api/articles/:name/comments', async(req, res)=>{
    const { name } = req.params;
    const { postedBy, text } = req.body;
    const { email } = req.user;

    await db.collection('articles').updateOne({ name },
        { $push: { comments: { postedBy: email, text } },
    });

    const article = await db.collection('articles').findOne({ name });

    if(article){
        res.json(article);
    }
    else{
        res.sendStatus(404);
    }

});

connecToDB(()=>{
    console.log('database connected');
    app.listen(8000, ()=>{
        console.log('Listening');
    });
});

