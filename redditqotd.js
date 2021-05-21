import Axios from 'axios'
import Discord from "discord.js"
import cron from 'cron'
import Filter from 'bad-words'

import dotenv from 'dotenv'

const client = new Discord.Client();
const filter = new Filter();
filter.addWords('Reddit', 'reddit', 'redditor', 'karma', 'subreddit', 'repost'); // Since we're stealing questions from r/AskReddit, filter out some reddit-related words
dotenv.config();
const BOT_TOKEN = process.env.TOKEN;

const GetMessageIDs = (msg) => {
    let channelid = msg.channel.id;
    let guildid = msg.channel.guild.id;
    return [channelid, guildid]
}


async function GetAndSendQuestion() {
    const TOP_POST_API = "https://www.reddit.com/r/askreddit/top.json";
    // TODO: Error catching
    let post = await Axios.get(TOP_POST_API);
    let question;
    let profanity = true;
    let i = 0;
    // See if the top 25 posts are profane free, and get the first one
    while (profanity || i > 25) {
        question = "**QOTD: " + post.data.data.children[i].data.title + "**";
        profanity = filter.isProfane(question);
        //console.log(profanity);
        i++;
    }
    // If, for some reason, the top 25 results ALL have profanity, try the top 100 posts
    if (profanity) {
        while (profanity || i > 100) {
            post = await Axios.get(TOP_POST_API + "?limit=100");
            question = "**QOTD: " + post.data.data.children[i].data.title + "**";
            profanity = filter.isProfane(question);
            i++;
        }
    }
    // If the top 100 posts ALL have profanity, throw a general error
    if (profanity) {
        question = "404 Question not found. Please make your own QOTD this time, sorry!";
    }

    // TODO: Randomize between non-profane questions? So people who commonly use Reddit will see a relatively new question?

    for (let [currentChannelid, currentGuildid] of channelIdlist) {
        client.channels.cache.get(currentChannelid).send(question);
    }
}

// idList will hold every channel-guild id key-value pair
let channelIdlist = new Map();

// Schedule a message
// 0 0 9 * * * means 9:00 AM exactly
let testJob = new cron.CronJob('0 0 9 * * *', () => {
    console.log("Sending QOTD");
    GetAndSendQuestion();
}, null, true, 'America/Los_Angeles');

testJob.start();

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
})

// Control the sending of messages
client.on("message", msg => {
    // Starting the Bot
    if (msg.content === "!qotd_start") {
        msg.reply("Starting QOTD!");
        let [channelid, guildid] = GetMessageIDs(msg);
        channelIdlist.set(channelid, guildid);
    }

    if (msg.content === "!qotd_test"){
        // Remove later since this command sends to every channel on the list
        GetAndSendQuestion();
    }

    // Joke Test
    if (msg.content === "!qotd_testing"){
        // Remove later since this command sends to every channel on the list
        for (let [currentChannelid, currentGuildid] of channelIdlist) {
            client.channels.cache.get(currentChannelid).send("Critical Error. Please code me better next time.");
        }
        setTimeout(() => {
            for (let [currentChannelid, currentGuildid] of channelIdlist) {
                client.channels.cache.get(currentChannelid).send("I'm just kidding. Here's your question of the day");
            }
            GetAndSendQuestion();
        }, 10000);
        
    }
    
    // Remove scheduled QOTD from current channel
    if (msg.content ==="!qotd_stop") {
        msg.reply("Stopping QOTD in this channel... D:");
        // Remove the channel id from the array of ids
        channelIdlist.delete(msg.channel.id);
    }

    // Instantly Generating another question
    if (msg.content === "!qotd_newq") {
        msg.reply("Getting new QOTD!");
        console.log("New Question here") // TODO: Trigger API call here to get the next top post?
    }
})

client.login(BOT_TOKEN);