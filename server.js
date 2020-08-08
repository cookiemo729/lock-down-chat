var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const session = require('express-session');
const database = require('./config/accessFirebase');
const { Console } = require('console');
var PORT = process.env.PORT || 3000;

// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Express body parser
// app.use(express.static(__dirname));
// app.use(bodyParser.json());
app.use('/public/images/', express.static('./public/images'));
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

function getMonthText(monthNum){
    var month = new Array();
    month[0] = "January";
    month[1] = "February";
    month[2] = "March";
    month[3] = "April";
    month[4] = "May";
    month[5] = "June";
    month[6] = "July";
    month[7] = "August";
    month[8] = "September";
    month[9] = "October";
    month[10] = "November";
    month[11] = "December";

    return month[monthNum]
}

app.get('/createChat', (req, res) => {
    var d = new Date();
    var options = { hour12: false };

    var date = d.toLocaleDateString();
    var MonthText = getMonthText((date.substring(0,1) - 1));
    var day = date.substring(2, 3);
    var Time = d.toLocaleTimeString('en-GB', options);

    // console.log(day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time);

    const message_id = messageRef.push().key;
    messageRef.child(message_id).set({
      name: '',
      dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
    });
    req.body.chatID = message_id
    res.redirect(`/${message_id}`);
    io.emit("adminNewChat", req.body)
});

app.get('/:id', (req, res) => {
    var d = new Date();
    var options = { hour12: false };

    var date = d.toLocaleDateString();
    var MonthText = getMonthText((date.substring(0,1) - 1));
    var day = date.substring(2, 3);
    var Time = d.toLocaleTimeString('en-GB', options);

      var messageArray = [];
      var messageIDArray = [];

      var repliesArray = [];
      var MsgIDOfrepliesArray = [];
      var repliesIDArray = [];

      messageRef.child(req.params.id).once("value", function(snapshot) {
        if(snapshot.exists()){
          snapshot.forEach((child) => {
            messageIDArray.push(child.key);
            messageArray.push(child.val());

            child.forEach((childchild) => {
              if(childchild.key.substring(0, 1) == '-'){
                MsgIDOfrepliesArray.push(child.key);
                repliesArray.push(childchild.val());
                repliesIDArray.push(childchild.key)
              }
            })
          });

          req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered');
          res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, success_msg: req.flash('success_msg'), isInstructor: 'false', OwnMessageName: req.body.name, OwnMessage: req.body.message, OwnMessageID: "", OwnMessageDateTime: "", repliesArray: repliesArray, MsgIDOfrepliesArray: MsgIDOfrepliesArray, repliesIDArray: repliesIDArray });

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
                dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
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

    var date = d.toLocaleDateString();
    var MonthText = getMonthText((date.substring(0,1) - 1));
    var day = date.substring(2, 3);
    var Time = d.toLocaleTimeString('en-GB', options);

    messageRef.child(req.params.id).push({
            name: req.body.name,
            message: req.body.message,
            textColor: 'black',
            backgroundTextColor: '#b3b3b3',
            owner: 'Student',
            state: 'hidden',
            dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
        });
        req.body.textColor = '#000000';
        req.body.backgroundTextColor = '#b3b3b3';
        req.body.owner = 'Student';
        req.body.state = 'hidden';
        req.body.chatID = req.params.id;
        req.body.dateTime = day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time

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

        var repliesArray = [];
        var MsgIDOfrepliesArray = [];
        var repliesIDArray = [];
        
          messageRef.child(req.params.id).once("value", function(snapshot) {
              snapshot.forEach((child) => {
                  messageIDArray.push(child.key);
                  messageArray.push(child.val());

                  child.forEach((childchild) => {
                    if(childchild.key.substring(0, 1) == '-'){
                      MsgIDOfrepliesArray.push(child.key);
                      repliesArray.push(childchild.val());
                      repliesIDArray.push(childchild.key)
                    }
                  })
                });          
                // console.log(messageIDArray.slice(-3)[0]);
              res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, isInstructor: 'false', OwnMessageName: req.body.name, OwnMessage: req.body.message, OwnMessageID: messageIDArray.slice(-3)[0], OwnMessageDateTime: req.body.dateTime, repliesArray: repliesArray, MsgIDOfrepliesArray: MsgIDOfrepliesArray, repliesIDArray: repliesIDArray });
      
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
    var d = new Date();
    var options = { hour12: false };

    var date = d.toLocaleDateString();
    var MonthText = getMonthText((date.substring(0,1) - 1));
    var day = date.substring(2, 3);
    var Time = d.toLocaleTimeString('en-GB', options);


    var messageArray = [];
    var messageIDArray = [];

    var repliesArray = [];
    var MsgIDOfrepliesArray = [];
    var repliesIDArray = [];

    messageRef.child(req.params.id).once("value", function(snapshot) {
      if(snapshot.exists()){
        snapshot.forEach((child) => {
          messageIDArray.push(child.key);
          messageArray.push(child.val());

            child.forEach((childchild) => {
              if(childchild.key.substring(0, 1) == '-'){
                MsgIDOfrepliesArray.push(child.key);
                repliesArray.push(childchild.val());
                repliesIDArray.push(childchild.key)
              }
            })
        });

        // req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered as instructor');
        res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, success_msg: req.flash('success_msg'), isInstructor: 'true', repliesArray: repliesArray, MsgIDOfrepliesArray: MsgIDOfrepliesArray, repliesIDArray: repliesIDArray });
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
              dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
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

    var date = d.toLocaleDateString();
    var MonthText = getMonthText((date.substring(0,1) - 1));
    var day = date.substring(2, 3);
    var Time = d.toLocaleTimeString('en-GB', options);

    messageRef.child(req.params.id).push({
            name: req.body.name,
            message: req.body.message,
            textColor: 'blue',
            backgroundTextColor: '#ffffb3',
            owner: 'Instructor',
            state: 'visible',
            dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
          });
        req.body.textColor = 'blue';
        req.body.backgroundTextColor = '#ffffb3';
        req.body.owner = 'Instructor';
        req.body.state = 'visible';
        req.body.dateTime = day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time

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

        var repliesArray = [];
        var MsgIDOfrepliesArray = [];
        var repliesIDArray = [];

          messageRef.child(req.params.id).once("value", function(snapshot) {
              snapshot.forEach((child) => {
                  messageIDArray.push(child.key);
                  messageArray.push(child.val());

                  child.forEach((childchild) => {
                    if(childchild.key.substring(0, 1) == '-'){
                      MsgIDOfrepliesArray.push(child.key);
                      repliesArray.push(childchild.val());
                      repliesIDArray.push(childchild.key)
                    }
                  })
                });
              res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, isInstructor: 'true', repliesArray: repliesArray, MsgIDOfrepliesArray: MsgIDOfrepliesArray, repliesIDArray: repliesIDArray });
      
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
          if(snapshot.val().owner == 'Student'){
            messageRef.child(req.params.id).child(req.params.theMsgID).update({
                  name: snapshot.val().name,
                  message: snapshot.val().message,
                  textColor: 'black',
                  backgroundTextColor: '#b3b3b3',
                  owner: snapshot.val().owner,
                  state: 'hidden',
                  dateTime: snapshot.val().dateTime
              });
          }
          else{
              messageRef.child(req.params.id).child(req.params.theMsgID).update({
                name: snapshot.val().name,
                message: snapshot.val().message,
                textColor: 'blue',
                backgroundTextColor: '#b3b3b3',
                owner: snapshot.val().owner,
                state: 'hidden',
                dateTime: snapshot.val().dateTime
            });
          }

            req.body.theMsgID = req.params.theMsgID;
            req.body.chatID = req.params.id;
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

app.get('/:id/instructor/:theMsgID/broadcast', async (req, res) => {
  messageRef.child(req.params.id).child(req.params.theMsgID).once("value", function(snapshot) {
      if(snapshot.val().owner == 'Student'){
        messageRef.child(req.params.id).child(req.params.theMsgID).update({
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
        messageRef.child(req.params.id).child(req.params.theMsgID).update({
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
      req.body.chatID = req.params.id;
      // req.body.name = snapshot.val().name;
      // req.body.message = snapshot.val().message;
      // req.body.textColor = '#000000';
      // req.body.backgroundTextColor = '#99ffbb';
      req.body.owner = snapshot.val().owner;
      // req.body.state = 'visible';

      res.redirect(`/${req.params.id}/instructor`);
      io.emit('messageBroadcast', req.body);
      
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
              date1 = new Date(a.LastMsgDateTime);
              date2 = new Date(b.LastMsgDateTime);
              if (date1 > date2) return 1;
              if (date1 < date2) return -1;
            })

          // list.sort(function(a, b) {
          //     return ((a.LastMsgDateTime < b.LastMsgDateTime) ? -1 : ((a.LastMsgDateTime > b.LastMsgDateTime) ? 1 : 0));
          // });

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
  
  // app.post('/admin/infinity', async (req, res) => {

  //   var ChatRmIDArray = [];
  //   var DateTimeOfLastMsgInEachChatRmArray = [];

  //   var ChatRmIDWithoutDateTime = [];
  //   var WithoutDateTimeOfLastMsgInEachChatRmArray = [];
  
  //   var ChatRmIDToEmit = [];

  // messageRef.on("value", function(snapshot) {
  //     snapshot.forEach((child) => {
  //         var AllDateTimeOfCurrentChatRm = [];
  //         child.forEach((childchild) => {
  //             AllDateTimeOfCurrentChatRm.push(childchild.val().dateTime);
  //         });


  //         if(AllDateTimeOfCurrentChatRm.length > 2){
  //             ChatRmIDArray.push(child.key)
  //             DateTimeOfLastMsgInEachChatRmArray.push(AllDateTimeOfCurrentChatRm.slice(-3)[0]);
  //         }
  //         else{
  //             ChatRmIDWithoutDateTime.push(child.key);
  //             WithoutDateTimeOfLastMsgInEachChatRmArray.push('-');
  //         };

  //      });

  //       }, function (errorObject) {
  //         console.log("The read failed: " + errorObject.code);
  //       });

  //       var list = [];
  //         var d = new Date();
  //         var options = { hour12: false };

  //         for (var j = 0; j < ChatRmIDArray.length; j++) 
  //         list.push({'ChatRmID': ChatRmIDArray[j], 'LastMsgDateTime': DateTimeOfLastMsgInEachChatRmArray[j]});

  //         for(x = 0; x < list.length; x++){
  //           var result = new Date(list[x].LastMsgDateTime);
  //           result.setDate(result.getDate() + 28);
  //           // result = result.toLocaleString('en-GB', options);
  //           // console.log(result);
  //           // console.log(d)
  //           if(result < d){
  //             // console.log("The ID IS : " + list[x].ChatRmID);
  //             ChatRmIDToEmit.push(list[x].ChatRmID);
  //             // console.log(ChatRmIDToEmit);
  //             let specificChatToRemove = messageRef.child(list[x].ChatRmID);
  //             specificChatToRemove.remove();
  //             // console.log("Deleted")
  //           }
  //         }

  //         req.flash('success_msg', 'Successfully cleared chat rooms from 4 weeks ago!');
  //         res.redirect(`/admin/infinity`);
  //         io.emit('adminUpdateAfterClearAllChatRooms', ChatRmIDToEmit);
  // })

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



  app.post('/admin/infinity/Clear4WeeksAgoChatRms', async (req, res) => {

    var ChatRmIDArray = [];
    var DateTimeOfEachChatRmArray = [];

    var ChatRmIDToEmit = [];

    messageRef.on("value", function(snapshot) {
        snapshot.forEach((child) => {         
                ChatRmIDArray.push(child.key)
                DateTimeOfEachChatRmArray.push(child.val().dateTime);
        });

          }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
          });

          // console.log(ChatRmIDArray)
          // console.log(DateTimeOfEachChatRmArray)

          var list = [];
          var d = new Date();
          var options = { hour12: false };

          for (var j = 0; j < ChatRmIDArray.length; j++){
            list.push({'ChatRmID': ChatRmIDArray[j], 'ChatRmCreationDateTime': DateTimeOfEachChatRmArray[j]})
          };

          for(x = 0; x < list.length; x++){
            var result = new Date(list[x].ChatRmCreationDateTime);
            result.setDate(result.getDate() + 28);
            // result = result.toLocaleString('en-GB', options);
            // console.log(result);
            // console.log(d)
            if(result < d){
              ChatRmIDToEmit.push(list[x].ChatRmID);
              let specificChatToRemove = messageRef.child(list[x].ChatRmID);
              specificChatToRemove.remove();
            }
          }

          req.flash('success_msg', 'Successfully cleared chat rooms from 4 weeks ago!');
          res.redirect(`/admin/infinity`);
          io.emit('adminUpdateAfter4WeeksAgoChatRooms', ChatRmIDToEmit);
  })

  app.post('/:id/instructor/:theMsgID/reply', async (req, res) => {
    var d = new Date();
    var options = { hour12: false };

    var date = d.toLocaleDateString();
    var MonthText = getMonthText((date.substring(0,1) - 1));
    var day = date.substring(2, 3);
    var Time = d.toLocaleTimeString('en-GB', options);

    var newReply = messageRef.child(req.params.id).child(req.params.theMsgID).push({
          name: req.body.replyName,
          message: req.body.replyMessage,
          textColor: 'blue',
          backgroundTextColor: 'white',
          owner: 'Instructor',
          state: 'visible',
          dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
      });
      
      req.body.chatID = req.params.id;
      req.body.replyID = (await newReply).key;
      req.body.theMsgID = req.params.theMsgID;
      req.body.textColor = 'blue';
      req.body.dateTime = day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time;

      messageRef.child(req.params.id).child(req.params.theMsgID).once("value", function(snapshot) {
          req.body.MsgName = snapshot.val().name;
          res.redirect(`/${req.params.id}/instructor`);
          io.emit('repliesAdded', req.body);
          
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });      
      
  })


  app.get('/:id/instructor/:theMsgID/:theReplyID/hideReply', async (req, res) => {
    messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).once("value", function(snapshot) {
        messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).update({
              name: snapshot.val().name,
              message: snapshot.val().message,
              textColor: 'blue',
              backgroundTextColor: '#b3b3b3',
              owner: snapshot.val().owner,
              state: 'hidden',
              dateTime: snapshot.val().dateTime
          });

        req.body.theMsgID = req.params.theMsgID;
        req.body.chatID = req.params.id;
        req.body.replyID = req.params.theReplyID;
        // req.body.name = snapshot.val().name;
        // req.body.message = snapshot.val().message;
        // req.body.textColor = 'black';
        // req.body.backgroundTextColor = '#b3b3b3';
        // req.body.owner = snapshot.val().owner;
        // req.body.state = 'hidden';

        res.redirect(`/${req.params.id}/instructor`);
        io.emit('messageReplyHide', req.body);
        
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });      
})

app.get('/:id/instructor/:theMsgID/:theReplyID/unhideReply', async (req, res) => {
  messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).once("value", function(snapshot) {
      messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).update({
            name: snapshot.val().name,
            message: snapshot.val().message,
            textColor: 'blue',
            backgroundTextColor: 'white',
            owner: snapshot.val().owner,
            state: 'visible',
            dateTime: snapshot.val().dateTime
        });

      req.body.theMsgID = req.params.theMsgID;
      req.body.chatID = req.params.id;
      req.body.replyID = req.params.theReplyID;
      // req.body.name = snapshot.val().name;
      // req.body.message = snapshot.val().message;
      // req.body.textColor = 'black';
      // req.body.backgroundTextColor = '#b3b3b3';
      // req.body.owner = snapshot.val().owner;
      // req.body.state = 'hidden';

      res.redirect(`/${req.params.id}/instructor`);
      io.emit('messageReplyUnhide', req.body);
      
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });      
})



io.on('connection', () =>{
  console.log('a user is connected')
})


var server = http.listen(PORT, () => {
  console.log('server is running');
});
