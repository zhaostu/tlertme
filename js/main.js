require([
        "order!jquery",
        "order!jquery.transloc",
        "order!jquery.ba-bbq.min",
        "order!bootstrap",
        "render"
], function($, _, _, _, render){
    var params = $.deparam.querystring();

    var add_querystring = function(query){
        var url = jQuery.param.querystring(window.location.href, query);
        window.location = url;
    };

    var array_intersection = function(array1, array2){
        var result = [];
        $.each(array1, function(i, ele){
            if($.inArray(ele, array2) != -1){
                result.push(ele);
            }
        });
        return result;
    };

    if(!params['agency_id']){
        // Show select agency screen.
        $.transloc('agencies', {
            success: function(agencies){
                agencies.sort(function(a1, a2){
                    return a1['name'] >= a2['name'] ? 1 : -1;
                });
                $.each(agencies, function(i, agency){
                    $("#main-list").append(render.agency(agency));
                });
                $("#main-list").delegate("a.agency-link", "click", function(){
                    var agency_id = $(this).data("agency-id");
                    add_querystring({"agency_id": agency_id});
                    return false;
                });
            }
        });
    }
    else if(!params['from_stop']){
        // Show select from stop screen.
        var agency_id = params['agency_id'];
        $.transloc('stops', {
            agencyIds: [agency_id],
            success: function(stops){
                // Display all the stops.
                stops.sort(function(a1, a2){
                    return a1['name'] >= a2['name'] ? 1 : -1;
                });
                $.each(stops, function(i, stop){
                    if(stop['routes'].length > 0){
                        $('#main-list').append(render.stop(stop));
                    }
                });
                $("#main-list").delegate("a.stop-link", "click", function(){
                    var stop_id = $(this).data("stop-id");
                    add_querystring({"from_stop": stop_id});
                    return false;
                });
            }
        });
    }
    else if(!params['to_stop']){
        // Show select to stop screen.
        var agency_id = params['agency_id'];
        var from_stop_id = params['from_stop'];
        $.transloc('stops', {
            agencyIds: [agency_id],
            success: function(stops){
                // Sort the stops.
                stops.sort(function(a1, a2){
                    return a1['name'] >= a2['name'] ? 1 : -1;
                });

                // Find out which routes are available for the from stop.
                var routes = [];
                $.each(stops, function(i, stop){
                    if(stop['stop_id'] == from_stop_id){
                        routes = routes.concat(stop['routes']);                        
                    }
                });

                // Find out stops that are available for the routes.
                $.each(stops, function(i, stop){
                    if(stop['stop_id'] == from_stop_id){
                        return;
                    }
                    var common_routes = array_intersection(stop['routes'], routes);
                    if(common_routes.length > 0){
                        $('#main-list').append(render.stop(stop));
                    }
                });

                $("#main-list").delegate("a.stop-link", "click", function(){
                    var stop_id = $(this).data("stop-id");
                    add_querystring({"to_stop": stop_id});
                    return false;
                });
            }
        });
    }
    else{
        var agency_id = params['agency_id'];
        var from_stop_id = params['from_stop'];
        var to_stop_id = params['to_stop'];

        // Find out common route_ids.
        $.transloc('stops', function(stops){
            var from_routes = [];
            var to_routes = [];
            $.each(stops, function(i, stop){
                if(stop['stop_id'] == from_stop_id){
                    from_routes = stop['routes'];
                }
                if(stop['stop_id'] == to_stop_id){
                    to_routes = stop['routes'];
                }
            });
            var common_routes = array_intersection(from_routes, to_routes);
        });
    }
});
