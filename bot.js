var irc = require('irc'),
    config = require("./config"),
    fs = require('fs');

var bot = new irc.Client(config.server, config.botname, 
                        {channels : config.channels});

var questions = [];
var current = 0;
var currentUsers = [];
var currentTime = new Date().getTime();
var currentChannel = config.channels[0];
var timeout;

loadQuestions();


bot.addListener('message', function(from, to, message){
   //Check if game has been activated
   if(questions[current] !== undefined  && config.active === true){
    //checks for correct answer
    if(message.toLowerCase() === questions[current].split("`")[1].toLowerCase()){
       
        bot.say(currentChannel, irc.colors.wrap("light_green",from) + " guessed correct!");
        clearTimeout(timeout);
        newQuestion();
     }
    }
    //look for commands
    commands(message, from);
});

function newQuestion(){
   current++ ;
   clearTimeout(timeout);
   timeout = setTimer();
   bot.say(currentChannel, questions[current].split("`")[0]);
   console.log(questions[current].split("`")[1]);
   
   //checks for end of questions
   if(questions[current] === undefined){
    bot.say(currentChannel, "You have somehow answered all 50k questions! Now go outside and get a life");    
    config.active = false;
   } 
}

function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function loadQuestions(){
    console.log("Loading questions...");
    fs.readdir(__dirname + config.questions,  function(err, files){
        if (err) throw err;

        var c = files.length;
        var quesData = {};


        files.forEach(function(file){
            fs.readFile(__dirname + config.questions + file, 'utf8', function(err, data){
                if(err) throw err;
                quesData[file] = data;
                c--;
                if(c <= 0){
                    console.log("Questions loaded");
                    questions = parseQuestions(quesData);
                }
            });   
        });
    }); 

}

function parseQuestions(data){
    var result = '';
    for(i in data){
        result += data[i];
    }
    return result.split('\n');
}

function writeScores(){
    
}

function setTimer(){
    return setTimeout(function(){
            bot.say(currentChannel, "Too slow! The answer was: " + irc.colors.wrap("magenta", questions[current].split("`")[1]));
            newQuestion();}, config.timeout * 1000);
}

//Function that id's the bots possible commands
function commands(message, from){
       var res = message.split(" ");

       if("!start" === res[0] && config.active === false){
           config.active = true;
           questions = shuffle(questions);
           bot.say(currentChannel, irc.colors.wrap("light_green","New game started!") + " Get ready...");
           newQuestion(); 
           currentTime = new Date().getTime();

       }else if("!end" === res[0] && config.active === true){
            bot.say(currentChannel, "Game ended. The correct answer was: " 
                                    + irc.colors.wrap("cyan",questions[current].split("`")[1])
                                    + ".  High scores coming whenever I feel like it.");
            config.active = false;
            clearTimeout(timeout);

       }else if("!help" === res[0]){
            bot.say(currentChannel, "Type: " 
                                  + irc.colors.wrap("cyan", "!start") + " to start a new game ; " 
                                  + irc.colors.wrap("cyan", "!end") + " to end the current game ; "
                                  + irc.colors.wrap("cyan", "!shuffle") + " to shuffle the questions ; "
                                  + irc.colors.wrap("cyan", "!setTimeout") + " to set the time for each question");    

       }else if("!shuffle" === res[0]){
            questions = shuffle(questions);
            bot.say(currentChannel, " Questions shuffled");    
       }else if("!setTimeout" === res[0]){
            if(isNaN(parseInt(res[1])) ){
                bot.say(currentChannel, "Please enter the time in seconds");
            }
            else{
                config.timeout = parseInt(res[1]);
                bot.say(currentChannel, "Timeout set to: " + irc.colors.wrap("cyan",config.timeout));
            }
       }
}


bot.addListener('error', function(error){
    console.log(error);    
});

bot.addListener('join', function(channel, nick, message){
    currentUsers.push(nick);
    console.log(nick);
});
bot.addListener('names', function(channel, nicks){
    nicks = JSON.stringify(nicks);
    console.log(nicks);
});

bot.addListener('part', function(channel, nick, message){
   console.log(nick); 
});
