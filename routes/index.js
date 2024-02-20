var express = require('express');
var router = express.Router();
const userModel = require('./users');
const postModel = require("./posts"); 
const passport = require('passport');
const fs = require("fs");
const path = require("path")
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) +  path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

const upload = multer({ storage: storage })

//This is the important line to make a protected route
const localStrategy = require('passport-local')

passport.use(new localStrategy(userModel.authenticate()))

/* GET home page. */
router.get('/', isLoggedIn, function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/register', (req, res, next) =>{
  res.render('register')
})

router.post('/register', function(req, res, next) {
  var newUser = new  userModel({
    username: req.body.username,
    name: req.body.name,
    age: req.body.age,
    email: req.body.email,
    image: req.body.image,
    bio: req.body.bio,
  })  
    userModel.register(newUser, req.body.password)
    .then(function(u){
      passport.authenticate('local') (req, res, function() {
          res.redirect('profile')
      })
    })
    .catch(function(err){
      res.send(err);
    })
});

router.post('/upload', isLoggedIn, upload.single("image"), function(req, res, next) {
  userModel
  .findOne({username: req.session.passport.user})
  .then(function(founduser) {
    if(founduser.image !== 'def.png'){
      // fs.unlinkSync(`./public/images/uploads/${founduser.image}`);
    }
    founduser.image = req.file.filename;
    founduser.save()
    .then(function() {
      res.redirect("back")
    })
  })
})

// This code is for print username on the profile

router.get('/profile',  isLoggedIn, async function(req, res, next){
  const foundUser = await userModel.findOne ({ username: req.session.passport.user })
  .populate('posts')  
    res.render("profile", {foundUser})
})

router.get('/update', isLoggedIn, async (req, res, next) =>{
  const user = await userModel.findOne({ username: req.session.passport.user })
  res.render('update', {user})
})

router.post('/update', async (req, res, next) =>{
const founduser = await userModel.findOneAndUpdate(
  {username: req.session.passport.user}, 
  {name: req.body.name, 
  bio: req.body.bio,
  email: req.body.email},
  {new: true}
  );

  await founduser.save();
  res.redirect('/profile')
})

router.get('/like/:postid', isLoggedIn, function (req, res, next) {
  userModel
    .findOne({ username: req.session.passport.user })
    .then(function (user) {
      postModel
        .findOne({ _id: req.params.postid })
        .then(function (post) {
          if (post.likes.indexOf(user._id) === -1) {
            post.likes.push(user._id);
          }
          else {
            post.likes.splice(post.likes.indexOf(user._id), 1);
          }

          post.save()
            .then(function () {
              res.redirect("back");
            })
        })
    })
});

// Add the route handler for post deletion
router.post('/delete/:postid', isLoggedIn, async (req, res, next) => {
  const postId = req.params.postid;

  try {
    // Find the post by ID
    const post = await postModel.findById(postId);

    // Check if the post exists
    if (!post) {
      return res.status(404).send('Post not found');
    }

    // Check if the user is the owner of the post
    if (post.userid.toString() !== req.user._id.toString()) {
      return res.status(403).send('Unauthorized');
    }

    // Delete the post
    await postModel.deleteOne({ _id: postId });

    // Remove the post ID from the user's posts array
    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const index = user.posts.indexOf(postId);
    if (index > -1) {
      user.posts.splice(index, 1);
      await user.save();
    }

    // Redirect the user back to their profile page
    res.redirect('/profile');
  } catch (err) {
    // Handle any errors that occur during deletion
    console.error('Error deleting post:', err);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/check/:username', function (req, res, next) {
  userModel.findOne({username: req.params.username})
  .then(function(user){
    if(user){
      res.json(true);
    }
    else{
      res.json(false);
    }
  });
});

router.post('/post', isLoggedIn, async function(req, res, next) {
 const user = await userModel.findOne({username: req.session.passport.user})
 const post =  await postModel.create({
      userid: user._id,
      data: req.body.post
    })
    
      user.posts.push(post._id);
      await user.save()
      res.redirect("back")
})

router.get('/feed',  isLoggedIn, function(req, res, next) {
  userModel.findOne({ username: req.session.passport.user })
  .then(function(user){
    postModel
  .find().populate("userid")
  .then(function(allposts) {
    res.render("feed", {allposts, user});
  });
  
})
})

router.get('/login', function(req, res, next){
  res.render('login', {error: req.flash('error')})
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/login',
  failureFlash: true
}), function(req, res, next){});


router.get('/logout', function(req, res, next){
  req.logout(function(err){
    if(err){
      return next(err);
    }
    res.redirect('back')
  })
});

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  else{
    res.redirect('/login')
  }
}

module.exports = router;
