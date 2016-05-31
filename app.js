
var glob = require('glob');
var path = require('path');
var async = require('async');
var colors = require('colors');
var express = require('express');
var passport = require('passport');

var amqp = require('amqplib/callback_api');
var Sequelize = require('sequelize');

var app = express();


///////////////////////////////////////////////////////////////////////////////
// Configuration
///////////////////////////////////////////////////////////////////////////////

var session = require('express-session');
var RedisStore = require('connect-redis')(session);

app.use(session({
    secret: 'I am not as think, as you drunk, I am, ossifer.',
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT })
}));


///////////////////////////////////////////////////////////////////////////////
// Middleware
///////////////////////////////////////////////////////////////////////////////

app.use(require('body-parser').json()); 

app.use('/q', require('./src/middleware/param'));
app.use('/c', require('./src/middleware/param'));
app.use('/auth', require('./src/middleware/param'));


///////////////////////////////////////////////////////////////////////////////
// Passport (TESTING ONLY, WILL REMOVE)
///////////////////////////////////////////////////////////////////////////////

app.use(passport.initialize());
app.use(passport.session());

app.use('/test', require('./src/passports/facebook'));


///////////////////////////////////////////////////////////////////////////////
// Controller
///////////////////////////////////////////////////////////////////////////////

app.use('/auth', require('./src/controllers/auth'));


///////////////////////////////////////////////////////////////////////////////
// Bootstrap
///////////////////////////////////////////////////////////////////////////////

async.series([

    ///////////////////////////////////////////////////////////////////////////////
    // Database
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var sequelize = new Sequelize(process.env.POSTGRES);

        glob('./src/models/*.js', function(err, file) {

            file = file || [];

            file
                .map(f => path.join(__dirname, f))
                .forEach(f => sequelize.import(f));

            global.db = sequelize;

            sequelize.sync().then(function() {

                console.log('✓ '.bold.green + 'connected to postgres');
                done();

            }).catch(function(err) {

                console.log('✖ '.bold.red + 'failed to connect to postgres');
                done(err);

            });
        });
    },


    ///////////////////////////////////////////////////////////////////////////////
    // AMQP
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        amqp.connect(process.env.AMQP, function(err, mq) {

            if(err) {
                console.log('✖ '.bold.red + 'failed to connect to rabbitmq');
                return done(err);
            }

            global.mq = mq;

            console.log('✓ '.bold.green + 'connected to rabbitmq');
            done();
        });
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Queries
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var q = require('./src/q');

        global.mq.createChannel(function(err, channel) {

            if(err) {
                console.log('✖ '.bold.red + 'failed to set up queries channel');
                return done(err)
            }

            channel.on('return', function(msg) {
                q.catcher(msg, channel);
            });

            app.all('/q/:q', function(req, res) {
                q.handler(req, res, channel);
            });

            console.log('✓ '.bold.green + 'successfully set up queries channel');
            done();
        });
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Command
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var c = require('./src/c');

        global.mq.createChannel(function(err, channel) {

            if(err) {
                console.log('✖ '.bold.red + 'failed to set up command channel');
                return done(err)
            }

            app.all('/c/:c', function(req, res) {

                res.set('Content-Type', 'application/json');

                res.send('{"ok":true}');

                c.handler(req, res, channel);

            });

            console.log('✓ '.bold.green + 'successfully set up command channel');
            done();
        });
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Logging
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        global.mq.createChannel(function(err, channel) {

            if(err) {
                console.log('✖ '.bold.red + 'failed to set up logging channel');
                return done(err)
            }

            channel.assertExchange('event', 'topic');

            channel.assertQueue('logger');

            channel.bindQueue('logger', 'event', '#');

            channel.consume('logger', function(msg) {

                console.log(msg.properties.timestamp, msg.fields.routingKey, msg.content.toString());

            }, { noAck: true });

            console.log('✓ '.bold.green + 'successfully set up logging channel');
            done();
        });
    }

], function(err) {

    if(err) {
        console.log('✖ '.bold.red + 'failed to bootstrap core');
        console.log(err);

        process.exit(1);
    }

    console.log('✓ '.bold.green + 'successfully bootstraped core, listening on localhost:3000');

});


app.listen(3000);
