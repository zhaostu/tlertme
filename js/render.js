define([
    "http://twitter.github.com/hogan.js/builds/2.0.0/hogan-2.0.0.js",
    "text!../templates/agency.html",
    "text!../templates/stop.html",
    "text!../templates/arrival.html",
], function(_, agency_html, stop_html, arrival_html) {
    var hogan = window.Hogan;
    agency_template = hogan.compile(agency_html);
    stop_template = hogan.compile(stop_html);
    arrival_template = hogan.compile(arrival_html);

    return {
        agency: function(data){
            return agency_template.render(data);
        },
        stop: function(data){
            return stop_template.render(data);
        },
        arrival: function(data){
            return arrival_template.render(data);
        },
    }
});
