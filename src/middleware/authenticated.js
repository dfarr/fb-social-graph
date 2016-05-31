
var jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {

    var token = req.args.access_token || req.headers['x-access-token'];

    jwt.verify(token, 'SECRET', function(err, user) {

        if(err) {
            return res.status(403).json({ ok: false });
        }

        req.user = user;

        next();

    });

};