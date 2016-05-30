
var colors = require('colors');
var express = require('express');
var amqp = require('amqplib/callback_api');

var app = express();


///////////////////////////////////////////////////////////////////////////////
// Middleware
///////////////////////////////////////////////////////////////////////////////

app.use('/q', require('body-parser').json());
app.use('/c', require('body-parser').json());

app.use('/q', require('./src/middleware/param'));
app.use('/c', require('./src/middleware/param'));


///////////////////////////////////////////////////////////////////////////////
// AMQP
///////////////////////////////////////////////////////////////////////////////

amqp.connect(process.env.AMQP, function(err, mq) {

    if(err) {
        console.log('✖ '.bold.red + 'failed to connect to rabbitmq');
        process.exit(1);
    }

    console.log('✓ '.bold.green + 'connected to rabbitmq');


    ///////////////////////////////////////////////////////////////////////////////
    // Queries
    ///////////////////////////////////////////////////////////////////////////////

    var q = require('./src/q');

    mq.createChannel(function(err, channel) {

        channel.on('return', function(msg) {
            q.catcher(msg, channel);
        });

        app.all('/q/:q', function(req, res) {
            q.handler(req, res, channel);
        });

    });


    ///////////////////////////////////////////////////////////////////////////////
    // Command
    ///////////////////////////////////////////////////////////////////////////////

    var c = require('./src/c');

    mq.createChannel(function(err, channel) {

        app.all('/c/:c', function(req, res) {

            res.set('Content-Type', 'application/json');

            res.send('{"ok":true}');

            c.handler(req, res, channel);

        });

    });


    ///////////////////////////////////////////////////////////////////////////////
    // Logging
    ///////////////////////////////////////////////////////////////////////////////

    mq.createChannel(function(err, channel) {

        channel.assertExchange('event', 'topic');

        channel.assertQueue('logger');

        channel.bindQueue('logger', 'event', '#');

        channel.consume('logger', function(msg) {

            console.log(msg.properties.timestamp, msg.fields.routingKey, msg.content.toString());

        }, { noAck: true });

    });


});


app.listen(3000);
