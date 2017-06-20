var express = require('express'),
    twit = require('twit'),
    airtable = require('airtable'),
    
    app = express(),
    config = {
      twitter: {
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token: process.env.TWITTER_ACCESS_TOKEN,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
      },
      airtable: {
        apiKey: process.env.AIRTABLE_API_KEY
      }
    },
    
    // Open Twitter stream for user events
    T = new twit(config.twitter),
    stream = T.stream('user'),
    
    // Access specific Airtable bases
    A = new airtable(config.airtable),
    date_ideas_base = A.base('appSe8hUXwsFUpP2E'),
    to_do_list_base = A.base('appZaLWICtpJV51Np');

// Get user's tweet events and DMs
stream.on('tweet', tweetEvent);
stream.on('direct_message', dmEvent);

// When there's a tweet event, send a reply
function tweetEvent(tweet) {
  // Who sent the tweet?
  var name = tweet.user.screen_name;
  // Who is the recipient?
  var reply_to = tweet.in_reply_to_screen_name;
  // What is the text?
  var text = tweet.text;
  // What is the tweet ID?
  var id = tweet.id_str;

  // Check that the tweet isn't its own
  if (name !== 'whattodobot' && reply_to === 'whattodobot') {
    console.log("Received tweet: " + tweet.text);

    chooseDateIdea({callback: postReply, is_private: false});

    function postReply(date) {
      var reply = '@' + name + ' ' + date.idea + ' (' + date.cost + ')';
      T.post('statuses/update', {in_reply_to_status_id: id, status: reply}, checkTweet);
      function checkTweet(err, reply) {
        if (err !== undefined) {
          console.log(err);
        } else {
          console.log('Tweeted: ' + reply.text);
        }
      }
    };
  }
}

function dmEvent(dm) {
  // Who sent the DM?
  var sender_screen_name = dm.direct_message.sender_screen_name;
  // What is the sender's ID?
  var user_id = dm.direct_message.sender_id;
  // What is the text?
  var text = dm.direct_message.text;

  // Check that tweet is from Jackie or Mark
  if (sender_screen_name === 'jackiehluo' ||
      sender_screen_name === 'mhahnenb') {
    console.log("Received DM: " + text);

    chooseDateIdea({callback: sendReply, isPrivate: true});

    function sendReply(date) {
      var reply = date.idea + ' (' + date.cost + ')';

      T.post('direct_messages/new', {user_id: user_id, text: reply}, checkDM);
      function checkDM(err, reply) {
        if (err !== undefined) {
          console.log(err);
        } else {
          console.log('Sent DM: ' + reply.text);
        }
      }
    }
  }
}

// Pull list of date ideas from base and randomly select one
function chooseDateIdea({callback, isPrivate}) {
  var date_ideas = []
  date_ideas_base('Date Ideas').select({
    view: "Grid view"
  }).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      // Check if bot's replying to DM or date is SFW
      if (isPrivate || !record.get('Date')) {
        var date = {}
        date.idea = record.get('Idea');
        date.cost = record.get('Cost');
        date.notes = record.get('Notes');
        date_ideas.push(date)
      }
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();
  }, function done(err) {
    if (err) { console.error(err); return; }
    console.log('Selected a record from Date Ideas');
    var random_date = date_ideas[Math.floor(Math.random() * date_ideas.length)];
    callback(random_date);
  });
}

var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});
