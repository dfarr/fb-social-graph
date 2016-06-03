
var ch = mq.createChannel();

///////////////////////////////////////////////////////////////////////////////
// Command
///////////////////////////////////////////////////////////////////////////////

module.exports = function(req, res) {
        
    var c = req.params.c;
    var d = { user: req.user, data: req.args };

    ch.assertExchange('event', 'topic');

    ch.publish('event', c, new Buffer(JSON.stringify(d)));

    res.json({ ok: true });

};

