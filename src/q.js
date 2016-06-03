
var ch = mq.createChannel();

ch.on('return', function(msg) {
    ch.sendToQueue(msg.properties.replyTo, new Buffer('{"code":404,"text":"Not Found"}'), { headers: { code: 404 } });
});


///////////////////////////////////////////////////////////////////////////////
// Queries
///////////////////////////////////////////////////////////////////////////////

module.exports = function(req, res) {

    // TODO: think about queue (and message) TTL

    ch.assertQueue('', { exclusive: true, autoDelete: true }, function(err, queue) {

        ch.consume(queue.queue, function(msg) {

            var code = msg.properties.headers.code;
            var json = msg.content.toString();

            res.status(code || 200).send(json);

            ch.cancel(msg.fields.consumerTag);

        }, { noAck: true });

        var q = 'q.' + req.params.q;
        var d = { user: req.user, data: req.args };

        ch.sendToQueue(q, new Buffer(JSON.stringify(d)), { mandatory: true, replyTo: queue.queue });
    });

};
