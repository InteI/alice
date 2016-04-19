var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var path = require('path');
var connectDomain = require('connect-domain');
var url = require('url');
var accessConfig = require('./access-config');

var setup = require('./modules/setup');

var jwt = require('jsonwebtoken');

// models
var User = require('./models/user');
var Team = require('./models/team');
var Department = require('./models/department');
var Role = require('./models/role');

var app = express();

if (app.get('env') === 'development') {
  var config = require('./config');
} else {
  var config = require('./config-prod');
}

mongoose.connect(config.database);

process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});

app.use(connectDomain());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
// api secret
app.set('apliceSecret', config.token.secret);

app.use("/", express.static(path.join(__dirname, 'public')));

app.use('/', function(req, res, next) {
  var parsedUrl = url.parse(req.url, true);
  var pathname = parsedUrl.pathname;

  // if (pathname == '/favicon.ico') {
  //   res.json({favicon: empty});
  // } else {
  //   console.log(pathname);
  //   next();
  // }
  next();
});

app.use('/favicon.ico', function(req, res, next) {
  res.json({favicon: 'empty'});
});

if (app.get('env') === 'development') {
  //setup
  app.use('/drop', setup.drop);
  app.use('/setup', setup.init);
  app.get('/check-access-test', setup.checkAccessTest);
}

app.use('/auth', require('./routes/auth'));

//check token
app.use(function(req, res, next) {
  var token = req.body.token || req.param('token') || req.headers['x-access-token'];

  if (token) {
    jwt.verify(token, app.get('apliceSecret'), function(err, decoded) {
      if (err) {
        return res.status(401).json({
          message: 'Failed to authenticate token.'
        });
      } else {
        var parsedUrl = url.parse(req.url, true);
        var pathname = parsedUrl.pathname;
        //console.log('Url' + parsedUrl.pathname);
        //console.log('Query: ' + JSON.stringify(req.params));
        //console.log('Parsed: ' + JSON.stringify(parsedUrl));
        req.decoded = decoded;
        //console.log(req.method);
        req.currentUser = decoded._doc;

        //temp crutch, refactor to access module
        if (pathname == '/api/users' && req.params.id != null) {
          accessConfig['SELF'](req.currentUser, req.params.id);
        } else {
          accessConfig[req.method](req.currentUser);
        }

        next();
      }
    });

  } else {
    return res.status(401).json({
      message: 'Access is denied.'
    });
  }
});

// routes
app.use('/api/users', require('./routes/user'));
app.use('/api/departments', require('./routes/department'));
app.use('/api/teams', require('./routes/team'));
app.use('/api/roles', require('./routes/role'));

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err,
      stack: err.stack
    });
  });
} else {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({message: "Something wrong..."});
  });
}

process.on('uncaughtException', function (err, req, res) {
  console.log('Something wrong...');
});

// start server
app.listen(config.port);
console.log('alice is running on port ' + config.port);
