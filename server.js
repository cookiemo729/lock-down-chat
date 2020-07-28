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
// app.use('/', require('./routes/admin.js'));

//Ignore Favicon error
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
    req.body.chatID = message_id
    res.redirect(`/${message_id}`);
    io.emit("adminNewChat", req.body)
});

app.get('/:id', (req, res) => {
      var messageArray = [];
      var messageIDArray = [];

      messageRef.child(req.params.id).once("value", function(snapshot) {
        if(snapshot.exists()){
          snapshot.forEach((child) => {
            messageIDArray.push(child.key);
            messageArray.push(child.val());
          });          
          req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered');
          res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, success_msg: req.flash('success_msg'), isInstructor: 'false' });

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
              req.body.chatID = req.params.id
              res.redirect(`/${req.params.id}`);
              io.emit("adminNewChat", req.body)
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
    var d = new Date();
    var options = { hour12: false };

    messageRef.child(req.params.id).push({
            name: req.body.name,
            message: req.body.message,
            textColor: '#000000',
            backgroundTextColor: '#99ffbb',
            owner: 'Student',
            state: 'visible',
            dateTime: d.toLocaleString('en-US', options)
        });
        req.body.textColor = '#000000';
        req.body.backgroundTextColor = '#99ffbb';
        req.body.owner = 'Instructor';
        req.body.state = 'visible';
        req.body.chatID = req.params.id;
        req.body.dateTime = d.toLocaleString('en-US', options)

        var dataArray = [];
        messageRef.child(req.params.id).once("value", function(snapshot) {
          snapshot.forEach((child) => {
            dataArray.push(child.key);
         });          

         req.body.theMsgID = dataArray.slice(-3)[0];
        //  console.log(req.body.theMsgID);
         io.emit('message', req.body);
         io.emit('adminUpdateLastMsgDateTime', req.body);

        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });

       
        var messageArray = [];
        var messageIDArray = [];

          messageRef.child(req.params.id).once("value", function(snapshot) {
              snapshot.forEach((child) => {
                  messageIDArray.push(child.key);
                  messageArray.push(child.val());
                });          
                // console.log(messageArray);
              res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, isInstructor: 'false' });
      
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

app.get('/:id/instructor', (req, res) => {
    var messageArray = [];
    var messageIDArray = [];

    messageRef.child(req.params.id).once("value", function(snapshot) {
      if(snapshot.exists()){
        snapshot.forEach((child) => {
          messageIDArray.push(child.key);
          messageArray.push(child.val());
        });          
        // req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered as instructor');
        res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, success_msg: req.flash('success_msg'), isInstructor: 'true' });

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
            // req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered as instructor');
            res.redirect(`/${req.params.id}/instructor`);
          }
          else{
            res.render('homepage', { errors });
          }

      }
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
});



app.post('/:id/instructor', async (req, res) => {
  try{
    var d = new Date();
    var options = { hour12: false };

    messageRef.child(req.params.id).push({
            name: req.body.name,
            message: req.body.message,
            textColor: 'blue',
            backgroundTextColor: '#ffffb3',
            owner: 'Instructor',
            state: 'visible',
            dateTime: d.toLocaleString('en-US', options)
          });
        req.body.textColor = 'blue';
        req.body.backgroundTextColor = '#ffffb3';
        req.body.owner = 'Instructor';
        req.body.state = 'visible';
        req.body.dateTime = d.toLocaleString('en-US', options)

        var dataArray = [];
        messageRef.child(req.params.id).once("value", function(snapshot) {
          snapshot.forEach((child) => {
            dataArray.push(child.key);
         });          
         
         req.body.theMsgID = dataArray.slice(-3)[0];
         req.body.chatID = req.params.id;

        //  console.log(req.body.theMsgID);
         io.emit('message', req.body);
         io.emit('adminUpdateLastMsgDateTime', req.body);

        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });

        var messageArray = [];
        var messageIDArray = [];

          messageRef.child(req.params.id).once("value", function(snapshot) {
              snapshot.forEach((child) => {
                  messageIDArray.push(child.key);
                  messageArray.push(child.val());
                });          
              res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, isInstructor: 'true' });
      
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

app.get('/:id/instructor/:theMsgID/hide', async (req, res) => {
        messageRef.child(req.params.id).child(req.params.theMsgID).once("value", function(snapshot) {
          messageRef.child(req.params.id).child(req.params.theMsgID).set({
                name: snapshot.val().name,
                message: snapshot.val().message,
                textColor: 'black',
                backgroundTextColor: '#b3b3b3',
                owner: snapshot.val().owner,
                state: 'hidden',
                dateTime: snapshot.val().dateTime
            });
            req.body.theMsgID = req.params.theMsgID;
            // req.body.name = snapshot.val().name;
            // req.body.message = snapshot.val().message;
            // req.body.textColor = 'black';
            // req.body.backgroundTextColor = '#b3b3b3';
            // req.body.owner = snapshot.val().owner;
            // req.body.state = 'hidden';

            res.redirect(`/${req.params.id}/instructor`);
            io.emit('messageHide', req.body);
            
        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });      
})

app.get('/:id/instructor/:theMsgID/unhide', async (req, res) => {
  messageRef.child(req.params.id).child(req.params.theMsgID).once("value", function(snapshot) {
      if(snapshot.val().owner == 'Student'){
        messageRef.child(req.params.id).child(req.params.theMsgID).set({
          name: snapshot.val().name,
          message: snapshot.val().message,
          textColor: '#000000',
          backgroundTextColor: '#99ffbb',
          owner: snapshot.val().owner,
          state: 'visible',
          dateTime: snapshot.val().dateTime
        });
    }
    else{
        messageRef.child(req.params.id).child(req.params.theMsgID).set({
          name: snapshot.val().name,
          message: snapshot.val().message,
          textColor: 'blue',
          backgroundTextColor: '#ffffb3',
          owner: snapshot.val().owner,
          state: 'visible',
          dateTime: snapshot.val().dateTime
      });
    }
    
      req.body.theMsgID = req.params.theMsgID;
      // req.body.name = snapshot.val().name;
      // req.body.message = snapshot.val().message;
      // req.body.textColor = '#000000';
      // req.body.backgroundTextColor = '#99ffbb';
      // req.body.owner = snapshot.val().owner;
      // req.body.state = 'visible';

      res.redirect(`/${req.params.id}/instructor`);
      io.emit('messageUnhide', req.body);
      
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });      
})


app.get('/:id/instructor/clear', async (req, res) => {
  let messagesToClear = messageRef.child(req.params.id);
  messagesToClear.remove()
  res.redirect(`/${req.params.id}/instructor`);
  io.emit('messageClear', req.params.id);
  io.emit('adminUpdateAfterClearMessages', req.params.id);

})

app.get('/admin/infinity', async (req, res) => {
  //Get all Chat Rooms
  var ChatRmIDArray = [];
  var DateTimeOfLastMsgInEachChatRmArray = [];

  var ChatRmIDWithoutDateTime = [];
  var WithoutDateTimeOfLastMsgInEachChatRmArray = [];
  

  messageRef.on("value", function(snapshot) {
      snapshot.forEach((child) => {
          // ChatRmIDArray.push(child.key)
          var AllDateTimeOfCurrentChatRm = [];
          child.forEach((childchild) => {
              AllDateTimeOfCurrentChatRm.push(childchild.val().dateTime);
          });


          if(AllDateTimeOfCurrentChatRm.length > 2){
              ChatRmIDArray.push(child.key)
              DateTimeOfLastMsgInEachChatRmArray.push(AllDateTimeOfCurrentChatRm.slice(-3)[0]);
          }
          else{
              ChatRmIDWithoutDateTime.push(child.key);
              WithoutDateTimeOfLastMsgInEachChatRmArray.push('-');
          };

       });

          var list = [];
          for (var j = 0; j < ChatRmIDArray.length; j++) 
          list.push({'ChatRmID': ChatRmIDArray[j], 'LastMsgDateTime': DateTimeOfLastMsgInEachChatRmArray[j]});
          list.sort(function(a, b) {
            return ((a.LastMsgDateTime < b.LastMsgDateTime) ? -1 : ((a.LastMsgDateTime == b.LastMsgDateTime) ? 0 : 1));
          });

          for (var k = 0; k < list.length; k++) {
            ChatRmIDArray[k] = list[k].ChatRmID;
            DateTimeOfLastMsgInEachChatRmArray[k] = list[k].LastMsgDateTime;
          }

          ChatRmIDArray = ChatRmIDArray.concat(ChatRmIDWithoutDateTime);
          DateTimeOfLastMsgInEachChatRmArray = DateTimeOfLastMsgInEachChatRmArray.concat(WithoutDateTimeOfLastMsgInEachChatRmArray);

          // res.render('infinity', { ChatRmIDs: ChatRmIDArray, DateTimeOfLastMsgInEachChatRm: DateTimeOfLastMsgInEachChatRmArray})

        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });
       res.render('infinity', { ChatRmIDs: ChatRmIDArray, DateTimeOfLastMsgInEachChatRm: DateTimeOfLastMsgInEachChatRmArray})

  })
  
  app.post('/admin/infinity', async (req, res) => {
    let chatsToClear = messageRef;
    chatsToClear.remove();
    req.flash('success_msg', 'Successfully cleared all chats!');
    res.redirect(`/admin/infinity`);
    io.emit('adminUpdateAfterClearAllChatRooms');
  })

  app.post('/admin/infinity/:ChatRmID/delete', async (req, res) => {
    let specificChatToRemove = messageRef.child(req.params.ChatRmID);
    specificChatToRemove.remove()
    req.flash('success_msg', 'Successfully deleted ' + req.params.ChatRmID + ' chat!');
    res.redirect(`/admin/infinity`);
    io.emit('adminUpdateAfterClearSpecificChatRoom', req.params.ChatRmID);
  })








io.on('connection', () =>{
  console.log('a user is connected')
})


var server = http.listen(PORT, () => {
  console.log('server is running');
});
