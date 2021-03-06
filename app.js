var express         = require('express');
var exphbs          = require('express-handlebars');
var path            = require('path');
var favicon         = require('serve-favicon');
var logger          = require('morgan');
var cookieParser    = require('cookie-parser');
var session         = require('express-session');
var bodyParser      = require('body-parser');
var _               = require('lodash');
var moment          = require('moment');
var currencyFormatter = require('currency-formatter');

var routes = require('./routes/index');
var inventory = require('./routes/inventory');
var login = require('./routes/login');

var app = express();

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: require("./public/javascripts/helpers.js")
}));
app.set('view engine', 'handlebars');
//app.set('view options', { layout: 'inventory' });

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'Cermat123Hebat',
    resave: false,
    saveUninitialized: true
}));

app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});

app.use('/', routes);
app.use('/inventory', inventory);
app.use('/portal-auth', login);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
