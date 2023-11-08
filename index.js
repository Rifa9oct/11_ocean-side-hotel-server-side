const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin:[
    "http://localhost:5173",
    "https://ocean-side-hotel.web.app",
    "https://ocean-side-hotel.firebaseapp.com"
  ],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());

const logger = (req,res,next)=>{
  console.log("log info: ",req.method, req.url);
  next();
}

const verifyToken = (req, res , next) =>{
  const token = req?.cookies?.token;
  console.log("token in the middleware: ", token);
  if(!token){
    return res.status(401).send({message: "unauthorized access"});
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err, decoded)=>{
    if(err){
      return res.status(401).send({message: "unauthorized access"});
    }
    req.user = decoded;
    next();
  })
}


//mongo db
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6vyreuj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const roomsCollection = client.db('hotelDB').collection('rooms');
    const bookingsCollection = client.db('hotelDB').collection('bookings');
    const reviewsCollection = client.db('hotelDB').collection('reviews');

    app.get('/rooms',async (req, res) => {
      // console.log("cookies", req.cookies)
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.findOne(query);
      res.send(result);
    })

    app.get('/reviews',async (req, res) => {
      const cursor = reviewsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking)
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    })

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      console.log(review)
      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    })

    app.get("/bookings", logger ,verifyToken, async (req, res) => {
      console.log("token owner info",req.user);
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: "forbidden access"});
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingsCollection.findOne(query);
      res.send(result);
    })

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    })

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const booking = req.body;
      console.log(booking)
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updatedbooking = {
        $set: {
          checkInDate: booking.checkIndate,
          checkOutDate: booking.checkOutdate,
          totalPrice: booking.totalPrice
        }
      }
      const result = await bookingsCollection.updateOne(filter, updatedbooking, options);
      res.send(result);
    })

    //auth related api
    app.post('/jwt', async(req,res)=>{
      const user = req.body;
      console.log("user for token ",user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:"1h"})
      res.cookie('token', token,{
        httpOnly:true,
        secure:true,
        sameSite:'none'
      })
      res.send({success: true});
    })

    app.post('/logout', async(req,res)=>{
      const user = req.body;
      res.clearCookie('token', {maxAge: 0}).send({success:true})
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send("OCEAN SIDE HOTEL SERVER IS RUNNING....")
})

app.listen(port, () => {
  console.log(`ocean side hotel server is running, ${port}`)
})