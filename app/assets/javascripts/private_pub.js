function buildPrivatePub(doc) {
  var self = {
    connecting: false,
    fayeClient: null,
    fayeUser: null,
    fayeCallbacks: [],
    subscriptions: {},
    subscriptionObjects: {},
    subscriptionCallbacks: {},

    faye: function(callback) {
      if (self.fayeClient) {
        callback(self.fayeClient);
      } else {
        self.fayeCallbacks.push(callback);
        if (self.subscriptions.server && !self.connecting) {
          self.connecting = true;
          var script = doc.createElement("script");
          script.type = "text/javascript";
          script.src = self.subscriptions.server + ".js";
          script.onload = self.connectToFaye;
          doc.documentElement.appendChild(script);
        }
      }
    },

    connectToFaye: function() {
      self.fayeClient = new Faye.Client(self.subscriptions.server);
      self.fayeClient.addExtension(self.fayeExtension);
      for (var i=0; i < self.fayeCallbacks.length; i++) {
        self.fayeCallbacks[i](self.fayeClient);
      };
    },

    fayeExtension: {
      outgoing: function(message, callback) {
        if (message.channel == "/meta/connect") {
          if(self.fayeUser) {
            if (!message.ext) message.ext = {};
            message.ext.user = self.fayeUser;
          }
        }

        if (message.channel == "/meta/disconnect") {
          if(self.fayeUser) {
            if (!message.ext) message.ext = {};
            message.ext.user = self.fayeUser;
          }
        }

        if (message.channel == "/meta/subscribe") {
          // Attach the signature and timestamp to subscription messages
          var subscription = self.subscriptions[message.subscription];
          if (!message.ext) message.ext = {};
          message.ext.private_pub_signature = subscription.signature;
          message.ext.private_pub_timestamp = subscription.timestamp;
        }
        callback(message);
      }
    },

    sign: function(options) {
      var sub = self.subscription(options.channel)
      if(sub) return

      if (!self.subscriptions.server) {
        self.subscriptions.server = options.server;
      }

      self.subscriptions[options.channel] = options;
      self.fayeUser = options.user;

      self.faye(function(faye) {
        var sub = faye.subscribe(options.channel, self.handleResponse);
        self.subscriptionObjects[options.channel] = sub;
        if (options.subscription) {
          options.subscription(sub);
        }
      });
    },

    handleResponse: function(message) {
      if (message.eval) {
        eval(message.eval);
      }
      if (callback = self.subscriptionCallbacks[message.channel]) {
        callback(message.data, message.channel);
      }
    },

    subscription: function(channel) {
      return self.subscriptionObjects[channel];
    },

    unsubscribeAll: function() {
      for (var i in self.subscriptionObjects) {
        if ( self.subscriptionObjects.hasOwnProperty(i) ) {
          self.unsubscribe(i);
        }
      }
    },

    unsubscribe: function(channel) {
      var sub = self.subscription(channel);
      if (sub) {
        sub.cancel();
        delete self.subscriptionObjects[channel];
      }
    },

    subscribe: function(channel, callback) {
      self.subscriptionCallbacks[channel] = callback;
    }
  };
  return self;
}

var PrivatePub = buildPrivatePub(document);
