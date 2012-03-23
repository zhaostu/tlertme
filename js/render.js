define([
    "http://twitter.github.com/hogan.js/builds/2.0.0/hogan-2.0.0.js",
    "text!../templates/agency.html",
    "text!../templates/route.html",
    "text!../templates/stop.html",
], function(_, agency_html, route_html, stop_html) {
    var hogan = window.Hogan;
    agency_template = hogan.compile(agency_html);
    stop_template = hogan.compile(stop_html);
    route_template = hogan.compile(route_html);

    return {
        agency: function(data){
            return agency_template.render(data);
        },
        stop: function(data){
            return stop_template.render(data);
        },
        route: function(data){
            return route_template.render(data);
        },
    }
});
