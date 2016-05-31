
var fbgraph = require('fbgraph');
var jwt = require('jsonwebtoken');
var express = require('express');

var router = express.Router();


///////////////////////////////////////////////////////////////////////////////
// Authenticate
///////////////////////////////////////////////////////////////////////////////

router.all('/', function(req, res) {

    fbgraph
        .setAccessToken(req.args.access_token)
        .get('/me', function(err, user) {

            if(err) {
                return res.status(403).json({ ok: false });
            }

            var token = jwt.sign(user, 'SECRET', { expiresIn: '7d' });

            res.json({ ok: true, token: token });


            ///////////////////////////////////////////////////////////////////////////////
            // Connect friends
            ///////////////////////////////////////////////////////////////////////////////

            fbgraph
                .setAccessToken(req.args.access_token)
                .get('/me/friends', function(err, friends) {

                    if(!err) {

                        friends.data
                            .map(fb => fb.id)
                            .map(id => new Buffer(JSON.stringify({ user: user, data: { id: id } })))
                            .forEach(buffer => mq.publish('event', 'user.friend', buffer));

                    }

                });

        });

});

module.exports = router;
