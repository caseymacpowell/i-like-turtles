// Require modules
var express = require('express');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var secrets = require("./secrets.js");

// global db connection
// We can get away with this being global because we don't start the server listening until we've set the value of this in the mongo connect callback.
var db;

// Connect to mongo (make sure mongo is running!)
mongodb.MongoClient.connect('mongodb://localhost', function(err, database) {
	if (err) {
		console.log(err);
		return;
	}
	console.log("Connected to Database");
	db = database;

	// now, start the server.
	startListening();
});

// Create express app
var app = express();

// Add req.body to each POST request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

// Add req.session to every request
app.use(expressSession({
	secret: secrets.secret, // SECRET! Don't push to github
	resave: false,
	saveUninitialized: true
}));

// Get all turtles
app.get('/api/turtles', function(req, res) {
	// Check if logged in
	if (!req.session.user) {
		res.status(403);
		res.send("forbidden");
		return;
	}
	// return all turtles as a JSON array.
	db.collection('turtles').find({}).toArray(function(err, data){
		if (err) {
			console.log(err);
			res.status(500);
			res.send("error");
			return;
		}
		res.send(data);
	});
});

// Post a new turtle
app.post('/api/newTurtle', function(req, res) {
	// todo: validate input
	// check if logged in
	if (!req.session.user) {
		res.status(403);
		res.send("forbidden");
		return;
	}

	// Add new turtle
	db.collection('turtles').insertOne({
		name: req.body.name,
		color: req.body.color,
		weapon: req.body.weapon,
		pizzas: parseInt(req.body.pizzas),
		submitter: req.session.user._id
	}, function(err, data) {
		if (err) {
			console.log(err);
			res.status(500);
			res.send('Error inserting new turtle');
			return;
		}
		res.send(data);
	});
});

	// Delete a turtle
	app.post('/api/deleteTurtle', function(req, res){

		if(!req.session.user){
			res.status(403);
			res.send("forbidden");
			return;
		}

		db.collection('turtles').deleteOne({
			_id: ObjectID(req.body._id)
		}, function(err, data){
			if(err){
				console.log(err);
				res.status(500);
				res.send('Error deleting turtle');
				return;
			}
			res.send(data);
		});
	});

//Buy pizza for a turtle
	app.post('/api/buyPizza', function(req, res){

		if(!req.session.user){
			res.status(403);
			res.send("forbidden");
			return;
		}
		console.log(req.body);

		db.collection('turtles').updateOne({
			_id: ObjectID(req.body._id)
		}, {
			$inc : {
				pizzas: 1
			}
		}, function(err, result){
			if(err){
				console.log(err);
			}
			res.send(result);
		});
	});

// Post to login
app.post('/api/login', function(req, res) {
	// Check to see if a user with the given username, password exists
	db.collection('users').findOne({
		username: req.body.username,
		password: req.body.password
	}, function(err, data) {
		// It's not an error to not find a user, we just get null data
		if (data === null) {
			res.send("error");
			return;
		}
		// Otherwise, associate this cookie (session) with this user (object)
		req.session.user = {
			_id : data._id,
			username: data.username
		};
		res.send("success");
	});
});

// Register a new user
app.post('/api/register', function(req, res) {
	// todo validate input
	db.collection('users').insertOne({
		username: req.body.username,
		password: req.body.password //todo: hash this
	}, function(err, data) {
		if (err) {
			console.log(err);
			res.status(500);
			res.send('Error inserting new user');
			return;
		}
		// We could also log the user in here, or we can make them submit a login post also (the latter is what we are doing now)
		res.send(data);
	});
});

// serve files out of the static public folder (e.g. index.html)
app.use(express.static('public'));

// 404 boilerplate
app.use(function(req, res, next) {
	res.status(404);
	res.send("File Not Found! Turtles are Sad 🐢");
});

// 500 boilerplate
app.use(function(err, req, res, next) {
	console.log(err);
	res.status(500);
	res.send("Internal Server Error! Turtles are Angry 🐢");
	res.send(err);
});

// start listening (but only after we've connected to the db!)
function startListening() {
	app.listen(8080, function() {
		console.log("🐢 http://localhost:8080");
	});
}


