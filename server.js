var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const session = require('express-session');
const database = require('./config/accessFirebase');
var PORT = process.env.PORT || 3000;

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Express body parser
// app.use(express.static(__dirname));
// app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser.urlencoded({extended: false}))

// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Routes
// app.use('/', require('./routes/index.js'));
app.use(ignoreFavicon); //Important***

function ignoreFavicon(req, res, next) { //Important***
  if (req.originalUrl === '/favicon.ico') {
    res.status(204).json({nope: true});
  } else {
    next();
  }
}

const messageRef = database.ref('/Messages');

app.get('/', (req, res) => {
    res.render('homepage');
})

app.get('/createChat', (req, res) => {
    const message_id = messageRef.push().key;
    messageRef.child(message_id).set({
      name: '',
      message: ''
    });
    res.redirect(`/${message_id}`);
});

app.get('/:id', (req, res) => {
      var messageArray = [];

      messageRef.child(req.params.id).once("value", function(snapshot) {
        if(snapshot.exists()){
          // console.log("Exist")
          snapshot.forEach((child) => {
            messageArray.push(child.val());
            // console.log(child.val())
          });          
          // console.log(snapshot.val());
          req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered');
          res.render('lockdownchat', { theMessages: messageArray, MessageID: req.params.id, success_msg: req.flash('success_msg') });

        }
        else{
          let errors = [];
          var haveUpperCase = 0;
          var haveLowerCase = 0;
          var have16Characters = 0;

            if(req.params.id.length < 16){
              errors.push({ msg: 'Chat Room ID must be at least 16 characters' });
            }
            else{
              have16Characters = 1;
            }

            
            for(i = 0; i < req.params.id.length; i++){
                  if (req.params.id[i] == req.params.id[i].toUpperCase()) {
                      haveUpperCase = 1;
                      break;
                  }
            }

            if(haveUpperCase == 0){
                errors.push({ msg: 'Chat Room ID must have an Uppercase letter' });
            }

            for(i = 0; i < req.params.id.length; i++){
              if (req.params.id[i] == req.params.id[i].toLowerCase()) {
                haveLowerCase = 1;
                  break;
              }
            }
            if(haveLowerCase == 0){
              errors.push({ msg: 'Chat Room ID must have an Lowercase letter' });
            }

            if(haveUpperCase == 1 && haveLowerCase == 1 && have16Characters == 1){
              messageRef.child(req.params.id).set({
                name: '',
                message: ''
              });
              req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered');
              res.redirect(`/${req.params.id}`);
            }
            else{
              res.render('homepage', { errors });
            }

        }
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });

})


app.post('/:id', async (req, res) => {
  try{
    // const message_id = messageRef.push().key;
        messageRef.child(req.params.id).push({
            name: req.body.name,
            message: req.body.message
        });
        
        io.emit('message', req.body);
        // console.log(req.body)
        const messageArray = [];

          messageRef.child(req.params.id).once("value", function(snapshot) {
              snapshot.forEach((child) => {
                  messageArray.push(child.val());
                });          
                // console.log(messageArray);
              res.render('lockdownchat', { theMessages: messageArray, MessageID: req.params.id });
      
            }, function (errorObject) {
              console.log("The read failed: " + errorObject.code);
            });
          }
        catch (error){
          res.sendStatus(500);
          return console.log('error',error);
        }
        finally{
          console.log('Message Posted')
        }
})

// app.get('/messages', (req, res) => {
//   let messageArray = [];
//     messageRef.once("value", function(snapshot) {
//         snapshot.forEach((child) => {
//             messageArray.push(child.val());
//           });
//         console.log(messageArray);
//         res.send(messageArray);
//       }, function (errorObject) {
//         console.log("The read failed: " + errorObject.code);
//       });
// })


// app.post('/messages', async (req, res) => {
//   try{
//     const message_id = messageRef.push().key;
//         messageRef.child(message_id).set({
//             name: req.body.name,
//             message: req.body.message
//         });
        
//         io.emit('message', req.body);
//         // console.log(req.body)
//         const messageArray = [];

//         messageRef.once("value", function(snapshot) {
//             snapshot.forEach((child) => {
//                 messageArray.push(child.val());
//               });          
//             //   console.log(messageArray);
//             res.render('lockdownchat', { theMessages: messageArray});
    
//           }, function (errorObject) {
//             console.log("The read failed: " + errorObject.code);
//           });
//             }
//         catch (error){
//           res.sendStatus(500);
//           return console.log('error',error);
//         }
//         finally{
//           console.log('Message Posted')
//         }
// })


io.on('connection', () =>{
  console.log('a user is connected')
})


var server = http.listen(PORT, () => {
  console.log('server is running');
});
