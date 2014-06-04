var irc = require('irc'),
    config = require("./config"),
    fs = require('fs');

var bot = new irc.Client(config.server, config.botname, 
                        {channels : config.channels});

var questions = [];
var current = 0;
var currentTime = new Date().getTime();
var currentChannel = config.channels[0];
var interval;

loadQuestions();


bot.addListener('message', function(from, to, message){
   //Check if game has been activated
   if(questions[current] !== undefined  && config.active === true){
    //checks for correct answer
    if(message.toLowerCase() === questions[current].split("`")[1].toLowerCase()){
       
        bot.say(currentChannel, from + " guessed correct!");
        clearInterval(interval);
        newQuestion();
     }
    }
    //look for commands
    commands(message, from);
});

function newQuestion(){
   current++ ;
   currentTime = new Date().getTime();
   clearInterval(interval);
   interval = setTimeout();
   bot.say(currentChannel, "The next question is: ");
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

function setTimeout(){
    return setInterval(function(){
            bot.say(currentChannel, "Too slow! The answer was: " + questions[current].split("`")[1]);
            newQuestion();
            clearInterval(interval);}, config.timeout * 1000);
}

//Function that id's the bots possible commands
function commands(message, from){
       var res = message.split(" ");

       if("!start" === res[0] && config.active === false){
           config.active = true;
           questions = shuffle(questions);
           bot.say(currentChannel, "New game started! Get ready...");
           bot.say(currentChannel, "The first question is: ");
           setTimeout();
           bot.say(currentChannel, questions[current].split("`")[0]);
           currentTime = new Date().getTime();

       }else if("!end" === res[0] && config.active === true){
            bot.say(currentChannel, "Game ended. High scores coming whenever I feel like it.");
            bot.say(currentChannel, "This game's winner is: ");
            config.active = false;

       }else if("!help" === res[0]){
            bot.say(currentChannel, "Type: !start to start a new game ; !end to end the current game ; !shuffle to shuffle the questions");    

       }else if("!shuffle" === res[0]){
            questions = shuffle(questions);
            bot.say(currentChannel, "Questions shuffled");    
       }
}


bot.addListener('error', function(error){
    console.log(error);    
});
