require('dotenv').config();
const express = require('express')
const app = express();

app.use(express.json())

const cors = require('cors')
app.use(cors())

//json web token
const jwt= require('jsonwebtoken')


//multer setup
const multer = require('multer')

const storage= multer.diskStorage({
    destination:function(req, file, cb){
        cb(null, "uploads/")
    },
    filename: function(req, file, cb){
        const uniqueSuffix=  Date.now() +"-" + Math.round(Math.random()* 1e9)
        cb(null, file.filename+ "-" + uniqueSuffix + (".")+ file.originalname.split(".").pop())
    }
})

const upload= multer({storage: storage, limits: {fileSize: 1024 *1024 *2}})

const mongoose= require('mongoose')
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(process.env.PORT, ()=>{
    console.log(`server is ruunning on port ${process.env.PORT}`)
})
  })
  .catch((err) => {
    console.log("MongoDB Error:", err);
  });



// categories   Schema

let catagoriesSchema = new mongoose.Schema({
    name: {type: String, required: true}
})
let productSchema = new mongoose.Schema({
    title: {type: String, required: true},
    price: { type: Number},
    category: { type: mongoose.Schema.Types.ObjectId, ref: "categories", required: true},
    role: {type: String, default: 'user'},
    image: String 
})



let userSchema= new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    password: String,
})



//Model 

const categories= mongoose.model("categories", catagoriesSchema)
const product= mongoose.model("products", productSchema)
const founduser= mongoose.model("users", userSchema)


//login user 

app.post('/login', async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    let user = await founduser.findOne({ email: email });

    if (user) {
        if (user.password === password) {
            jwt.sign(
                { email: user.email },
                process.env.JWT_SECRETKEY,
                { expiresIn: '5h' },
                (err, token) => {

                    if (err) {
                        return res.json({
                            message: "error generating token"
                        });
                    }

                    return res.json({
                        token: token
                    });
                }
            );

        } else {
            return res.json({
                message: 'invalid credential'
            });
        }
    } else {
        return res.json({
            message: 'user not found'
        });
    }
});

//Middleware to verify token

const verifytoken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: 'Access denied. no token provided.'
        });
    }

    const token = authHeader.split(' ')[1]; // ✅ FIX HERE

    jwt.verify(token, process.env.JWT_SECRETKEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                message: 'Invalid token'
            });
        }

        req.user = decoded;
        next();
    });
};





//CRUD for category
//Read all categories

app.get('/categories', async(req, res)=>{
    let catagoriesData= await categories.find();
    res.json(catagoriesData);
})

//create a new category
app.post('/categories', verifytoken, async(req, res)=>{
  try{
      let categoriesData= new categories(req.body);
    await categoriesData.save();  //create()
    res.json(categoriesData)
  }catch(error){
    console.log(error);
    res.status(500).json({message: error.message})
  }
})

//Delete a category

app.delete('/categories/:id',verifytoken, async(req, res)=>{
    await categories.findByIdAndDelete(req.params.id)
    res.json({message: "category deleted successfully"});
})

//Update a category
app.put('/categories/:id', verifytoken, async(req, res)=>{
    let categoriesData = await categories.findByIdAndUpdate(req.params.id, req.body, {new: true})
    res.json(categoriesData);
})

//CRUD for product
//read all products
app.get('/products', async(req, res)=>{
    let productData= await product.find().populate("category");
    res.json(productData);
})

app.post('/products', upload.single("image"), async (req, res) => {
    let newProduct = new product({
        ...req.body,
        image: req.file ? req.file.filename : ""
    });

    let saved = await newProduct.save();
    res.json(saved);
});

app.delete('/product/:id', async(req, res)=>{
   await product.findByIdAndDelete(req.params.id)
   res.json({message: 'product deleted successfully'})
})

app.put('/product/:id', async(req, res)=>{
    let productUpdated = await product.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(productUpdated);
})


//Crud for users

app.get('/users', async(req, res)=>{
        let usersData= await founduser.find();
        res.json(usersData);
}
)

app.post('/user', async(req, res)=>{
    let newUser= new founduser(req.body)
    await newUser.save();
    res.json(newUser);
})

app.put('/user/:id', async(req, res)=>{
    let userUpdated= await founduser.findByIdAndUpdate(req.params.id, req.body, {new: true})
    res.json({message: "New user has been updated"})
})

app.delete('/user/:id', async(req, res)=>{
    let deleteduser= await founduser.findByIdAndDelete(req.params.id)
    res.json("user deleted successfully");
})



console.log(process.env.MONGO_URL);
console.log(process.env.JWT_SECRETKEY);


