
var merge = require('merge');
var express = require('express');

var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;


///////////////////////////////////////////////////////////////////////////////
// Passport
///////////////////////////////////////////////////////////////////////////////

passport.use(new Strategy({

    clientID: process.env.FB_CLIENT,
    clientSecret: process.env.FB_SECRET,
    callbackURL: 'http://localhost:3000/test/auth/facebook/callback'

}, function(accessToken, refreshToken, profile, done) {

    done(null, merge(profile._json, { token: accessToken }));

}));


///////////////////////////////////////////////////////////////////////////////
// Serializer
///////////////////////////////////////////////////////////////////////////////

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});


///////////////////////////////////////////////////////////////////////////////
// Routes
///////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/auth/facebook',
    passport.authenticate('facebook'));

router.get('/auth/facebook/callback', 
    passport.authenticate('facebook'),
    function(req, res) {
        res.redirect('/auth?id=' + req.user.id + '&name=' + req.user.name + '&token=' + req.user.token);
    });


module.exports = router;
