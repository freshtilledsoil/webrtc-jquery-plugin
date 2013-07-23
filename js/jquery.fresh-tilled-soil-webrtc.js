// --------------------------------------------------------------------------------------------
// Fresh Tilled Soil - WebRTC jQuery Plugin
// --------------------------------------------------------------------------------------------
(function ($, window, document, undefined) {

    // --------------------------------------------------------------------------------------------
    // Default Settings
    // --------------------------------------------------------------------------------------------

    var settings = {
        // elements and selectors
        localVideo: document.getElementById("localVideo"), // local video element
        remoteVideo: document.getElementById("remoteVideo"), // remote video element
        statusElem: "#videoStatus", // video status element jQuery selector
        channelInputElem: "#videoChannelInput", // channel input textfield jQuery selector (see the rtcStatusUpdate.entry.statusHTML code)
        peerCountElem: null, // optional div that will be updated with current number of peers within a channel

        // Servers & channels
        signallingServer: "ws://signaling.freshtilledsoil.com:1337", // or 'ws://209.20.89.197:1337'
        iceServers: null,
        optionalDataChannel: null,
        isDataChannel: false,
        currChannelName: "",
        currDomain: "",

        // Media parameters & constraints
        mediaParametersAudio: true,
        mediaParametersVideo: true,
        constraints: null,
        mediaConstraints: { // used in peerconnection .createOffer method call
            'mandatory': {
                'OfferToReceiveAudio': true, // offer to receive audio
                'OfferToReceiveVideo': true // offer to receive video
            }
            //,optional: []
        },
        videoConstraints: { // used in getUserMedia
            mandatory: {},
            optional: []
        },

        // Peer related properties
        isOfferer: false, // set to true if person initialed the call (or is first person in video chat room)
        isAnswerer: true, // set to true by default meaning person is th receiver of the call (or is second person in video chat room)

        currPeerCount: 0, // total number of peers on the same channel (or in same chat room)


        // TODO - Complete making different rtcStartMode's
        rtcStartMode: 'channel-entry', // Different mode options for peer-to-peer communications include:
        // 	1)'channel-entry' - for using channel entry field to engage in video chat
        //	2)'channel-url' - for auto generating a url to give to another party to engage in video chat
        //	3)'channel-manual' - for supplying a pre-determined channel name to engage in video chat
        //	4)'channel-page' - for using same web page to engage in video chat

        // Declare status functions for DOM message updates to user
        rtcStatusUpdate: {

            "entry": {
                statusHTML: 'Enter any room name into the field and<br>give that name to a friend to enter...' + '<input id="videoChannelInput" class="video-channel-input" type="text" placeholder="enter channel name" />' + '<button id="videoChatStartButton" class="video-chat-start-button">Start Chat</button>',
                statusFx: function ($this, statusType) { // displays channel entry form

									// reset variables
                    $this.socket = null;
                    $this.peerConn = null;
                    $this.sessionStarted = false; // true when connected to another peer
                    $this.localStream = null;
                    $this.remoteStream = null;
                    $this.opts.isOfferer = false;
                    $this.opts.isAnswerer = true;

                    // update css state
                    $this.attr({
                        "class": "main-container entry"
                    });

                    // update dom with html/note
                    setStatus($this, statusType);

                    // update local video for
                    updateLocalVideoForEntryState($this);

                    updateRemoteVideoForEntryState($this);

                    console.log('entry status');

                    // handling for channel input field / button
                    $('#videoChatStartButton').off().on('click', function () {
                        var $channelInput = $($this.opts.channelInputElem);
                        if ($channelInput.val().length <= 0) {
                            alert('Please enter a channel name to continue!');
                            $channelInput.focus();
                        } else {
                            $this.opts.currChannelName = $channelInput.val(); // assign currentChannelName_raw
                            // start local media capture w/ callback to connect to signalling server afterwards
                            startLocalMediaCapture($this, connectToSignallingServer);
                        }

                    });

                    // handling for channel input field if enter is pressed instead of button click
                    $("#videoChannelInput").keyup(function (e) {
                        if (e.keyCode == 13) {
                            var $channelInput = $($this.opts.channelInputElem);
                            if ($channelInput.val().length <= 0) {
                                alert('Please enter a channel name to continue!');
                                $channelInput.focus();

                            } else {
                                $this.opts.currChannelName = $channelInput.val(); // assign currentChannelName_raw
                                // start local media capture w/ callback to connect to signalling server afterwards
                                startLocalMediaCapture($this, connectToSignallingServer);
                            }
                        }
                    });

                }
            },

            "allow": {
                statusHTML: "Please click 'Allow'<br>to start local video/audio stream",
                statusFx: function ($this, statusType) { // handle media capture note to click allow/share devices

                    // update css state
                    $this.attr({
                        "class": "main-container allow"
                    });

                    // update status type before display if this is Firefox
                    if (isMoz) {
                        $this.opts.rtcStatusUpdate.allow.statusHTML = "Please click 'Share Selected Devices'<br>to start local video/audio stream";
                    }

                    // update dom with html/note
                    setStatus($this, statusType);

                    console.log('allow status');
                }
            },

            "waiting": {
                statusHTML: "Channel Name: <strong>{{channel_name}}</strong> <span class='exit-channel'>(<a href='#' class='exit-channel-link'>exit channel</a>)</span><br>Waiting for another peer to join channel...",
                statusFx: function ($this, statusType) { // handle waiting for peer note

                    // update css state
                    $this.attr({
                        "class": "main-container waiting"
                    });

                    // if not visible fade in the status element
                    $($this.opts.statusElem).fadeIn();

                    // update video for waiting state
                    updateLocalVideoForWaitingState($this);

                    // update remote video for waiting state
                    updateRemoteVideoForWaitingState($this);

                    // update dom with html/note
                    setStatus($this, statusType);

                    // add exit channel link handler
                    $('a.exit-channel-link').off().on('click', function (e) {
                        e.preventDefault();

                        // close signalling server connection
                        disconnectFromSignallingServer($this);

                        // exit channel here
                        doStatusUpdate($this, 'entry');

                        // end local media capture
                        endLocalMediaCapture($this);

                    });

                    console.log('waiting status');
                }
            },

            "connecting": {
                statusHTML: "Peer found, establishing connection...",
                statusFx: function ($this, statusType) { // handle peer found/establishing connection

                    // update css state
                    $this.attr({
                        "class": "main-container connecting"
                    });

                    // if not visible fade in the status element
                    $($this.opts.statusElem).fadeIn();

                    // update local video for waiting state
                    updateLocalVideoForWaitingState($this);

                    // update remote video for waiting state
                    updateRemoteVideoForWaitingState($this);

                    // update dom with html/note
                    setStatus($this, statusType);


                    console.log('connecting status');
                }
            },

            "connected": {
                statusHTML: '<button id="videoChatHangupButton" class="video-chat-hangup-button">HANG UP</button>',
                statusFx: function ($this, statusType) { // handle the dis-connect/hang-up button

                    // update css state
                    $this.attr({
                        "class": "main-container connected"
                    });

                    // fadeOut the status element
                    $($this.opts.statusElem).fadeOut();

                    // update remote video for connected state
                    updateRemoteVideoForConnectedState($this);

                    // update local video for connected state
                    updateLocalVideoForConnectedState($this);

                    // update dom with html/note
                    setStatus($this, statusType);

                    // fadeOut the status element
                    $($this.opts.statusElem).fadeIn();

                    // add hang up button event handlers
                    $('#videoChatHangupButton').off().on('click', function () {
                        // call onHangUp
                        onHangUp($this);
                    });

                    console.log('connected status');

                }
            },

            "localHangup": {
                statusHTML: "",
                statusFx: function ($this, statusType) { // handle local hang-up note

                    // reset variables
                    $this.socket = null;
                    $this.peerConn = null;
                    $this.sessionStarted = false; // true when connected to another peer
                    $this.localStream = null;
                    $this.remoteStream = null;
                    $this.opts.isOfferer = false;
                    $this.opts.isAnswerer = true;


                    // update dom with html/note
                    doStatusUpdate($this, 'entry');

                    console.log('Local peer hangup.');

                }
            },

            "remoteHangup": {
                statusHTML: "",
                statusFx: function ($this, statusType) { // handle remote user hang-up note

                    // update local video for waiting state
                    doStatusUpdate($this, 'waiting');


                    console.log('Remote peer hangup.');

                    // reset variables
                    $this.sessionStarted = false; // true when connected to another peer
                    $this.remoteStream = null;

                }
            },

            "channelFull": {
                statusHTML: "",
                statusFx: function ($this, statusType) { // handle channel/room is full note
                    //..


                    // update dom with html/note
                    setStatus($this, statusType);

                    // update css state
                    $this.attr({
                        "class": "main-container channelfull"
                    });

                    console.log('channelFull status');
                }
            }
        }
    },


        // --------------------------------------------------------------------------------------------
        // Variables
        // --------------------------------------------------------------------------------------------
        w = window,
        n = navigator,
        ua = n.userAgent,
        isMoz = !! n.mozGetUserMedia,
        isAndroid = ua.toLowerCase().indexOf("android") > -1,
        PeerConnection = w.mozRTCPeerConnection || w.webkitRTCPeerConnection,
        SessionDescription = w.mozRTCSessionDescription || w.RTCSessionDescription,
        IceCandidate = w.mozRTCIceCandidate || w.RTCIceCandidate,
        rtcInstances = [],

        // --------------------------------------------------------------------------------------------
        // Privileged Methods
        // --------------------------------------------------------------------------------------------

        methods = {

            /**
             * Initialization function
             * @param {string} options : plugin's options
             * @return {void}
             */
            init: function (options) {

                // Plugin's options
                opts = $.extend({}, settings, options);



                // Initialize each matched selector
                return this.each(function () {

                    var $this = $(this);
                    var statusElemTopOffset = $(opts.statusElem).offset().top;
                    var localVideoHeight = statusElemTopOffset * 0.88;

                    $this.el = this;
                    $this.opts = opts;
                    $this.socket = null;
                    $this.peerConn = null;
                    $this.sessionStarted = false; // true when connected to another peer
                    $this.localStream = null;
                    $this.remoteStream = null;
                    $this.thisDomain = document.domain;

                    // Set and sure up needed communication variables
                    $this.iceServers = setIceServers($this);
                    // $this.mediaConstraints = setMediaConstraints($this);
                    $this.optionalDataChannel = setOptionalDataChannels($this);

                    rtcInstances[rtcInstances.length] = $this;

                    // assign start time
                    $this.startTime = new Date().getTime();

                    // set current domain name to be used as prefix to keep video channel scope within context of a domain
                    setCurrentDomain($this);

                    // show do status udpate to show intial DOM status
                    doStatusUpdate($this, 'entry');


											$(window).on('resize', function() {
												if($this.sessionStarted && $this.localStream && $this.remoteStream) {
														updateLocalVideoForConnectedState($this);
														updateRemoteVideoForConnectedState($this);
												}
											});

                });

            },

            remove: function () {
                return this.each(function () {
                    var sticky = this;
                    $.each(rtcInstances, function (i, $sb) {
                        if ($sb.get(0) === sticky) {
                            reset(null, $sb);
                            rtcInstances.splice(i, 1);
                            return false;
                        }
                    });
                });
            },

            destroy: function () {
                $.each(rtcInstances, function (i, $sb) {
                    reset(null, $sb);
                });
                rtcInstances = [];
                $window.unbind("scroll", function () {
                    window.setTimeOut(moveIntoView, settings.delay);
                });
                $window.unbind("resize", reset);
                return this;
            }
        };

    // set common cross-browser GetUserMedia reference
    n.GetUserMedia = n.mozGetUserMedia || n.webkitGetUserMedia;


    // --------------------------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------------------------

    //> Local media related functions --------------------------------------------------------------**>

    var startLocalMediaCapture = function ($this, callback) {
        if ($this) {
            console.log('Attempting to connect to local media (video/audio)');

            // show allow media capture message
            doStatusUpdate($this, "allow");

            try {
                n.GetUserMedia({
                        audio: true,
                        video: true
                    },

                    // success callback

                    function (stream) {
                        console.log('Local media stream acquired successfully');
                        $this.opts.localVideo[isMoz ? 'mozSrcObject' : 'src'] = isMoz ? stream : w.webkitURL.createObjectURL(stream);
                        $this.opts.localVideo.play();
                        $this.localStream = stream;

                        // perform callback if it was passed
                        if (typeof callback === 'function') {
                            callback($this);
                        }
                    },

                    // error callback

                    function (error) {
                        console.log('An error occured: [CODE ' + error.code + ']');
                    });

            } catch (e) {
                console.log('Unable to obtain local media stream; error code: ' + e.message);
                alert('Unable to obtain local media stream; error code: ' + e.message);
            }

        }


    };

    var endLocalMediaCapture = function ($this, callback) {
        // show allow media capture message
        //doStatusUpdate($this, "allow");

        console.log('Local media stream capture ended.');
        $this.opts.localVideo[isMoz ? 'mozSrcObject' : 'src'] = isMoz ? null : '';
        $this.opts.localVideo.pause();
        $this.localStream = null;


        // perform callback if it was passed
        if (typeof callback === 'function') {
            callback($this);
        }

    };

    var updateLocalVideoForEntryState = function ($this) {

        // reveal local video
        $this.opts.localVideo.style['opacity'] = 0;
        $this.opts.localVideo.style['box-shadow'] = 'none';
        $this.opts.localVideo.style['border'] = '1px solid rgba(0,0,0,0.4)';

    };

    var updateLocalVideoForWaitingState = function ($this) {

        var statusElemTopOffset = $($this.opts.statusElem).offset().top;
        var localVideoHeight = statusElemTopOffset * 0.88;
        $this.opts.localVideo.style['height'] = (localVideoHeight) + 'px';
        $this.opts.localVideo.style['width'] = (localVideoHeight / 0.75) + 'px';
        $this.opts.localVideo.style['margin-left'] = -(localVideoHeight / 0.75) / 2 + 'px';
        $this.opts.localVideo.style['box-shadow'] = 'none';
        $this.opts.localVideo.style['border'] = '1px solid rgba(0,0,0,0.4)';

        // reveal local video
        $this.opts.localVideo.style['opacity'] = 1;

    };

    var updateLocalVideoForConnectedState = function ($this) {

        // TODO - make this a css style
        var statusWindowHeight = $(window).height() || $(screen).height();
        var localVideoHeight = statusWindowHeight * 0.13;
        $this.opts.localVideo.style['height'] = (localVideoHeight) + 'px';
        $this.opts.localVideo.style['width'] = (localVideoHeight / 0.75) + 'px';
        $this.opts.localVideo.style['margin-left'] = -(localVideoHeight / 0.75) / 2 + 'px';
        $this.opts.localVideo.style['box-shadow'] = '0px 0px 12px rgba(185,185,185,0.5)';
        $this.opts.localVideo.style['border'] = '1px solid rgba(0,0,0,0.4)';

        // reveal local video
        $this.opts.localVideo.style['opacity'] = 0.77;

    };

    //> Remote media related functions -------------------------------------------------------------**>

    var updateRemoteVideoForEntryState = function ($this) {

        // hide local video
        $this.opts.remoteVideo.style['opacity'] = 0;

    };

    var updateRemoteVideoForWaitingState = function ($this) {

        // hide local video
        $this.opts.remoteVideo.style['opacity'] = 0;

    };

    var updateRemoteVideoForConnectedState = function ($this) {

        var screenHeight = $(window).height() || $(screen).height();
        var screenWidth = $(window).width() || $(screen).width();

        var remoteVidHeight = screenHeight;
        var remoteVidWidth = screenHeight / 0.75;

        var remoteVidMarginBottom = 0;
        var remoteVidMarginLeft = (screenWidth - remoteVidWidth) / 2;

        if (remoteVidWidth > screenWidth) {
            // update video size if it exceeds screen width
            remoteVidHeight = screenWidth * 0.75;
            remoteVidWidth = screenWidth;
            remoteVidMarginBottom = ((screenHeight - remoteVidHeight));
            remoteVidMarginLeft = 0;
        }

        $this.opts.remoteVideo.style['height'] = remoteVidHeight + 'px';
        $this.opts.remoteVideo.style['width'] = remoteVidWidth + 'px';
        $this.opts.remoteVideo.style['margin-bottom'] = remoteVidMarginBottom + 'px';
        $this.opts.remoteVideo.style['margin-left'] = remoteVidMarginLeft + 'px';

        // reveal local video
        $this.opts.remoteVideo.style['opacity'] = 1;

    };

    //> PeerConnection related functions -----------------------------------------------------------**>

    var connect = function ($this) {
        if ($this) {
            if (!$this.sessionStarted && $this.localStream) {

                // create peer connection
                createPeerConnection($this);

                // add local media stream to peer connection
                var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
                console.log(timestamp + ": Adding local media stream to peer connection");
                $this.peerConn.addStream($this.localStream);

                // TODO - place this in a more accurate spot!
                $this.sessionStarted = true;

                timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
                console.log(timestamp + ": Sending offer to peer.");

                // create offer
                $this.peerConn.createOffer(
                    function (sessionDescription) {
                        setLocalAndSendMessage($this, sessionDescription);
                    },
                    null,
                    $this.opts.mediaConstraints
                );

            } else {
                alert("YOU MUST INITIALIZE YOUR VIDEO BEFORE CONNECTING!");
            }
        }
    };

    var disconnect = function ($this) {
        //..
    };

    var createPeerConnection = function ($this) {

        try {

            var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
            console.log(timestamp + ": Creating peer connection");

            $this.peerConn = new PeerConnection($this.iceServers, $this.optionalDataChannel)

            // attach onIceCandidate functions to event
            $this.peerConn.onicecandidate = function (event) {
                onIceCandidate($this, event);
            }

        } catch (e) {

            timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
            console.log(timestamp + ": Failed to create PeerConnection, exception: " + e.message);

        }

        // attach peer connection event listeners
        $this.peerConn.onaddstream = function (event) {
            onRemoteStreamAdded($this, event);
        };
        $this.peerConn.onremovestream = function (event) {
            onRemoteStreamRemoved($this, event);
        };


        $this.peerConn.oniceconnectionstatechange = function (event) {
            onIceConnectionStateChange($this, event);
        };
        $this.peerConn.onsignalingstatechange = function (event) {
            onSignalingStateChange($this, event);
        };

    };

    var closePeerConnection = function ($this) {
        $this.peerConn.close();
        $this.peerConn = null;

        $this.opts.remoteVideo[isMoz ? 'mozSrcObject' : 'src'] = "";
        $this.remoteStream = null;
    };

    var onIceCandidate = function ($this, event) {

        var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
        console.log("[" + timestamp + "] onicecandidate(event) object below -------: ");
        console.log(event);

        if (event.candidate) {
            // return sdp
            sendMessage($this, {
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            });

        } else {
            console.log('End of candidates.');

        }

    };

    var onIceConnectionStateChange = function ($this, event) {

        var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
        console.log("[" + timestamp + "] oniceconnectionstatechange(event) object below -------: ");
        console.log(event);

    };

    var onSignalingStateChange = function ($this, event) {

        var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
        console.log("[" + timestamp + "] onsignalingstatechange(event) object below -------: ");
        console.log(event);

    };

    var onRemoteStreamAdded = function ($this, event) {

        var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
        console.log(timestamp + ": remote stream added to peer connection");

        $this.remoteStream = event.stream;

        $this.opts.remoteVideo[isMoz ? 'mozSrcObject' : 'src'] = isMoz ? $this.remoteStream : w.webkitURL.createObjectURL($this.remoteStream);
        $this.opts.remoteVideo.play();

        // show do status udpate to show intial DOM status
        doStatusUpdate($this, 'connected');

    };

    var onRemoteStreamRemoved = function ($this, event) {

        var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
        console.log(timestamp + ": remote stream remove from peer connection");

        $this.opts.remoteVideo[isMoz ? 'mozSrcObject' : 'src'] = "";
        $this.remoteStream = null;

    };

    var setLocalAndSendMessage = function ($this, sessionDescription) {

        $this.peerConn.setLocalDescription(sessionDescription);
        sendMessage($this, sessionDescription);

    };


    //> Message & signalling server functions ------------------------------------------------------**>

    var connectToSignallingServer = function ($this, callback) {
        if ($this) {
            console.log('Connecting to signalling server');

            // only connect to signalling server if user has not already done so
            if (!$this.socket) {
                // create new websocket instance
                $this.socket = new WebSocket(
                    $this.opts.signallingServer +
                    '/?room=fts-' + $this.opts.currDomain +
                    '-' + $this.opts.currChannelName +
                    '&r=' + $this.opts.currDomain
                );

                // add on message listener for receiving messages from Signalling Socket
                $this.socket.addEventListener('message',
                    function (event) {
                        onMessage($this, event);
                    }, false);

                // for terminating server connection upon closing window if user hasn't done so
                w.onbeforeunload = function () {
                    disconnectFromSignallingServer($this);
                }

                // perform callback if it was passed
                if (typeof callback === 'function') {
                    callback($this);
                }
            }
        }
    };

    var disconnectFromSignallingServer = function ($this, callback) {
        if ($this) {
            console.log('Disconnecting from signalling server');

            // send message to signalling server to notify that the connection is being terminated
            sendMessage($this, {
                type: 'bye'
            });

            // remove onMessage event handling of signalling server
            $this.socket.removeEventListener("message", onMessage, false);

            // close socket connection
            $this.socket.close();

            // nullify / remove websocket instance
            $this.socket = null;

            // remove listener to terminate socket upon window closing
            w.onbeforeunload = null;

            // Clear out current channel name
            $this.opts.currChannelName = "";

            // perform callback if it was passed
            if (typeof callback === 'function') {
                callback($this);
            }
        }
    };

    var closeSession = function ($this) {
        if ($this.sessionStarted) {

            // close peer connection (also stops remote video)
            closePeerConnection($this);

        }
    };

    var onMessage = function ($this, event) {
        console.log("RECEIVED: " + event.data);
        processSignallingMessage($this, event.data);
    };

    var sendMessage = function ($this, msg) {
        console.log("SENT: " + msg);
        var myMsg = JSON.stringify(msg);
        $this.socket.send(myMsg);
    };

    var processSignallingMessage = function ($this, message) {
        var msg = JSON.parse(message);
        console.log(msg);
        signallingMessageHandler[msg.type]($this, message);
    };

    var signallingMessageHandler = {

        "offer": function ($this, message) {
            var msg = JSON.parse(message);

            if (!$this.sessionStarted && $this.localStream) {

                // create peer connection
                createPeerConnection($this);

                // add local media stream to peer connection
                var timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
                console.log(timestamp + ": Adding local media stream to peer connection");
                $this.peerConn.addStream($this.localStream);

                // TODO - place this in a more accurate spot!
                $this.sessionStarted = true;

                try {

                    // set remote description
                    $this.peerConn.setRemoteDescription(new SessionDescription(msg));

                    timestamp = new Date().getTime(); // timestamp for console.log below only --comment out with console.log
                    console.log(timestamp + ": Sending answer to peer.");

                    // create & send answer to peer
                    $this.peerConn.createAnswer(
                        function (sessionDescription) {
                            setLocalAndSendMessage($this, sessionDescription);
                        },
                        null,
                        $this.opts.mediaConstraints
                    );

                } catch (e) {

                    console.log("Could not send answer to peer offer.  Error code: " + e.message);

                }

            } else {

                console.log($this.localStream);
                console.log($this.sessionStarted);

                console.log('waiting for local video stream to process offer SDP');
                setTimeout(processSignallingMessage($this, message), 100);

            }

        },

        "answer": function ($this, message) {

            if ($this.sessionStarted) {
                var msg = JSON.parse(message);
                $this.peerConn.setRemoteDescription(new SessionDescription(msg));
            }
        },

        "candidate": function ($this, message) {
            if ($this.sessionStarted) {
                var msg = JSON.parse(message);
                var candidate = new IceCandidate({
                    sdpMLineIndex: msg.label,
                    candidate: msg.candidate
                });

                $this.peerConn.addIceCandidate(candidate);
            }
        },

        "bye": function ($this, message) {
            if ($this) {
                onRemoteHangUp($this);
            }
        },

        "peerCount": function ($this, message) {
            if ($this) {
                var msg = JSON.parse(message);

                $this.opts.currPeerCount = msg.data || 0;

                // if channel is to max occupancy & they aren't engaged in the chat session, then notify user, clear out current channel name, and disconnect from signalling server & exit function
                if ($this.opts.currPeerCount > 2 && !$this.sessionStarted) {
                    doStatusUpdate($this, "channelFull"); // Update status --room is full
                    disconnectFromSignallingServer($this); // Disconnect from socket server
                    return false;
                }

                // if there is a dom element that is available for peer count updates then update it here
                if ($this.opts.$peerCountElem) {
                    $($this.opts.$peerCountElem).html($this.opts.currPeerCount);
                }

                // Determine which peer is offerer or answerer
                $this.opts.isOfferer = ($this.opts.currPeerCount <= 1 || $this.opts.isOfferer) ? true : false;
                $this.opts.isAnswerer = ($this.opts.currPeerCount > 1 && !$this.opts.isOfferer) ? true : false;

                console.log($this.opts.isOfferer ? 'isOfferer' : 'isAnswerer');

                if ($this.opts.currPeerCount <= 1) {
                    // display waiting for peers status note
                    doStatusUpdate($this, "waiting");

                } else if ($this.opts.currPeerCount === 2) {

                    // display peer found / establishing connection with peer status note
                    doStatusUpdate($this, "connecting");

                    if (!$this.sessionStarted && $this.opts.isOfferer) {
                        // start peer connection
                        connect($this);
                    }
                }
            }
        },

        "readyForCall": function ($this, message) {
            if ($this) {
                console.log('received message: readForCall');
            }
        },

        "chat": function ($this, message) { // TODO - Add Chat Function Ability

        }

    };

    var onRemoteHangUp = function ($this) {
        // for remote hang up handling
        if ($this.sessionStarted) {

            // close session
            closeSession($this);

            $this.sessionStarted = false;

            // return to waiting screen or initial screen
            doStatusUpdate($this, 'remoteHangup');

            console.log("remote peer initiated hang up.");

        }
    };

    var onHangUp = function ($this) {
        // for local hang up handling
        if ($this.sessionStarted) {

            // update peer via signalling server
            sendMessage($this, {
                type: 'bye'
            });

            // end local media capture
            endLocalMediaCapture($this);

            // disconnectFromSignallingServer
            disconnectFromSignallingServer($this);

            // close session
            closeSession($this);
            $this.sessionStarted = false;


            // return to waiting screen or initial screen
            doStatusUpdate($this, 'localHangup');

            console.log("Local peer initiated hang up.");



        }

    };


    //> Communication variable adjustment & setting functions --------------------------------------**>

    var setIceServers = function ($this) {
        var STUN, TURN, iceServers;
        if ($this) {

            STUN = {
                url: $this.opts.STUN || (!isMoz ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121')
            }; //'stun:23,21,150,121'

            TURN = {
                url: "turn:paul.greenlea%40freshtilledsoil.com@numb.viagenie.ca:3478",
                credential: "freshmountain"
            };

            iceServers = {
                iceServers: $this.opts.iceServers || [STUN]
            };

            if (!isMoz && !$this.opts.iceServers) {

                // syntax for Chrome version 28 and later
                if (parseInt(ua.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10) >= 28) {
                    TURN = {
                        url: 'turn:numb.viagenie.ca',
                        credential: 'freshmountain',
                        username: 'paul.greenlea@freshtilledsoil.com'
                    };
                }

                iceServers.iceServers = [TURN, STUN];
            }

        }

        return iceServers;

    };

    var setOptionalDataChannels = function ($this) {
        var optional = $this.opts.optionalDataChannel || {
            optional: []
        };
        if ($this && !$this.opts.optionalDataChannel) {
            if (!isMoz) {
                optional.optional = $this.opts.isDataChannel ? [{
                    RtpDataChannels: true
                }] : [{
                    DtlsSrtpKeyAgreement: true
                }];
            }
        }
        return optional;
    };

    var setMediaConstraints = function ($this) {
        //..
    };


    //> Status update related functions ------------------------------------------------------------**>

    var doStatusUpdate = function ($this, statusType) {
        if ($this) {
            if (typeof $this.opts.rtcStatusUpdate[statusType].statusFx === 'function') {
                $this.opts.rtcStatusUpdate[statusType].statusFx($this, statusType);
            }
        }
    };

    var setStatus = function ($this, statusType, theHTML) {
        if ($this) {
            if (typeof $this.opts.rtcStatusUpdate[statusType].statusHTML === 'string' && statusType.length > 0) {
                $($this.opts.statusElem).html($this.opts.rtcStatusUpdate[statusType].statusHTML.replace('{{channel_name}}', $this.opts.currChannelName)); // update DOM with pre declared html string
            } else if (typeof theHTML !== "undefined") {
                $($this.opts.statusElem).html(theHTML); // update DOM with passed in html string -- passed inplace of 'statusType' parameter
            } else {
                $($this.opts.statusElem).html(statusType.replace('{{channel_name}}', $this.opts.currChannelName)); // update DOM with passed in html string -- passed in via 'theHTML' parameter
            }
        }
    };


    //> General helper functions -------------------------------------------------------------------**>

    var setCurrentDomain = function ($this) {
        var tmpPrefixToAdd = '',
            tmpDomainArray = document.domain.split('.');

        for (var i = 0; i < tmpDomainArray.length; i++) {
            if (tmpDomainArray.length <= 2) {
                // written for domains like freshtilledsoil.com that contain only two items once split
                tmpPrefixToAdd += tmpDomainArray[i];
            } else if (i !== 0) {
                // else for domains like www.freshtilledsoil.com that contain more than two items once split (main reason is to get rid of any possible www differences between clients) - one client may use the address with the www prefix and another may not
                tmpPrefixToAdd += tmpDomainArray[i];
            }
        }
        $this.opts.currDomain = tmpPrefixToAdd;
    };

    // --------------------------------------------------------------------------------------------
    // Plugin Constructor
    // --------------------------------------------------------------------------------------------


    $.fn.createVideoChat = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (!method || typeof method == "object") {
            return methods.init.apply(this, arguments);
        }
    }

})(jQuery, window, document);