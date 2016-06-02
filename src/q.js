
var uuid = require('node-uuid');

var ch = mq.createChannel();

ch.on('return', function(msg) {
    ch.sendToQueue(msg.properties.replyTo, new Buffer('{"code":404,"text":"Not Found"}'), { headers: { code: 404 } });
}); 


///////////////////////////////////////////////////////////////////////////////
// Queries
///////////////////////////////////////////////////////////////////////////////

module.exports = function(req, res) {

    ch.assertQueue('q.handler', { exclusive: true });

    ch.consume('q.handler', function(msg) {

        var code = msg.properties.headers.code;
        var json = msg.content.toString();

        // ch.cancel(msg.fields.consumerTag);

        res.status(code || 200).send(json);

    }, { noAck : true });


    var q = 'q.' + req.params.q;
    var d = { user: req.user, data: req.args };

    ch.sendToQueue(q, new Buffer(JSON.stringify(d)), { mandatory: true, replyTo: 'q.handler' });

};
