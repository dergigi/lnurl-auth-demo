const express = require('express');
const LnurlAuth = require('../index');
const passport = require('passport');
const session = require('express-session');

const app = express();

const config = {
	host: process.env.HOST || 'localhost',
	port: process.env.PORT || 3000,
	url: process.env.URL || null,
};

if (!config.url) {
	config.url = 'http://' + config.host + ':' + config.port;
}

app.set("view engine", "pug");
app.use(session({
	secret: '12345',
	resave: true,
	saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

const map = {
	user: new Map(),
};

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	done(null, map.user.get(id) || null);
});

passport.use(new LnurlAuth.Strategy(function(linkingPublicKey, done) {
	let user = map.user.get(linkingPublicKey);
	if (!user) {
		user = { id: linkingPublicKey };
		map.user.set(linkingPublicKey, user);
	}
	done(null, user);
}));

app.use(passport.authenticate('lnurl-auth'));

app.get('/', function(req, res) {
	if (!req.user) {
		// return res.send('You are not authenticated. To login go <a href="/login">here</a>.');
		return res.render('index', { title: 'Login with Lightning!' })
		// return
		// return res.redirect('/login');
	}
	console.log(req.user)
	// res.send('Logged-in as ' + req.user.id);
	res.render('authenticated', { title: 'Logged in', userid: req.user.id })
});

app.get('/login',
	function(req, res, next) {
		if (req.user) {
			// Already authenticated.
			return res.redirect('/');
		}
		next();
	},
	new LnurlAuth.Middleware({
		callbackUrl: 'https://lnurl-auth-demo.herokuapp.com/login',
		cancelUrl: config.url
	})
);

const server = app.listen(config.port, config.host, function() {
	console.log('Server listening at ' + config.url);
});

process.on('uncaughtException', error => {
	console.error(error);
});

process.on('beforeExit', code => {
	try {
		server.close();
	} catch (error) {
		console.error(error);
	}
	process.exit(code);
});
