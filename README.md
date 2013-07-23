# Webrtc jQuery plugin

This plugin enables real-time streaming of video and/or audio between two web browsers(or peers).

## Installation

- Download & unzip the source
- Move the source into your www directory
- Open the page http://yourserver/
- Enjoy!

## Use

### First, the HTML...

Place the following HTML code snippet within your &lt;body&gt; tag

&lt;!-- main container --&gt;
&lt;div id="mainContainer" class="main-container"&gt;

    &lt;!-- local video --&gt;
    &lt;video id="localVideo" class="local-video"&gt;&lt;/video&gt;

    &lt;!-- remote video --&gt;
    &lt;video id="remoteVideo" class="remote-video" autoplay&gt;&lt;/video&gt;

    &lt;!-- video status & room entry bar --&gt;
    &lt;div id="videoStatus" class="video-status"&gt;&lt;/div&gt;

&lt;/div&gt;

### Then, the CSS...

Include the css within your &lt;head&gt; tag

&lt;link rel="stylesheet" href="css/fts-webrtc-styles.css"&gt;
And finally, the bloody brilliant piece that makes it all happen --the JavaScript!

This plugin enables real-time streaming of video between to browsers. Some more text here. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus leo ipsum, tempor eget mollis in, vehicula eu quam. Fusce fermentum elit at lorem tincidunt eget tempus urna ultricies.

&lt;!-- JavaScript Ressources --&gt;
&lt;script src="http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"&gt;&lt;/script&gt;
&lt;script src="js/jquery.fresh-tilled-soil-webrtc.js"&gt;&lt;/script&gt;

&lt;!-- Plugin Initialization --&gt;
&lt;script type="text/javascript"&gt;
    $(function() {
        $('#mainContainer').createVideoChat();
    });
&lt;/script&gt;

### Full Sample Demo Page (Putting it all Together)

This plugin enables real-time streaming of video between to browsers. Some more text here. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus leo ipsum, tempor eget mollis in, vehicula eu quam. Fusce fermentum elit at lorem tincidunt eget tempus urna ultricies.

&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
&lt;meta charset="UTF-8"&gt;
&lt;title&gt;Fresh Tilled Soil Video Conference | WebRTC jQuery Plug-in Demo&lt;/title&gt;

&lt;!-- Stylesheet Resources --&gt;
&lt;link rel="stylesheet" href="css/fts-webrtc-styles.css"&gt;

&lt;/head&gt;
&lt;body&gt;

&lt;!-- main container --&gt;
&lt;div id="mainContainer" class="main-container"&gt;

    &lt;!-- local video --&gt;
    &lt;video id="localVideo" class="local-video"&gt;&lt;/video&gt;

    &lt;!-- remote video --&gt;
    &lt;video id="remoteVideo" class="remote-video" autoplay&gt;&lt;/video&gt;

    &lt;!-- video status & room entry bar --&gt;
    &lt;div id="videoStatus" class="video-status"&gt;&lt;/div&gt;

&lt;/div&gt;

&lt;!-- JavaScript Ressources --&gt;
&lt;script src="http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"&gt;&lt;/script&gt;
&lt;script src="js/jquery.fresh-tilled-soil-webrtc.js"&gt;&lt;/script&gt;

&lt;!-- Plugin Initialization --&gt;
&lt;script type="text/javascript"&gt;
    $(function() {
        $('#mainContainer').createVideoChat();
    });
&lt;/script&gt;

&lt;/body&gt;
&lt;/html&gt;

### Browser Support

Given the newness of WebRTC this jQuery plug-in has been created to support all major browsers that support the latest draft WebRTC specifications at the time of release. Below you will find a list & download links for the latest supported browsers:

- Chrome
- Chrome Beta for Android (for tablet & mobile phone support)
- FireFox
- Internet Explorer 10 (requires Google Chrome Frame plug-in)
- Chromium
- Chrome Canary
- FireFox Aurora
- FireFox Nightly