
var uuid = require('node-uuid');
var amqp = require('amqplib/callback_api');

module.exports = {

    handler: function(req, res) {

        var c = req.params.c;
        var d = { user: req.user, data: req.args };

        mq.assertExchange('event', 'topic');

        mq.publish('event', c, new Buffer(JSON.stringify(d)));

        res.json({ ok: true })

    }

};
