/**
 * sets up services for a message bus
 */
define('services/ng-message',[
    'services/ng-services',
    'services/log',
    'services/ng-settings'
],function(module,log) {
    "use strict";

    return module.service('$message',[
        '$http','$session','$q',
        function($http,$session,$q) {
            var isInitializedPromise;
            var listeners = [];
            var token = parseInt(Math.floor(0x100000*(Math.random())), 16);
            var socketOpen;

            function init() {
                if (isInitializedPromise && socketOpen) {
                    return isInitializedPromise;
                }
                var def = $q.defer();
                socketOpen = true;
                isInitializedPromise = def.promise;
                return $session.load().then(function(settings) {
                    var ws = new WebSocket(`ws://${window.location.hostname}:13900`);
                    var mhubNode = 'default';

                    ws.node = mhubNode;
                    ws.onopen = function() {
                        ws.send(JSON.stringify({
                            type: "subscribe",
                            node: mhubNode
                        }));

                        let passport = $session.get('passport');

                        if(passport) {
                            ws.send(JSON.stringify({
                                type: "login",
                                node: mhubNode,
                                username: passport.user.username,
                                password: passport.user.mhubPassword
                            }));
                        }
                        def.resolve(ws);
                    };
                    ws.onerror = function(e){
                        log("socket error", e);
                    };
                    ws.onclose = function() {
                        socketOpen = false;
                        log("socket close");
                    };
                    ws.onmessage = function(msg) {
                        var data = JSON.parse(msg.data);
                        var headers = data.headers;
                        var topic = data.topic;

                        msg.from = headers["scoring-token"];
                        msg.fromMe = msg.from === token;

                        listeners.filter((listener) => {
                            return (typeof(listener.topic) === 'string' && topic === listener.topic) ||
                            (listener.topic instanceof RegExp && topic.matches(listener.topic));
                        }).forEach(function(listener) {
                            listener.handler(data, msg);
                        });
                    };
                    return isInitializedPromise;
                });
            }


            return {
                send: function(topic,data) {
                    return init().then(function(ws) {
                        data = data || {};
                        ws.send(JSON.stringify({
                            type: "publish",
                            node: ws.node,
                            topic: topic,
                            data: data,
                            headers: { "scoring-token": token }
                        }));
                    });
                },
                on: function(topic, handler, ignoreSelfMessages) {
                    init();
                    listeners.push({ topic: topic, handler: (msgData, msg) => msg.fromMe && ignoreSelfMessages ? void(0) : handler(msgData, msg)});
                }
            };
        }
    ]);
});
