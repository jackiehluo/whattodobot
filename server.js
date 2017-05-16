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

// Get user's tweet events
stream.on('tweet', tweetEvent);

// When there's a tweet event, send a reply
function tweetEvent(tweet) {
  console.log("Received: " + tweet.text);
  // Who is the recipient?
  var reply_to = tweet.in_reply_to_screen_name;
  // Who sent the tweet?
  var name = tweet.user.screen_name;
  // What is the text?
  var text = tweet.text;
  // What is the tweet ID?
  var id = tweet.id_str;

  // Check that the tweet isn't its own
  if (reply_to === 'whattodobot' && name !== 'whattodobot') {
    chooseDateIdea(postReply);

    function postReply(date) {
      var reply = '@' + name + ' ' + date.idea + ' (' + date.cost + ')';
      T.post('statuses/update', {in_reply_to_status_id: id, status: reply}, checkTweet);
      function checkTweet(err, reply) {
        if (err !== undefined) {
          console.log(err);
        } else {
          console.log('Tweeted: ' + reply);
        }
      }
    };
  }
}

// Pull list of date ideas from base and randomly select one
function chooseDateIdea(postReply) {
  var date_ideas = []
  date_ideas_base('Date Ideas').select({
    view: "Grid view"
  }).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
      var date = {}
      date.idea = record.get('Idea');
      date.cost = record.get('Cost');
      date.notes = record.get('Notes');
      date_ideas.push(date)
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();
  }, function done(err) {
    if (err) { console.error(err); return; }
    console.log('Selected a record from Date Ideas');
    var random_date = date_ideas[Math.floor(Math.random() * date_ideas.length)];
    postReply(random_date);
  });
}

var listener = app.listen(process.env.PORT, function () {
  console.log('Your bot is running on port ' + listener.address().port);
});
