
var uuid = require('node-uuid');
var merge = require('merge');
var async = require('async');
var colors = require('colors');
var express = require('express');

var amqp = require('amqplib/callback_api');

var app = express();


///////////////////////////////////////////////////////////////////////////////
// Middleware
///////////////////////////////////////////////////////////////////////////////

app.use('/api', require('body-parser').json());

app.use('/api', function(req, res, next) {

    req.args = merge(req.body, req.query);
    next();

});


///////////////////////////////////////////////////////////////////////////////
// API
///////////////////////////////////////////////////////////////////////////////

amqp.connect(process.env.AMQP, function(err, mq) {

    if(err) {
        console.log('✖ '.bold.red + 'failed to connect to rabbitmq');
        process.exit(1);
    }

    console.log('✓ '.bold.green + 'connected to rabbitmq');


    mq.createChannel(function(err, channel) {

        channel.on('return', function(msg) {
            channel.sendToQueue(msg.properties.replyTo, new Buffer('{"code":404,"text":"Not Found"}'), { headers: { code: 404 } });
        });

        app.all('/api/:obj/:fun', function(req, res) {

            res.set('Content-Type', 'application/json');

            var queue = uuid.v4();

            channel.assertQueue(queue, { exclusive: true, autoDelete: true });

            channel.consume(queue, function(msg) {

                var code = msg.properties.headers.code;
                var json = msg.content.toString();

                channel.cancel(msg.fields.consumerTag);

                res.status(code || 200).send(json);

            }, { noAck : true });


            var q = req.params.obj;
            var d = { name: req.params.fun, user: { uuid : 'd874a1f4-b296-4068-95bc-00c0fdb650e7' }, data: req.args }

            channel.sendToQueue(q, new Buffer(JSON.stringify(d)), { mandatory: true, replyTo: queue });

        });

    });

});


app.listen(3000);
