
var glob = require('glob');
var path = require('path');
var async = require('async');
var merge = require('merge');
var colors = require('colors');
var express = require('express');
var passport = require('passport');

var app = express();


///////////////////////////////////////////////////////////////////////////////
// Middleware
///////////////////////////////////////////////////////////////////////////////

app.use(require('body-parser').json()); 

app.use('/q', require('./src/middleware/param'));
app.use('/c', require('./src/middleware/param'));

app.use('/q', require('./src/middleware/authenticated'));
app.use('/c', require('./src/middleware/authenticated'));


///////////////////////////////////////////////////////////////////////////////
// Passport (TESTING ONLY, WILL REMOVE)
///////////////////////////////////////////////////////////////////////////////

app.use(passport.initialize());
app.use(passport.session());

app.use('/test', require('./src/passports/facebook'));


///////////////////////////////////////////////////////////////////////////////
// Bootstrap
///////////////////////////////////////////////////////////////////////////////

async.series([


    ///////////////////////////////////////////////////////////////////////////////
    // AMQP
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var amqp = require('amqplib/callback_api');

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
    // Controller
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        app.use('/auth', require('./src/controllers/auth'));

        console.log('✓ '.bold.green + 'imported controllers');
        done();
    },

    ///////////////////////////////////////////////////////////////////////////////
    // Queries
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        app.all('/q/:q', require('./src/q'));

        console.log('✓ '.bold.green + 'successfully set up queries');
        done();
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Command
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        app.all('/c/:c', require('./src/c'));

        console.log('✓ '.bold.green + 'successfully set up command');
        done();
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Logging (TODO: make this a microservice)
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var ch = mq.createChannel();

        ch.assertExchange('event', 'topic');

        ch.assertQueue('logs');

        ch.bindQueue('logs', 'event', '#');

        ch.consume('logs', function(msg) {

            console.log(msg.properties.timestamp, msg.fields.routingKey, msg.content.toString());

        }, { noAck: true });

        console.log('✓ '.bold.green + 'successfully set up logging');
        done();
    }

], function(err) {

    if(err) {
        console.log('✖ '.bold.red + 'failed to bootstrap core');
        console.log(err);

        process.exit(1);
    }

    var server = app.listen(3000, function() {

        console.log('successfully bootstraped core, listening on http://%s:%s', server.address().address, server.address().port);

    });

});
