
var uuid = require('node-uuid');
var amqp = require('amqplib/callback_api');

module.exports = {

    handler: function(req, res, channel) {

        var c = req.params.c;
        var d = { user: req.user, data: req.args };

        channel.assertExchange('event', 'topic');

        channel.publish('event', c, new Buffer(JSON.stringify(d)), { timestamp: Date.now() });

    }

};
