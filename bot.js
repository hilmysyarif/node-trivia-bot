'use strict'

var irc = require('irc'),
    config = require('./config'),
    fs = require('fs');

var bot = new irc.Client(config.server, config.botname,
                         {channels: config.channels});

var channels = [];
var questions = loadQuestions();

//  Start of event listeners
bot.addListener('error', function(err){
    console.log(err);
});

bot.addListener('join', function(channel, nick, message){
    console.log(channel + " " + nick);
});

bot.addListener('message', function(from, to, message){
    commandCheck(channelCheck(to),parseMessage(message));
});

bot.addListener('part', function(channel, nick, message){
    console.log(channel + " " + nick);    
});

//  Names seems to only get run when the bot joins a new channel
bot.addListener('names', function(channel, nicks){
    //add channel users to list
    var users = [];
    for(var nick in nicks){
        users.push(nick);
    }
    channels.push(new NewChannel(channel, users));
});
//  End of event listeners

function commandCheck(channel, message){
    for(var command in channel.commands){
        if(command == message[0]){
            channel.commands[message[0]].call(channel, message[1]);
        }
    }
}

function channelCheck(channel){
    for(var i = 0; i < channels.length; i++){
       console.log(channels[i].channel);
       if(channel === channels[i].channel){
           return channels[i];
       }
    }
    throw new Error('Channel not found');
}

//  Parses the irc channel messages
function parseMessage(message){
    var components = message.split(" ");
    return components;
}


// Game handling
function NewChannel(channel, nicks){
    this.channel = channel;
    this.current = 0;
    this.countDown = null;
    this.activeTimer = null;
    this.active = false;
    this.afk = 1;
    this.timeout = 45; 
    this.nicks = nicks;
    this.commands = {"!help":this.help, "!start":this.start, "!end":this.endGame, "!setTimeout":this.setTime, "!setAFK":this.setAFK, "!scores":null};
}

NewChannel.prototype = 
{
    help: function(){
        bot.say(this.channel, "Type: "
                + irc.colors.wrap("cyan", "!start") + " to start a new game ; "
                + irc.colors.wrap("cyan", "!end") + " to end the current game ; "
                + irc.colors.wrap("cyan", "!shuffle") + " to shuffle the questions ; "
                + irc.colors.wrap("cyan", "!setTimeout") + " to set the time for each question ; "
                + irc.colors.wrap("cyan", "!setAFK") + " to set afk timeout");
    },

    start: function(){
        this.active = true;
        questions = shuffle(questions);
        this.activeTimer = this.setActiveTimer();
        bot.say(this.channel, irc.colors.wrap("light_green","New game started!") + " Get ready...");
        this.newQuestion();
    },

    endGame: function(extra){
        //check if game is active
        if (this.active == false)
            return ;
        //Check for additional text before game end message
        extra = (extra == undefined) ? "" : extra;
        this.active = false;
        console.log(this.countDown);
        clearTimeout(this.countDown);
        clearTimeout(this.activeTimer);
        bot.say(this.channel, extra
                + "Game ended. The correct answer was: "
                + irc.colors.wrap("cyan", this.getAnswer())
                + ".  High scores coming whenever I feel like it.");
    },

    newQuestion: function(){
        this.current++;
        //  Set question answer timer
        clearTimeout(this.countDown);
        this.setTimer();
        //  Check if out of questions
        if(this.getQuestion() === undefined){
            this.current = 0;
        }
        else
            bot.say(this.channel, this.getQuestion());
    },
    
    setTime: function(time){
        this.timeout = time;
        //Time in seconds
        bot.say(this.channel, "Timeout set to: " 
                + irc.colors.wrap("light_green", this.timeout)); 
    },

    setAFK: function(time){
        this.afk = time;
        //Time in minutes
        bot.say(this.channel, "AFK timer set to: "
                + irc.colors.wrap("light_green", this.afk));
    },

    setTimer: function(){
        return setTimeout(function(){
            bot.say(this.channel, "The answer was: "
                    + irc.colors.wrap("magenta", this.getAnswer(questions, this.current)));
            this.newQuestion();
        }.bind(this), this.timeout * 1000);
    },

    setActiveTimer: function(){
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
    }

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
