var request = require('request');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var plus = google.plus('v1');

function GoogleLoginBastard(options) {
  this.client = new OAuth2(
    options.id,
    options.secret,
    options.redirectUrl
  );
  this.userTableName = options.userTable || 'app_users';
  this.appUrl = options.appUrl || '/';
}

GoogleLoginBastard.prototype.url = function(req, res) {

  var url = this.client.generateAuthUrl({
    access_type: 'online',
    scope: 'email'
  });

  res.send(url);
}

GoogleLoginBastard.prototype.login = function(bastard, req, res) {

  this.client.getToken(req.query.code, function(err, tokens) {
    if(err) {
      res.send(err);
    }
    if(!err) {
      this.client.setCredentials(tokens);
      plus.people.get({ userId: 'me', auth: this.client }, function(err, response) {
        var user = this._getUser(bastard, response).then(function(user) {
          req.session.user = user;
          res.redirect(this.appUrl);
        }.bind(this));
      }.bind(this));
    }
  }.bind(this));
}

GoogleLoginBastard.prototype._getUser = function(bastard, response) {
  var email = response.emails[0].value;
  var user = {
    gender: response.gender,
    email: response.emails[0].value,
    displayName: response.displayName,
    firstName: response.name.givenName,
    lastName: response.name.familyName,
    avatar: response.image.url
  };

  return bastard.find(this.userTableName, user, {email: user.email}).then(function(results) {
    if(results.length) {
      return results[0];
    } else {
      return bastard.insertDocument(this.userTableName, user, user).then(function(result) {
        return result;
      });
    }
  }.bind(this));
}

GoogleLoginBastard.prototype.environment = function(req, res) {
  if(!req.session.user) {
    res.status(401).send('401 Unauthorized');
  }
  res.json(req.session.user);
}

module.exports = GoogleLoginBastard;
