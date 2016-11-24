var express         = require('express');
var exphbs          = require('express-handlebars');
var path            = require('path');
var favicon         = require('serve-favicon');
var logger          = require('morgan');
var cookieParser    = require('cookie-parser');
var session         = require('express-session');
var RedisStore      = require('connect-redis')(express);
var bodyParser      = require('body-parser');
var _               = require('lodash');
var currencyFormatter = require('currency-formatter');

var routes = require('./routes/index');
var inventory = require('./routes/inventory');
var login = require('./routes/login');

var app = express();
var currentHost = "1.1.1.254";

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    helpers: {
        numbyIndex: function (index) {
            var parse = "";
            parse = parseInt(index) + 1;

            return parse;
        },

        parseStatus: function (status) {
            var parse = "";
            switch (status) {
                case 'SendingOK':
                    parse = "Success";
                    break;
                case 'SendingOKNoReport':
                    parse = "Success";
                    break;
                case 'SendingError':
                    parse = "Failed";
                    break;
                case 'DeliveryOK':
                    parse = "Failed";
                    break;
                case 'DeliveryFailed':
                    parse = "Failed";
                    break;
                case 'DeliveryPending':
                    parse = "Failed";
                    break;
                case 'DeliveryUnknown':
                    parse = "Success";
                    break;
                case 'Error':
                    parse = "Failed";
                    break;
                default:
                    parse = "status error";
                    break;
            }

            return parse;
        },

        joinTextOutbox: function(textOutbox, textOutboxMultipart) {
            var joinText = "";
            if(textOutboxMultipart) {
                joinText = textOutbox + "" + textOutboxMultipart;
            }else{
                joinText = textOutbox;
            }
            return joinText;
        },
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },

        joinText: function(a, b){
            return a+" ("+b+")";
        },

        parseUntuk: function(untuk){
            var parse = "";
            if (untuk == '1'){
                parse = "Kedoya";
            }else if (untuk == '2') {
                parse = "Biak"
            }else{
                parse = "Other"
            }
            return parse;
        },

        sums: function(a, b){
            return currencyFormatter.format(_.sumBy(a, b), { code: 'IDR' });
        }
    }
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
app.use(express.session({
    store: new RedisStore({
        host: currentHost,
        port: 3000,
        db: 1,
        pass: 'RedisC3rmat'
    }),
    secret: 'Cermat123Hebat'
}));

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
