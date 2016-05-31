
var express = require('express');

var router = express.Router();


router.all('/', function(req, res) {

    var User = db.models.user;

    User.create({ fbID: req.args.id, name: req.args.name, token: req.args.token })
        .then(user => {

            console.log(user);
            res.send('created');

        })
        .catch(err => {

            console.log(err);
            res.send('failed');

        });

});


module.exports = router;