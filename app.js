
var glob = require('glob');
var path = require('path');
var async = require('async');
var merge = require('merge');
var colors = require('colors');
var express = require('express');
var passport = require('passport');

var amqp = require('amqplib/callback_api');
var Sequelize = require('sequelize');

var app = express();


///////////////////////////////////////////////////////////////////////////////
// Configuration (REMOVE)
///////////////////////////////////////////////////////////////////////////////

// var session = require('express-session');
// var RedisStore = require('connect-redis')(session);

// app.use(session({
//     secret: 'I am not as think, as you drunk, I am, ossifer.',
//     resave: false,
//     saveUninitialized: false,
//     store: new RedisStore({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT })
// }));


///////////////////////////////////////////////////////////////////////////////
// Middleware
///////////////////////////////////////////////////////////////////////////////

app.use(require('body-parser').json()); 

app.use('/auth', require('./src/middleware/param'));

app.use('/q', require('./src/middleware/param'));
app.use('/c', require('./src/middleware/param'));

// app.use('/q', require('./src/middleware/authenticated'));
// app.use('/c', require('./src/middleware/authenticated'));


///////////////////////////////////////////////////////////////////////////////
// Passport (TESTING ONLY, WILL REMOVE)
///////////////////////////////////////////////////////////////////////////////

app.use(passport.initialize());
app.use(passport.session());

app.use('/test', require('./src/passports/facebook'));


///////////////////////////////////////////////////////////////////////////////
// Controller
///////////////////////////////////////////////////////////////////////////////

app.use('/auth', require('./src/controllers/auth'));


///////////////////////////////////////////////////////////////////////////////
// Bootstrap
///////////////////////////////////////////////////////////////////////////////

async.series([

    ///////////////////////////////////////////////////////////////////////////////
    // Database (MOVE TO WORKER)
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var sequelize = new Sequelize(process.env.POSTGRES);

        glob('./src/models/*.js', function(err, file) {

            file = file || [];

            file
                .map(f => path.join(__dirname, f))
                .forEach(f => sequelize.import(f));

            global.db = sequelize;

            sequelize.sync().then(function() {

                console.log('✓ '.bold.green + 'connected to postgres');
                done();

            }).catch(function(err) {

                console.log('✖ '.bold.red + 'failed to connect to postgres');
                done(err);

            });
        });
    },


    ///////////////////////////////////////////////////////////////////////////////
    // AMQP
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        amqp.connect(process.env.AMQP, function(err, mq) {

            if(err) {
                console.log('✖ '.bold.red + 'failed to connect to rabbitmq');
                return done(err);
            }

            mq.createChannel(function(err, channel) {

                if(err) {
                    console.log('✖ '.bold.red + 'failed to connect to rabbitmq');
                    return done(err);
                }

                var publish = channel.publish;

                channel.publish = function(ex, rk, cnt, opt) {

                    opt = merge(opt || {}, { timestamp: Date.now() });

                    return publish.call(this, ex, rk, cnt, opt);

                };

                global.mq = channel;

                console.log('✓ '.bold.green + 'connected to rabbitmq');
                done();
            });
        });
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Queries
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var q = require('./src/q');

        mq.on('return', q.catcher); // ???

        app.all('/q/:q', q.handler);

        console.log('✓ '.bold.green + 'successfully set up queries');
        done();
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Command
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        var c = require('./src/c');

        app.all('/c/:c', c.handler);

        console.log('✓ '.bold.green + 'successfully set up command');
        done();
    },


    ///////////////////////////////////////////////////////////////////////////////
    // Logging
    ///////////////////////////////////////////////////////////////////////////////

    function(done) {

        mq.assertExchange('event', 'topic');

        mq.assertQueue('logger');

        mq.bindQueue('logger', 'event', '#');

        mq.consume('logger', function(msg) {

            console.log(msg.properties.timestamp, msg.fields.routingKey, msg.content.toString());

        }, { noAck: true });

        console.log('✓ '.bold.green + 'successfully set up logging');
        done();
    }

], function(err) {

    if(err) {
        console.log('✖ '.bold.red + 'failed to bootstrap core');
        console.log(err);

        process.exit(1);
    }

    console.log('✓ '.bold.green + 'successfully bootstraped core, listening on localhost:3000');

});


app.listen(3000);
