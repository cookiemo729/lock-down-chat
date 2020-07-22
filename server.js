var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
const database = require('./config/accessFirebase');
var PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

const messageRef = database.ref('/Messages');

var Message = mongoose.model('Message',{
  name : String,
  message : String
})

// var dbUrl = 'mongodb://amkurian:amkurian1@ds257981.mlab.com:57981/simple-chat'

app.get('/messages', (req, res) => {
  let messageArray = [];
    messageRef.once("value", function(snapshot) {
        snapshot.forEach((child) => {
            messageArray.push(child.val());
          });
        console.log(messageArray);
        res.send(messageArray);
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });

  // Message.find({},(err, messages)=> {
  //   res.send(messages);
  // })
})


// app.get('/messages/:user', (req, res) => {
//   var user = req.params.user
//   Message.find({name: user},(err, messages)=> {
//     res.send(messages);
//   })
// })


app.post('/messages', async (req, res) => {
  try{
    const message_id = messageRef.push().key;
        messageRef.child(message_id).set({
            name: req.body.name,
            message: req.body.message
        });

        io.emit('message', req.body);
        }
        catch (error){
          res.sendStatus(500);
          return console.log('error',error);
        }
        finally{
          console.log('Message Posted')
        }

  // try{
  //   var message = new Message(req.body);

  //   var savedMessage = await message.save()
  //     console.log('saved');

  //   var censored = await Message.findOne({message:'badword'});
  //     if(censored)
  //       await Message.remove({_id: censored.id})
  //     else
  //       io.emit('message', req.body);
  //     res.sendStatus(200);
  // }
  // catch (error){
  //   res.sendStatus(500);
  //   return console.log('error',error);
  // }
  // finally{
  //   console.log('Message Posted')
  // }

})



io.on('connection', () =>{
  console.log('a user is connected')
})

// mongoose.connect(dbUrl ,{useUnifiedTopology: true, useNewUrlParser: true} ,(err) => {
//   console.log('mongodb connected',err);
// })

var server = http.listen(PORT, () => {
  console.log('server is running on port', server.address().port);
});
