const express = require('express');
const router = express.Router();
const database = require('../config/accessFirebase');
const messageRef = database.ref('/Messages');


router.get('/admin/infinity', async (req, res) => {
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
         DateTimeOfLastMsgInEachChatRmArray.sort();
         console.log(DateTimeOfLastMsgInEachChatRmArray)
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

         res.render('infinity', { ChatRmIDs: ChatRmIDArray, DateTimeOfLastMsgInEachChatRm: DateTimeOfLastMsgInEachChatRmArray})

      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });

    })
  
  router.post('/admin/infinity', async (req, res) => {
    let chatsToClear = messageRef;
    chatsToClear.remove();
    req.flash('success_msg', 'Successfully cleared all chats!');
    res.redirect(`/admin/infinity`);
  })

  router.post('/admin/infinity/:ChatRmID/delete', async (req, res) => {
    let specificChatToRemove = messageRef.child(req.params.ChatRmID);
    specificChatToRemove.remove()
    req.flash('success_msg', 'Successfully deleted ' + req.params.ChatRmID + ' chat!');
    res.redirect(`/admin/infinity`);
  })

  module.exports = router;