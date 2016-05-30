
var uuid = require('node-uuid');
var amqp = require('amqplib/callback_api');

module.exports = {

    catcher: function(msg, channel) {
        channel.sendToQueue(msg.properties.replyTo, new Buffer('{"code":404,"text":"Not Found"}'), { headers: { code: 404 } });
    },

    handler: function(req, res, channel) {

        var queue = uuid.v4();

        res.set('Content-Type', 'application/json');

        channel.assertQueue(queue, { exclusive: true, autoDelete: true });

        channel.consume(queue, function(msg) {

            var code = msg.properties.headers.code;
            var json = msg.content.toString();

            channel.cancel(msg.fields.consumerTag);

            res.status(code || 200).send(json);

        }, { noAck : true });


        var c = req.params.c;
        var d = { user: req.user, data: req.args };

        channel.assertExchange('event', 'topic');

        channel.publish('event', c, new Buffer(JSON.stringify(d)), { mandatory: true, replyTo: queue, timestamp: Date.now() });

    }

};
