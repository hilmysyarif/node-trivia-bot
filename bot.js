'use strict'

var irc = require('irc'),
    config = require('./config'),
    fs = require('fs');

var bot = new irc.Client(config.server, config.botname,
                         {channels: config.channels});

var channels = [];
// I originally didn't want to make the questions global
// but decided storing 76k+ lines in seperate objects sounded
// like a bad idea.
var questions = loadQuestions();

bot.addListener('error', function(err){
    console.log(err);
});

bot.addListener('join', function(channel, nick, message){
    console.log(channel + " " + nick);
});

bot.addListener('message', function(from, to, message){
    var curChannelObj = currentChannel(to);
    commandCheck(curChannelObj,parseMessage(message));

    if(curChannelObj.active == true){
        curChannelObj.checkAnswer.call(curChannelObj, message, from);   
    }

    curChannelObj.resetAFK.call(curChannelObj);
});

bot.addListener('part', function(channel, nick, message){
    console.log(channel + " " + nick);    
});

//  Names seems to only get run when the bot joins a new channel
bot.addListener('names', function(channel, nicks){
    var users = [];
    for(var nick in nicks){
        users.push(nick);
    }
    channels.push(new NewChannel(channel, users));
});

function commandCheck(channel, message){
    for(var command in channel.commands){
        if(command == message[0]){
            channel.commands[message[0]].call(channel, message[1]);
        }
    }
}

function currentChannel(channel){
    for(var i = 0; i < channels.length; i++){
       if(channel === channels[i].channel){
           return channels[i];
       }
    }
    throw new Error('Channel not found');
}

//  For irc messages
function parseMessage(message){
    var components = message.split(" ");
    return components;
}


function NewChannel(channel, nicks){
    this.channel = channel;
    this.current = 0;
    this.countDown = null;
    this.activeTimer = null;
    this.active = false;
    this.afk = 1;
    this.timeout = 45; 
    this.nicks = nicks;
    this.commands = {"!help":this.help, "!start":this.start, "!end":this.endGame, 
                     "!setTimeout":this.setTime, "!setAFK":this.setAFK, "!scores":null,
                     "!showAFK":this.showAFK, "!showTime":this.showTime};
}

NewChannel.prototype = 
{
    help: function(){
        bot.say(this.channel, "Type: "
                + colorText("cyan", "!start") + " to start a new game ; "
                + colorText("cyan", "!end") + " to end the current game ; "
                + colorText("cyan", "!shuffle") + " to shuffle the questions ; "
                + colorText("cyan", "!setTimeout") + " to set the time for each question ; "
                + colorText("cyan", "!setAFK") + " to set afk timeout ; "
                + colorText("cyan", "!showTime") + " to show time per question ; "
                + colorText("cyan", "!showAFK") + " to show afk timeout");
    },

    start: function(){
        this.active = true;
        questions = shuffle(questions);
        this.activeTimer = this.setActiveTimer();
        bot.say(this.channel, colorText("light_green","New game started!") + " Get ready...");
        this.newQuestion.call(this);
    },

    endGame: function(extra){
        if (this.active == false)
            return ;

        //Check for additional text before game end message
        extra = (extra == undefined) ? "" : extra;

        this.active = false;
        clearTimeout(this.countDown);
        clearTimeout(this.activeTimer);
        bot.say(this.channel, extra
                + "Game ended. The correct answer was: "
                + colorText("cyan", this.getAnswer())
                + ".  High scores coming whenever I feel like it.");
    },

    newQuestion: function(){
        this.current++;
        //  Set question answer timer
        clearTimeout(this.countDown);
        this.countDown = this.setTimer();
        //  Check if out of questions
        if(this.getQuestion() === undefined){
            this.current = 0;
        }
        else
            bot.say(this.channel, this.getQuestion());
        console.log(this.getAnswer());
    },

    showTime: function(){
      bot.say(this.channel, "The current time per question is: " 
                          + colorText("cyan", this.timeout)
                          + "sec");
    },

    showAFK: function(){
      bot.say(this.channel, "The current afk timeout is: "
                          + colorText("cyan", this.afk)
                          + "min");
    },
    
    setTime: function(time){
        if(!isNumber(time))
          bot.say(this.channel, "Please enter a number");
        else{
          this.timeout = time;
          bot.say(this.channel, "Timeout set to: " 
                + colorText("light_green", this.timeout)); 
        }
    },

    setAFK: function(time){
        if(!isNumber(time))
          bot.say(this.channel, "Please enter a number");
        else{
          this.afk = time;
          bot.say(this.channel, "AFK timer set to: "
                  + colorText("light_green", this.afk));
        }
    },

    setTimer: function(){
        //  Time in seconds
        return setTimeout(function(){
            bot.say(this.channel, "The answer was: "
                    + colorText("magenta", this.getAnswer(questions, this.current)));
            this.newQuestion();
        }.bind(this), this.timeout * 1000);
    },

    setActiveTimer: function(){
        //  Time in minutes
        return setTimeout(function(){
            this.endGame("No one playing? ");
            console.log("afk end");
        }.bind(this), this.afk * 60 * 1000);
    },

    getAnswer: function(){
        return questions[this.current].split("`")[1];
    },

    getQuestion: function(){
        return questions[this.current].split("`")[0];
    },

    checkAnswer: function(message, user){
        if(message.toLowerCase() == this.getAnswer.call(this)){
            bot.say(this.channel, colorText("light_green", user)
                                 + " got it right!");
            this.newQuestion.call(this);
        }
    },

    resetAFK: function(){
      if(this.active){
        clearTimeout(this.activeTimer);
        this.activeTimer = this.setActiveTimer();
      }
    }

}

function colorText(color, text){
  return irc.colors.wrap(color, text);
}

function isNumber(input){
  if(typeof parseInt(input) === 'number' && input !== undefined)
    return true;
  return false;
}

function shuffle(o){
   for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
   return o;  
}

function loadQuestions(){
   console.log("Loading new question set....");
   fs.readFile(__dirname + config.questions, 'utf8', function(err, data){
      if(err)
          throw err;

      console.log("Questions loaded");
      questions = shuffle(data.split('\n'));
   });
}
