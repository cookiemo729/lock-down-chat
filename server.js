var express = require('express');
// var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const session = require('express-session');
const database = require('./config/accessFirebase');
// const { Console } = require('console');
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

//Access /Messages data in database
const messageRef = database.ref('/Messages');

//Starting page of LockDownChat
app.get('/', (req, res) => {
    res.render('homepage');
})

//Get month in words
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

//Create a new chat room
app.get('/createChat', (req, res) => {
    var d = new Date();
    var options = { hour12: false };

    var MonthText = getMonthText(d.getMonth());
    var day = d.getDate();
    var Time = d.toLocaleTimeString('en-GB', options); //Time in 24 hour format

    const message_id = messageRef.push().key; //Insert a random chat id into db
    messageRef.child(message_id).set({        //Set name and datetime to the newly inserted chat room id
      name: '',
      dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
    });
    req.body.chatID = message_id
    res.redirect(`/${message_id}`);           //Redirect to newly created chat room
    io.emit("adminNewChat", req.body)         //Pass the req.body data to front-end for socket.io
});

//Student page
app.get('/:id', (req, res) => {
    var d = new Date();
    var options = { hour12: false };

    var MonthText = getMonthText(d.getMonth());
    var day = d.getDate();
    var Time = d.toLocaleTimeString('en-GB', options); //Time in 24 hour format

      var messageArray = [];
      var messageIDArray = [];

      var repliesArray = [];
      var MsgIDOfrepliesArray = [];
      var repliesIDArray = [];

      messageRef.child(req.params.id).once("value", function(snapshot) { //Get the data of the chat room ID
        //If chat room exist, foreach message in this chat room, push its message ID & other message data into respective Arrays
        if(snapshot.exists()){
          snapshot.forEach((child) => {
            messageIDArray.push(child.key);
            messageArray.push(child.val());
            //Foreach attribute in message, if there are replies, push the message id, reply ID & other reply data into respective Arrays
            child.forEach((childchild) => {
              if(childchild.key.substring(0, 1) == '-'){
                MsgIDOfrepliesArray.push(child.key);
                repliesArray.push(childchild.val());
                repliesIDArray.push(childchild.key)
              }
            })
          });

          //Pass the Arrays to front-end for display
          req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered');
          res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, success_msg: req.flash('success_msg'), isInstructor: 'false', OwnMessageName: req.body.name, OwnMessage: req.body.message, OwnMessageID: "", OwnMessageDateTime: "", repliesArray: repliesArray, MsgIDOfrepliesArray: MsgIDOfrepliesArray, repliesIDArray: repliesIDArray });

        }
        else{
          // let errors = [];
          //     errors.push({ msg: 'Please select "Create Chat Room"' });
          //     res.render('homepage', { errors });
              req.flash('error_msg', 'Please select "Create Chat Room"');
              res.redirect(`/`);

              /**
               * The following codes are for validating that the URL of a chat room is of a 
               * certain complexity
               */
          // var haveUpperCase = 0;
          // var haveLowerCase = 0;
          // var have16Characters = 0;
          //Validating the Chat room ID
            // if(req.params.id.length < 16){
            //   errors.push({ msg: 'Chat Room ID must be at least 16 characters' });
            // }
            // else{
            //   have16Characters = 1;
            // }

            
            // for(i = 0; i < req.params.id.length; i++){
            //       if (req.params.id[i] == req.params.id[i].toUpperCase()) {
            //           haveUpperCase = 1;
            //           break;
            //       }
            // }

            // if(haveUpperCase == 0){
            //     errors.push({ msg: 'Chat Room ID must have an Uppercase letter' });
            // }

            // for(i = 0; i < req.params.id.length; i++){
            //   if (req.params.id[i] == req.params.id[i].toLowerCase()) {
            //     haveLowerCase = 1;
            //       break;
            //   }
            // }
            // if(haveLowerCase == 0){
            //   errors.push({ msg: 'Chat Room ID must have an Lowercase letter' });
            // }
            // //If validation pass
            // if(haveUpperCase == 1 && haveLowerCase == 1 && have16Characters == 1){
            //   messageRef.child(req.params.id).set({                                   //Set name and datetime to the newly inserted chat room id
            //     name: '',
            //     dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
            //   });
            //   req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered');
            //   req.body.chatID = req.params.id
            //   res.redirect(`/${req.params.id}`);                                       //Redirect to newly created chat room
            //   io.emit("adminNewChat", req.body)                                        //Pass the req.body data to front-end for socket.io
            // }
            // else{
            //   res.render('homepage', { errors });                                      //Display errors if validation fails
            // }

        }
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });

})

//Send message in Student's chat room
app.post('/:id', async (req, res) => {
  try{
    var d = new Date();
    var options = { hour12: false };

    var MonthText = getMonthText(d.getMonth());
    var day = d.getDate();
    var Time = d.toLocaleTimeString('en-GB', options);     // Time in 24 hour format

    messageRef.child(req.params.id).push({                 // Insert new message to chat room
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
        messageRef.child(req.params.id).once("value", function(snapshot) {              //Read all messages in the chat room
          snapshot.forEach((child) => {
            dataArray.push(child.key);                                                  //Push to dataArray
         });          

         req.body.theMsgID = dataArray.slice(-3)[0];
        //  console.log(req.body.theMsgID);
         io.emit('message', req.body);                                                  //Pass the req.body data to front-end for socket.io
         io.emit('adminUpdateLastMsgDateTime', req.body);                               //Pass the req.body data to front-end for socket.io

        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });

       
        var messageArray = [];
        var messageIDArray = [];

        var repliesArray = [];
        var MsgIDOfrepliesArray = [];
        var repliesIDArray = [];
        
          messageRef.child(req.params.id).once("value", function(snapshot) {             //Get the data of the chat room ID
              snapshot.forEach((child) => {                                              //Push message id & other attributes into respective Arrays
                  messageIDArray.push(child.key);
                  messageArray.push(child.val());

                  child.forEach((childchild) => {                                        //Foreach attribute in message, if there are replies, push the message id, reply ID & other reply data into respective Arrays
                    if(childchild.key.substring(0, 1) == '-'){
                      MsgIDOfrepliesArray.push(child.key);
                      repliesArray.push(childchild.val());
                      repliesIDArray.push(childchild.key)
                    }
                  })
                });          
                // console.log(messageIDArray.slice(-3)[0]);
                                                                                          //Pass the Arrays to front-end for display
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

//Instructor page
app.get('/:id/instructor', (req, res) => {
    var d = new Date();
    var options = { hour12: false };

    var MonthText = getMonthText(d.getMonth());
    var day = d.getDate();
    var Time = d.toLocaleTimeString('en-GB', options);    // Time in 24 hour format

    var messageArray = [];
    var messageIDArray = [];

    var repliesArray = [];
    var MsgIDOfrepliesArray = [];
    var repliesIDArray = [];

    messageRef.child(req.params.id).once("value", function(snapshot) {                            //Get the data of the chat room ID
      if(snapshot.exists()){                                                                      //If chat room exist, foreach message in this chat room, push its message ID & other message data into respective Arrays
        snapshot.forEach((child) => {
          messageIDArray.push(child.key);
          messageArray.push(child.val());

            child.forEach((childchild) => {                                                       //Foreach attribute in message, if there are replies, push the message id, reply ID & other reply data into respective Arrays
              if(childchild.key.substring(0, 1) == '-'){
                MsgIDOfrepliesArray.push(child.key);
                repliesArray.push(childchild.val());
                repliesIDArray.push(childchild.key)
              }
            })
        });

        // req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered as instructor');
                                                                                                  //Pass the Arrays to front-end for display
        res.render('lockdownchat', { theMessages: messageArray, theMessagesIDs: messageIDArray, MessageID: req.params.id, success_msg: req.flash('success_msg'), isInstructor: 'true', repliesArray: repliesArray, MsgIDOfrepliesArray: MsgIDOfrepliesArray, repliesIDArray: repliesIDArray });
      }
      else{
        // let errors = [];
        //       errors.push({ msg: 'Please select "Create Chat Room"' });
        //       res.render('homepage', { errors });
              req.flash('error_msg', 'Please select "Create Chat Room"');
              res.redirect(`/`);
              
        // var haveUpperCase = 0;
        // var haveLowerCase = 0;
        // var have16Characters = 0;
        // //Validating the Chat room ID
        //   if(req.params.id.length < 16){
        //     errors.push({ msg: 'Chat Room ID must be at least 16 characters' });
        //   }
        //   else{
        //     have16Characters = 1;
        //   }

          
        //   for(i = 0; i < req.params.id.length; i++){
        //         if (req.params.id[i] == req.params.id[i].toUpperCase()) {
        //             haveUpperCase = 1;
        //             break;
        //         }
        //   }

        //   if(haveUpperCase == 0){
        //       errors.push({ msg: 'Chat Room ID must have an Uppercase letter' });
        //   }

        //   for(i = 0; i < req.params.id.length; i++){
        //     if (req.params.id[i] == req.params.id[i].toLowerCase()) {
        //       haveLowerCase = 1;
        //         break;
        //     }
        //   }
        //   if(haveLowerCase == 0){
        //     errors.push({ msg: 'Chat Room ID must have an Lowercase letter' });
        //   }
        //   //If validation pass
        //   if(haveUpperCase == 1 && haveLowerCase == 1 && have16Characters == 1){
        //     messageRef.child(req.params.id).set({                                                         //Set name and datetime to the newly inserted chat room id
        //       name: '',
        //       dateTime: day + ' ' + MonthText + ' ' + d.getFullYear() + ', ' + Time
        //     });
        //     // req.flash('success_msg', 'Chat Room ' + req.params.id + ' entered as instructor');
        //     res.redirect(`/${req.params.id}/instructor`);                                                 //Redirect to newly created chat room
        //   }
        //   else{
        //     res.render('homepage', { errors });
        //   }

      }
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
});


//Send message in Instructor's chat room
app.post('/:id/instructor', async (req, res) => {
  try{
    var d = new Date();
    var options = { hour12: false };

    var MonthText = getMonthText(d.getMonth());
    var day = d.getDate();
    var Time = d.toLocaleTimeString('en-GB', options);    // Time in 24 hour format

    messageRef.child(req.params.id).push({                // Insert new message to chat room
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
        messageRef.child(req.params.id).once("value", function(snapshot) {                //Read all messages in the chat room
          snapshot.forEach((child) => {
            dataArray.push(child.key);                                                    //Push to dataArray
         });          
         
         req.body.theMsgID = dataArray.slice(-3)[0];
         req.body.chatID = req.params.id;

        //  console.log(req.body.theMsgID);
         io.emit('message', req.body);                                                    //Pass the req.body data to front-end for socket.io
         io.emit('adminUpdateLastMsgDateTime', req.body);                                 //Pass the req.body data to front-end for socket.io

        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });

        var messageArray = [];
        var messageIDArray = [];

        var repliesArray = [];
        var MsgIDOfrepliesArray = [];
        var repliesIDArray = [];

          messageRef.child(req.params.id).once("value", function(snapshot) {              //Get the data of the chat room ID
              snapshot.forEach((child) => {                                               //Push message id & other attributes into respective Arrays
                  messageIDArray.push(child.key);
                  messageArray.push(child.val());

                  child.forEach((childchild) => {                                         //Foreach attribute in message, if there are replies, push the message id, reply ID & other reply data into respective Arrays
                    if(childchild.key.substring(0, 1) == '-'){
                      MsgIDOfrepliesArray.push(child.key);
                      repliesArray.push(childchild.val());
                      repliesIDArray.push(childchild.key)
                    }
                  })
                });
                                                                                          //Pass the Arrays to front-end for display
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

//Hiding message at instructor page
app.get('/:id/instructor/:theMsgID/hide', async (req, res) => {
        messageRef.child(req.params.id).child(req.params.theMsgID).once("value", function(snapshot) {         //Find the message
          if(snapshot.val().owner == 'Student'){
            messageRef.child(req.params.id).child(req.params.theMsgID).update({                               //Update the message textColor, backgroundTextColor & state to hidden
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
              messageRef.child(req.params.id).child(req.params.theMsgID).update({                             //Update the message textColor, backgroundTextColor & state to hidden
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

            res.redirect(`/${req.params.id}/instructor`);                                                    //Redirect to instructor page
            io.emit('messageHide', req.body);                                                                //Pass the req.body data to front-end for socket.io
            
        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });      
})

//Broadcast message at instructor page
app.get('/:id/instructor/:theMsgID/broadcast', async (req, res) => {
  messageRef.child(req.params.id).child(req.params.theMsgID).once("value", function(snapshot) {             //Find the message
      if(snapshot.val().owner == 'Student'){
        messageRef.child(req.params.id).child(req.params.theMsgID).update({                                 //Update the message textColor, backgroundTextColor & state to visible
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
        messageRef.child(req.params.id).child(req.params.theMsgID).update({                                 //Update the message textColor, backgroundTextColor & state to visible
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

      res.redirect(`/${req.params.id}/instructor`);                                                       //Redirect to instructor page
      io.emit('messageBroadcast', req.body);                                                              //Pass the req.body data to front-end for socket.io
      
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });      
})

//Clear all messages in chat room
app.get('/:id/instructor/clear', async (req, res) => {
  messageRef.child(req.params.id).once("value", function(snapshot) {             //Reading the data of the chat room ID
      messageRef.child(req.params.id).set({                                 //removes all messages except name and datetime of chat room
        name: '',
        dateTime: snapshot.val().dateTime
      });

      res.redirect(`/${req.params.id}/instructor`);                 //Redirect to instructor page to display the empty chat room
      io.emit('messageClear', req.params.id);                       //Pass the req.body data to front-end for socket.io
      io.emit('adminUpdateAfterClearMessages', req.params.id);      //Pass the req.body data to front-end for socket.io
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
})

//Admin page, Displays all chat rooms
app.get('/admin/infinity', async (req, res) => {
  var ChatRmIDArray = [];
  var DateTimeOfLastMsgInEachChatRmArray = [];

  var ChatRmIDWithoutDateTime = [];
  var WithoutDateTimeOfLastMsgInEachChatRmArray = [];

  messageRef.on("value", function(snapshot) {                  //Retrieve all chat rooms
      snapshot.forEach((child) => {                            //Foreach chat room ID
          // ChatRmIDArray.push(child.key)
          var AllDateTimeOfCurrentChatRm = [];
          child.forEach((childchild) => {                      //Foreach attribute in specific chat room ID
              AllDateTimeOfCurrentChatRm.push(childchild.val().dateTime);        //Push datetime of each message to Array, NOT chat room datetime
          });

                                                                                //******So fun******
          if(AllDateTimeOfCurrentChatRm.length > 2){                            //Originally there will be 2 undefined in an Array "[undefined, undefined]" because of dateTime and name attributes
                                                                                //Since dateTime and name of chat room ID and message IDs are child of chat room ID, when childchild.val(), it gets the child child inner values
                                                                                //But dateTime and name of chat room ID does not have inner child child values, only message IDs has inner child child values
                                                                                //Hence, [undefined, undefined] is displayed if no messages (no message ID)
                                                                                //If have message, it gets the message datetime value only (childchild.val().dateTime) and adds to the array together with the undefined dateTime and name of chat room ID inner child child values ['11 August 2020, 15:06:34', undefined, undefined]

                                                                                //So, if AllDateTimeOfCurrentChatRm.length > 2, get the chat room ID and last message dateTime to display at front-end
              ChatRmIDArray.push(child.key)
              DateTimeOfLastMsgInEachChatRmArray.push(AllDateTimeOfCurrentChatRm.slice(-3)[0]);   //['11 August 2020, 15:06:34', undefined, undefined] .slice(-3)[0] means getting the last 3rd data from Array
          }
          else{
                                                                                //Purpose of this is to separate chat rooms with messages and no messages
              ChatRmIDWithoutDateTime.push(child.key);                          //if no message in chat room, get the chat room id and datetime will be '-'
              WithoutDateTimeOfLastMsgInEachChatRmArray.push('-');
          };                                                                    //******So fun******

       });

          var list = [];
          for (var j = 0; j < ChatRmIDArray.length; j++)                                                        //******fun fun******
          list.push({'ChatRmID': ChatRmIDArray[j], 'LastMsgDateTime': DateTimeOfLastMsgInEachChatRmArray[j]}); // Create an array of chat room id and last message date time as a pair
          list.sort(function(a, b) {                                                                           // Sort Array according to oldest to newest last message datetime
              date1 = new Date(a.LastMsgDateTime);                                                             //******fun fun******
              date2 = new Date(b.LastMsgDateTime);
              if (date1 > date2) return 1;
              if (date1 < date2) return -1;
            })

          // list.sort(function(a, b) {
          //     return ((a.LastMsgDateTime < b.LastMsgDateTime) ? -1 : ((a.LastMsgDateTime > b.LastMsgDateTime) ? 1 : 0));
          // });

          for (var k = 0; k < list.length; k++) {                                                               // Split chat room ID and last message datetime pair to their own Array
            ChatRmIDArray[k] = list[k].ChatRmID;
            DateTimeOfLastMsgInEachChatRmArray[k] = list[k].LastMsgDateTime;
          }

          ChatRmIDArray = ChatRmIDArray.concat(ChatRmIDWithoutDateTime);                                        // .concat adds an array's values to an array
          DateTimeOfLastMsgInEachChatRmArray = DateTimeOfLastMsgInEachChatRmArray.concat(WithoutDateTimeOfLastMsgInEachChatRmArray);        //Adding no datetime chat room to have date time chat room array

          // res.render('infinity', { ChatRmIDs: ChatRmIDArray, DateTimeOfLastMsgInEachChatRm: DateTimeOfLastMsgInEachChatRmArray})

        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });

        res.render('infinity', { ChatRmIDs: ChatRmIDArray, DateTimeOfLastMsgInEachChatRm: DateTimeOfLastMsgInEachChatRmArray})                //Pass the Arrays to front-end for display

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

  


  //Clear all chats
  app.post('/admin/infinity', async (req, res) => {
    let chatsToClear = messageRef;                                //Reference to all chat rooms
    chatsToClear.remove();                                        //Delete all chat rooms in database
    req.flash('success_msg', 'Successfully cleared all chats!');
    res.redirect(`/admin/infinity`);                              //Redirected to an Admin page with 0 chat room
    io.emit('adminUpdateAfterClearAllChatRooms');
  })

  //Delete specific chat room
  app.post('/admin/infinity/:ChatRmID/delete', async (req, res) => {
    let specificChatToRemove = messageRef.child(req.params.ChatRmID);                       //Reference to the chat room
    specificChatToRemove.remove()                                                           //Delete the chat room
    req.flash('success_msg', 'Successfully deleted ' + req.params.ChatRmID + ' chat!');
    res.redirect(`/admin/infinity`);                                                         //Redirected to an Admin page without that chat room deleted chat room ID
    io.emit('adminUpdateAfterClearSpecificChatRoom', req.params.ChatRmID);
  })


//Delete chat rooms that are 4 weeks old
  app.post('/admin/infinity/Clear4WeeksAgoChatRms', async (req, res) => {
    var ChatRmIDArray = [];
    var DateTimeOfEachChatRmArray = [];

    var ChatRmIDToEmit = [];

    messageRef.on("value", function(snapshot) {
        snapshot.forEach((child) => {                                     //For each chat room, push chat room ID and chat room datetime to their respective Arrays
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

          for (var j = 0; j < ChatRmIDArray.length; j++){                                                         //Push chat room ID and chat room created datetime to an Array as a pair
            list.push({'ChatRmID': ChatRmIDArray[j], 'ChatRmCreationDateTime': DateTimeOfEachChatRmArray[j]})
          };

          for(x = 0; x < list.length; x++){                                       //Foreach of the chat room creation datetime add 28 days (4 weeks)
            var result = new Date(list[x].ChatRmCreationDateTime);
            result.setDate(result.getDate() + 28);

            if(result < d){                                                       //If added 28 days to datetime result is less than today's datetime, remove it from database
              ChatRmIDToEmit.push(list[x].ChatRmID);
              let specificChatToRemove = messageRef.child(list[x].ChatRmID);
              specificChatToRemove.remove();
            }
          }

          req.flash('success_msg', 'Successfully cleared chat rooms from 4 weeks ago!');
          res.redirect(`/admin/infinity`);                                        //Redirected to an Admin page without that any chat rooms that are 4 weeks old
          io.emit('adminUpdateAfter4WeeksAgoChatRooms', ChatRmIDToEmit);          //Pass the req.body data to front-end for socket.io
  })

  //Instructor reply to student message
  app.post('/:id/instructor/:theMsgID/reply', async (req, res) => {
    var d = new Date();
    var options = { hour12: false };

    var MonthText = getMonthText(d.getMonth());
    var day = d.getDate();
    var Time = d.toLocaleTimeString('en-GB', options);        //Time in 24 hours format

    var newReply = messageRef.child(req.params.id).child(req.params.theMsgID).push({              //Insert new reply to the specific message ID
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

      messageRef.child(req.params.id).child(req.params.theMsgID).once("value", function(snapshot) {             //This is just to get the name of the message that instructor is replying to
          req.body.MsgName = snapshot.val().name;
          res.redirect(`/${req.params.id}/instructor`);
          io.emit('repliesAdded', req.body);                                                                    //Pass the new reply added to front-end
          
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });      
      
  })

//Instructor hides the reply
  app.get('/:id/instructor/:theMsgID/:theReplyID/hideReply', async (req, res) => {
    messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).once("value", function(snapshot) {          //Retrieve the reply selected to hide
        messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).update({                                 //Update the chosen reply to hidden
              name: snapshot.val().name,
              message: snapshot.val().message,
              textColor: 'blue',                  //Since reply is always instructor, the textColor will always be blue to identify it is instructor's when background is grey
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
        io.emit('messageReplyHide', req.body);                      //Pass the reply ID to front-end, so that front-end can identify the reply to hide and change background color to grey
        
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });      
})


//Instructor unhides the reply
app.get('/:id/instructor/:theMsgID/:theReplyID/unhideReply', async (req, res) => {
  messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).once("value", function(snapshot) {          //Retrieve the reply selected to unhide
      messageRef.child(req.params.id).child(req.params.theMsgID).child(req.params.theReplyID).update({                                //Update the chosen reply to visible
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
      io.emit('messageReplyUnhide', req.body);                    //Pass the reply ID to front-end, so that front-end can identify the reply to unhide and change background color to white
      
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });      
})

                                                                  //******So fun, HEEHEE******
io.on('connection', () =>{
  console.log('a user is connected')
})


var server = http.listen(PORT, () => {
  console.log('server is running');
});
