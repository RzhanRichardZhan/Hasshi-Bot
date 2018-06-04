var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var request = require('request');
var parseString = require('xml2js').parseString;
var Promise = require('bluebird');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
// keys
var GoogleKey = auth.GoogleKey;
var cx = auth.cx;
var uri = auth.uri;

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
		token: auth.token,
		autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
});


function is_airing(s){
		return s.substring(5,10) == '00-00'; 
}

var download = function(uri, filename, callback){
		request.head(uri, function(err, res, body){
				request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
		});
};

const help_error = " Type `?help` for help.";

bot.on('message', message => {
		// Don't read messages from bots
		if (message.author.bot) return;
		// If prompted by the '?'
		if (message.content.substring(0, 1) == '?'){
				// Split on new lines or spaces
				var args = message.content.substring(1).split(/[ \n]+/);
				var cmd = args[0];
				args = args.splice(1);
				var max_index = 15;

				if (args.indexOf('--all') != -1){
						args.splice(args.indexOf('--all'));
						max_index = -1;
				}

				if (cmd == "help"){
						message.channel.send("Hello! I am Hasshi-Bot.\nhttps://github.com/RzhanRichardZhan/Hasshi-Bot/blob/master/README.md");
				}
				else if (cmd == ''){
				}
				else if (cmd == 'lewd'){
						var lewd = 'lewd\n'.repeat(50);
						message.channel.send(lewd);
				}
				else if (cmd == 'write' && args[0]=='quiz'){
						if (message.channel.type == 'dm'){
								var paragraph = message.content.split('\n').splice(1);
								var answer_index = paragraph.findIndex(function(s){return s == '?answer';});

								if (answer_index == -1 || answer_index == 0 || answer_index == paragraph.length - 1){
										message.channel.send("Please specify a question and answer."+help_error);
								} else {
										var question = paragraph.splice(0,answer_index).join("\n");
										var answer = paragraph.splice(1).join("\n");
										MongoClient.connect(uri, function(err, cli){
												var db = cli.db("hasshi");
												db.collection("quiz").insertOne({
														question : question,
														answer : answer
												}, function(err, res){
														if (res){
																message.channel.send("Quiz code: "+res.insertedId);
														}
												});

										});
								}
								

						} else{
								message.channel.send("Did you mean to DM this?"+help_error);
						}
				}
				else if (cmd == 'quiz'){
						if (args.length == 0){
								message.channel.send("Please specify a quiz code."+help_error);
						} else {
								MongoClient.connect(uri, function(err,cli){
										var db = cli.db("hasshi");
										db.collection("quiz").findOne({_id:ObjectId(args[0])}, function(err, res){
												if (res){
														message.channel.send(res.question);
												} else{
														message.channel.send("Quiz not found."+help_error);
												}
										}); 
								}); 
						} 
				}
				else if (cmd == 'answer'){
						if (args.length == 0){
								message.channel.send("Please specify a quiz code."+help_error); 
						} else if (message.channel.type != 'dm'){
								message.channel.send("Did you mean to DM this?"+help_error);
						} else {
								MongoClient.connect(uri, function(err,cli){
										var db = cli.db("hasshi");
										db.collection("quiz").findOne({_id:ObjectId(args[0])}, function(err, res){
												if (res){
														message.channel.send(res.answer);
												} else{
														message.channel.send("Quiz not found."+help_error);
												}
										}); 
								}); 
						}

				}
				else if (cmd == 'postEmote'){
						if (!message.author.id in auth.users){
								message.channel.send("Access Denied");
						}
						else if (args.length == 0){
								message.channel.send("Please specify an emote name." + help_error); 
						} else if (message.attachments.array().length == 0) {
								message.channel.send("Please provide an image." + help_error);
						} else {
								const emoteFile = message.attachments.first();
								const fileName = args[0] + '.png';
								download(emoteFile.url, `./emotes/${fileName}`, function(){
										message.channel.send("Success!");
								});
						}
				}
				else if (cmd == 'emote'){
						if (args.length == 0){
								message.channel.send("Please specify an emote name." + help_error);
						} else {
								const fileName = './emotes/'+ args[0] + '.png';
								message.channel.send({
										files: [{
												attachment: fileName,
												name: args[0] + '.png'
										}]
								})
								.catch(e => {
										message.channel.send("Invalid emote!");
								});
						} 
				}
				else if (cmd == 'emoteList'){
						let allNames = "";
						fs.readdir('./emotes/', (err, files) => {
								if (files.length > 1000){
										message.channel.send("TOO MANY EMOTES D:");
										return;
								}
								files.forEach(file => {
										allNames += file.substring(0, file.length - 4) + '\n';
								});
								message.channel.send(allNames);
						
						});
				}
				else if (cmd == 'imas'){
						// get a random page (may exclude really old ones)
						page = Math.round(Math.random() * 10000);
						if (args.includes("new")){
								page = 0;
						}
						request.get("https://safebooru.org/index.php?limit=1&s=post&page=dapi&q=index&pid="+page+"&tags=idolmaster+-cleavage+-breasts+-swimsuit+-comic+-official_art", function(err,res,body){
								if (err){
										message.channel.send("A Safebooru related error has occured. Tell Richard or Safebooru they suck.");
								} else{
										imglink = body.match("safebooru.org\/images\/[^\"]*\"");
										imglink = "http://"+imglink[0].slice(0,-1);
										if (body.search("shimamura_uzuki") == -1){
												message.channel.send({files: [imglink]}).catch(function(error){
														message.channel.send("File too big! Sorry about that; try again");
												});
										}
										else{
												message.channel.send("Congrats! You got an Uzuki!",{files:[imglink]}).catch(function(error){
														message.channel.send("File too big! Sorry about that; try again");
												});
										}
								}
								
						});
				}
				else if (cmd == 'seiyuu'){
						if (args.length == 0){
								message.channel.send("Please specify a seiyuu."+help_error);
						} else{
								request.get("https://www.googleapis.com/customsearch/v1?key="+GoogleKey +"&cx="+cx+"&q="+args.join("%20"), function(err,res,body){
										if (err){
												message.channel.send("A Google related error has occured. Hasshi-bot cannot handle over 100 requests in a day.\nEither way, tell Richard or Google they sucks.\n");
										} else {
												var data = JSON.parse(body);
												if ("items" in data && data.items[0].link.search("https:\/\/myanimelist.net\/people\/[0-9]*\/[^\/]") != -1){
														var url = data.items[0].link;
														request.get(url, function(err, res,body){
																if (err){ console.log(err); }
																else{
																		var data = body.split("\n").splice(200);

																		var first = true;
																		var results = "";
																		var anime = "";
																		var anime_index = 0;
																		var character_list = [];
																		Promise.each(data, function(item, i){
																				if (results.length > 1500){
																						message.channel.send(results);
																						results = "";
																				}
																				anime_index = item.match("<a href=\"https:\/\/myanimelist\.net\/anime\/[0-9]*\/[^\"]*\">[^<]*<\/a>");
																				if (anime_index != null){
																						anime = anime_index[0];
																						first = true;
																						thisline = anime.substring(anime.search(">")+1, anime.search("<\/a>"));
																						character = data[i+2];
																						character = character.match("<a href=\"https:\/\/myanimelist\.net\/character\/[0-9]*\/[^\"]*\">[^<]*<\/a>");
																						if (character != null && (data[i+2].search("Main") != -1 || max_index == -1)){
																								character = character[0];
																								nextline = character.substring(character.search(">") + 1, character.search("<\/a>"));
																								if (!character_list.includes(nextline)){
																										if (data[i+2].search("Main") != -1){
																												results += thisline + ": **"+nextline+"**\n";
																										} else{
																												results += thisline + ": " + nextline + "\n";
																										} 
																										character_list.push(nextline);
																								}
																						}
																						
																				}

																		}).then(function(){
																				if (results.length > 2000){
																						message.channel.send("Too many roles for Hasshi-bot to handle!");
																				} else {
																						message.channel.send(results);
																				}
																		}, function(err){
																				message.channel.send("Too many roles for Hasshi-bot to handle!");
																		});
																}
																
																message.channel.send(url);
														});
												} else{
														message.channel.send("Seiyuu not found."+help_error);
												}
										}
								});
						}
				}
				else if (cmd == 'cast'){
						if (args.length == 0){
								message.channel.send("Please specify an anime title."+help_error);
						} else{
								request.get("https://www.googleapis.com/customsearch/v1?key="+GoogleKey +"&cx="+cx+"&q="+args.join("%20"), function(err,res,body){
										if (err){
												message.channel.send("A Google related error has occured. Hasshi-bot cannot handle over 100 requests in a day.\nEither way, tell Richard or Google they sucks.\n"); 
										} else{
												var data = JSON.parse(body);
												if ("items" in data && data.items[0].link.search("https:\/\/myanimelist.net\/anime\/[0-9]*\/[^\/]") != -1){
														var url = data.items[0].link + "/characters";
														request.get(url, function(err,res,body){
																if (err){
																		console.log(err);
																} else{
																		var data = body.split("\n").splice(300);
																		var first = true;
																		var results = "";
																		var character = "";
																		var character_index = 0; 
																		if (args.includes('all')){
																				max_index = -1;
																		}
																		Promise.each(data, function(item, i){
																				if (results.length > 1500){
																						message.channel.send(results);
																						results = "";
																				}
																				character_index = item.search("https:\/\/myanimelist\.net\/character\/[0-9]*\/[a-zA-Z_]*\">");
																				if (character_index != -1){
																						if (max_index == 0){
																								throw {code:"success"};
																						}
																						first = true;
																						thisline = item.substring(item.search(">")+1, item.search("<\/a>"));
																						if (data[i+2].search("Main") != -1){
																								thisline = "**"+thisline+"**";
																						}
																						results += "\n"+ thisline + ":"; 
																						max_index -= 1;
																				}

																				actor_index = item.search("https:\/\/myanimelist.net\/people\/[0-9]*\/[a-zA-Z_]*\">");
																				is_jap = data[i+1].search("Japanese");
																				if (actor_index != -1 && is_jap != -1){
																						thisline = item.substring(item.search(">")+1, item.search("<\/a>"));
																						if (!first){
																								results += " | " + thisline;
																						} else{
																								results += " " + thisline;
																								first = false;
																						} 
																				}

																				if (item.search("<a name=\"staff\"><\/a>") != -1){
																						throw {code:"success"};
																				}
																				

																		}).then(function(){
																				console.log(results);
																		}, function(err){
																				if (results.length > 2000){
																						message.channel.send("Too many roles for Hasshi-bot to handle!");
																				} else {
																						message.channel.send(results);
																				}
																				
																		});
																}

														});
														message.channel.send(url);
														
												} else{
														message.channel.send("Anime not found."+help_error);														
												}
										} 
								});

						}
				}
				else{
						message.channel.send("Sorry, I didn't understand that."+help_error); 
				}
		}
		else if (message.content.substring(0, 1) == '!' && message != '!') {
				message.channel.send("This feature doesn't work anymore :(");
				return;
				var args = message.content.substring(1).split(' ');
				var cmd = args[0];
				
				args = args.splice(1);
				
				var username = cmd;
				var preusers = {
						"richard" : "duberjzerak",
						"michael" : "AnimeFeng",
						"john" : "nevergarden",
						"mark" : "Miujinshi"
				};
				
				if (cmd in preusers){
						username = preusers[cmd];
				}

				var url = "https://myanimelist.net/malappinfo.php?u="+username+"&status=all&type=anime";
				request.get(url, function(err,res,body){
						if (err){
								message.channel.send("A MAL related error has occured. Tell Richard or MAL he sucks.");
						}
						else{
								if (body != '<?xml version="1.0" encoding="UTF-8" ?><myanimelist></myanimelist>'){
										parseString(body, function(error, result){
												if (error){
														message.channel.send("An XML related error. Tell Richard he sucks.");
												}
												else{
														var list = result.myanimelist.anime;
														var finalmessage = "";
														Promise.each(list, function(item, i){
																if (item.my_status[0] == '1' && (!args.includes('airing') || is_airing(item.series_end[0])) && (!args.includes('nonairing') || !is_airing(item.series_end[0]))){
																		finalmessage += "__**"+item.series_title[0] + "**__\nScore: " + item.my_score[0] + " Episodes: " + item.my_watched_episodes[0] + "/" + item.series_episodes[0] + "\n";
																		if (args.includes('link')){
																				finalmessage += "<https://myanimelist.net/anime/"+item.series_animedb_id[0]+">\n";
																		}
																}
														}).then(function(){
																if (finalmessage.length != 0)
																		message.channel.send(finalmessage);
																else
																		message.channel.send("None!");
														}, function(error){});
												}
										});
								} else{
										message.channel.send("Invalid command or not valid username."+help_error);
								}
						}
				}
									 );

				
		} else if (message.content.substring(0, 4) == '❤ #e'){
				message.channel.send("<3");
		} else if (message.content.substring().toLowerCase() == "let's go" || message.content.substring().toLowerCase() == "lets go"){
				message.channel.send("L E T S G O");
		} else if (message.content.substring().toLowerCase() == 'da'){
				message.delete();
				message.channel.send("да");
		} 
});

bot.login(auth.token);
