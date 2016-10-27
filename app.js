var config = require('config');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var ejs = require('ejs');
var logger = require('morgan');
var path = require('path');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var shortID = require('shortid');

var route = require('./routes/route');
var Model = require('./models/model');

var app = express();

passport.use(new LocalStrategy(
    function (username, password, done) {
        new Model.User({username: username}).fetch().then(function (data) {
            var user = data;
            if (user === null) {
                return done(null, false, {message: 'Invalid username or password'});
            } else {
                user = data.toJSON();
                if (!bcrypt.compareSync(password, user.password)) {
                    return done(null, false, {message: 'Invalid username or password'});
                } else {
                    console.log(user);
                    return done(null, user);
                }
            }
        });
    }
));

passport.use(new FacebookStrategy(
    config.get('facebook'),
    function(accessToken, refreshToken, profile, done) {
        new Model.User({fb_profileID: profile.id}).fetch().then(function(data){
            var user = data;
            if (user === null) {
                new Model.User({
                    username: shortID.generate(),
                    password: bcrypt.hashSync(shortID.generate()),
                    email: profile._json.email,
                    first_name: profile._json.first_name,
                    last_name: profile._json.last_name,
                    fb_profileID: profile._json.id,
                    fb_token: accessToken
                }).save().then(function(model){
                    user = model.toJSON();
                    return done(null, user);
                });
            } else {
                user = data.toJSON();
                if(accessToken == user.fb_token) {
                    return done(null, false, {message: 'Invalid username or password'});
                } else {
                    return done(null, user);
                }
            }
        });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.username);
});

passport.deserializeUser(function (username, done) {
    new Model.User({username: username}).fetch().then(function (user) {
        done(null, user);
    });
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
    secret: 'thisissecretkey',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));


/**
 * Routes
 */

app.get('/', route.index);

app.get('/profile', route.profile);
app.post('/profile', route.profileSave);

app.get('/signin', route.signIn);
app.post('/signin', route.signInPost);

app.get('/signup', route.signUp);
app.post('/signup', route.signUpPost);

app.get('/signout', route.signOut);

app.get('/webhooks', route.webhooks);
app.post('/webhooks', route.webhooksPost);

app.get('/auth/facebook', route.facebookAuth);
app.get('/auth/facebook/return', route.facebookAuthReturn);

app.get('/authorize', route.authorize);

app.get('/privacy', route.privacy);

app.use(route.notFound404);

module.exports = app;