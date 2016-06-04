
var ch = mq.createChannel();

var timeout = function(queue) {
    ch.sendToQueue(queue, new Buffer('{"code":504,"text":"Timeout"}'), { headers: { code: 504 } });
};

var noroute = function(msg) {
    ch.sendToQueue(msg.properties.replyTo, new Buffer('{"code":404,"text":"Not Found"}'), { headers: { code: 404 } });
};

ch.on('return', noroute);


///////////////////////////////////////////////////////////////////////////////
// Queries
///////////////////////////////////////////////////////////////////////////////

module.exports = function(req, res) {

    ch.assertQueue('', { durable: false, exclusive: true, autoDelete: true }, function(err, queue) {

        ch.consume(queue.queue, function(msg) {

            var code = msg.properties.headers.code;
            var json = msg.content.toString();

            ch.cancel(msg.fields.consumerTag);

            if(!res.headersSent) {
                res.status(code || 200).send(json);
            }

        }, { noAck: true });

        var q = 'q.' + req.params.q;
        var d = { user: req.user, data: req.args };

        ch.sendToQueue(q, new Buffer(JSON.stringify(d)), { mandatory: true, replyTo: queue.queue });

        setTimeout(() => timeout(queue.queue), 30000);
    });

};
