var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var validator = require('validator');

var http = require("http");

var Model = require('../models/model');

var index = function (req, res, next) {
    if (!req.isAuthenticated()) {
        res.redirect('/signin');
    } else {

        var user = req.user;

        if (user !== undefined) {
            user = user.toJSON();
        }

        res.render('index', {title: 'Home', user: user});
    }
};

var profile = function (req, res, next) {
    if (!req.isAuthenticated()) {
        res.redirect('/signin');
    } else {
        var user = req.user;

        if (user !== undefined) {
            user = user.toJSON();
        }
        res.render('profile', {title: 'Profile', user: user});
    }
};

var profileSave = function (req, res, next) {
    if (!req.isAuthenticated()) {
        res.redirect('/signin');
    } else {
        var user = req.user;

        if (req.body.saveprofile == 'save') {

            var attrs = {};
            if (req.body.firstname){
                attrs.first_name = req.body.firstname;
            }
            if (req.body.lastname) {
                attrs.last_name = req.body.lastname;
            }
            if (req.body.email) {
                attrs.email = req.body.email;
            }

            var profileSaveUser = new Model.User({ID: user.id})
                .save(attrs)
                .then(function () {
                    var profileUser = new Model.User({ID: user.id}).fetch();
                    profileUser.then(function(model){
                        res.render('profile', {title: 'Profile', user: model.toJSON()});
                    });
                });
        }
    }
};

var signIn = function (req, res, next) {
    if (req.isAuthenticated()) res.redirect('/');
    res.render('signin', {title: 'Sign In'});
};

var signInPost = function (req, res, next) {
    passport.authenticate('local', {successRedirect: '/', failureRedirect: '/signin'}, function (err, user, info) {
        if (err) {
            return res.render('signin', {title: 'Sign In', errorMessage: err.message});
        }

        if (!user) {
            return res.render('signin', {title: 'Sign In', errorMessage: info.message});
        }
        return req.logIn(user, function (err) {
            if (err) {
                return res.render('signin', {title: 'Sign In', errorMessage: err.message});
            } else {
                return res.redirect('/');
            }
        });
    })(req, res, next);
};

var signUp = function (req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        res.render('signup', {title: 'Sign Up'});
    }
};

var signUpPost = function (req, res, next) {
    var user = req.body;
    var usernamePromise = null;
    usernamePromise = new Model.User({username: user.username}).fetch();
    return usernamePromise.then(function (model) {
        if (model) {
            res.render('signup', {title: 'signup', errorMessage: 'username already exists'});
        } else {
            var password = user.password;
            var hash = bcrypt.hashSync(password);

            var signUpUser = new Model.User({username: user.username, password: hash});
            signUpUser.save().then(function (model) {
                signInPost(req, res, next);
            });
        }
    });
};

var signOut = function (req, res, next) {
    if (!req.isAuthenticated()) {
        notFound404(req, res, next);
    } else {
        req.logout();
        res.redirect('/signin');
    }
};

var notFound404 = function (req, res, next) {
    res.status(404);
    res.render('404', {title: '404 Not Found'});
};

var webhooks = function(req, res, next) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === 'fingerprint_is_my_password') {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
};

var webhooksPost = function(req, res, next) {
    var data = req.body;
    console.log('Start');

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {

                if (messagingEvent.optin) {
                    console.log('Optin');
                    //receivedAuthentication(messagingEvent);

                } else if (messagingEvent.message) {
                    //console.log('Message');
                    receivedMessage(messagingEvent);

                } else if (messagingEvent.delivery) {
                    console.log('Delivery');
                    //receivedDeliveryConfirmation(messagingEvent);

                } else if (messagingEvent.postback) {
                    console.log('Postback');
                    //receivedPostback(messagingEvent);

                } else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
};

function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {

        // If we receive a text message, check to see if it matches any special
        // keywords and send back the corresponding example. Otherwise, just echo
        // the text we received.
        switch (messageText) {
            case 'image':
                sendImageMessage(senderID);
                break;

            case 'button':
                sendButtonMessage(senderID);
                break;

            case 'generic':
                sendGenericMessage(senderID);
                break;

            case 'receipt':
                sendReceiptMessage(senderID);
                break;

            default:
                sendTextMessage(senderID, messageText);
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    http.request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: 'EAAZALRceOxIYBAMrEFxa1LiRZAZB9ZBNLm7BqH2cNREkuUoXxZBi0D3oZBT59eVajmSpRCgTbnqa7WgKGe4VCZBTu1VYs2LQCj9RwY8iFQeOxMShHIYrZAWiZCoW4sT8qgyNGfVb4ae5jx0THx5BPuhUQExXyUfenQ3rUAVhOZAcZBGOAZDZD' },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        /*if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log("Successfully sent generic message with id %s to recipient %s",
                messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }*/
    });
}


module.exports.index = index;

module.exports.profile = profile;
module.exports.profileSave = profileSave;

module.exports.signIn = signIn;
module.exports.signInPost = signInPost;

module.exports.signUp = signUp;
module.exports.signUpPost = signUpPost;

module.exports.signOut = signOut;

module.exports.notFound404 = notFound404;

module.exports.webhooks = webhooks;
module.exports.webhooksPost = webhooksPost;