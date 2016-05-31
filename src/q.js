
var uuid = require('node-uuid');
var amqp = require('amqplib/callback_api');

module.exports = {

    catcher: function(msg) {
        mq.sendToQueue(msg.properties.replyTo, new Buffer('{"code":404,"text":"Not Found"}'), { headers: { code: 404 } });
    },

    handler: function(req, res) {

        var queue = uuid.v4();

        mq.assertQueue(queue, { exclusive: true, autoDelete: true });

        mq.consume(queue, function(msg) {

            var code = msg.properties.headers.code;
            var json = msg.content.toString();

            mq.cancel(msg.fields.consumerTag);

            res.status(code || 200).send(json);

        }, { noAck : true });


        var q = 'q.' + req.params.q;
        var d = { user: req.user, data: req.args };

        mq.sendToQueue(q, new Buffer(JSON.stringify(d)), { mandatory: true, replyTo: queue });
    }

};
