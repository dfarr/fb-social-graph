
var fbgraph = require('fbgraph');
var jwt = require('jsonwebtoken');
var express = require('express');

var ch = mq.createChannel();
var router = express.Router();


///////////////////////////////////////////////////////////////////////////////
// Authenticate
///////////////////////////////////////////////////////////////////////////////

router.use('/auth', require('../middleware/param'));

router.all('/auth', function(req, res) {

    var urls = [
        '/me',
        '/me/friends',
        '/debug_token?input_token=' + req.args.access_token
    ];

    urls = urls.map(url => ({ relative_url: url }));

    fbgraph
        .setAccessToken(req.args.access_token)
        .batch(urls, function(err, data) {

            if(err) {
                return res.status(403).json({ ok: false });
            }

            var fail = data.some(d => d.code !== 200);
            var body = data.map(d => JSON.parse(d.body));

            var user = body[0];
            var frnd = body[1];
            var appl = body[2];

            if(fail) {
                return res.status(403).json({ ok: false });
            }

            if(appl.data.app_id !== process.env.FB_CLIENT) {
                return res.status(403).json({ ok: false });
            }

            frnd.data
                .map(data => new Buffer(JSON.stringify({ user: user, data: data })))
                .forEach(buffer => ch.publish('event', 'user.friend', buffer));

            var token = jwt.sign(user, 'SECRET', { expiresIn: '7d' });

            res.json({ ok: true, token: token });

        });

});

module.exports = router;
