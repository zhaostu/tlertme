require([
        "order!jquery",
        "order!jquery.transloc",
        "order!jquery.ba-bbq.min",
        "order!jquery.ba-throttle-debounce.min",
        "order!bootstrap",
        "render",
        "update",
], function($, _, _, _, _, render, update){
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

    var timediff = function(date, now){
        date = Date.parse(date);
        if(date){
            var td = (date - now) / 1000;
            return Math.floor(td / 60);
        }
        else{
            return null;
        }
    };

    var format_timediff = function(diff){
        if(diff){
            diff = diff <= 1 ? '<1' : diff;
            return diff + ' min';
        }
        else{
            return '>45 min'
        }
    }

    var set_title = function(title){
        $("#title").html(title);
    }

    var set_search = function(){
        $("#input-bar").append('Search: <input id="search" type="text" class="span2"/>');
        $("#search").keyup($.debounce(300, function(event){
            var search_str = $("#search").val().toLowerCase();
            $("#main-list .searchable").each(function(i){
                if($(this).data('search').toLowerCase().indexOf(search_str) != -1){
                    $(this).show();
                }
                else{
                    $(this).hide();
                }
            });
        }));
    }

    if(!params['agency_id']){
        // Show select agency screen.
        set_title("Choose Agency");
        set_search();

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
                $("#waiting").hide();
            }
        });
    }
    else if(!params['from_stop']){
        // Show select from stop screen.
        set_title("Pick your Origin");
        set_search();

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
                $("#waiting").hide();
            }
        });
    }
    else if(!params['to_stop']){
        // Show select to stop screen.
        set_title("Pick your Destination");
        set_search();

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
                $("#waiting").hide();
            }
        });
    }
    else{
        // Show the actual alarm screen.
        set_title("You Can Take");
        $("#input-bar").append('Alert me when a bus is <input type="number" id="minutes" class="span1" min="1" max="20" value="5"/> mins away.')

        var agency_id = params['agency_id'];
        var from_stop_id = params['from_stop'];
        var to_stop_id = params['to_stop'];

        var audio_tester = new Audio();
        if(!!audio_tester.canPlayType && "" != audio_tester.canPlayType('audio/ogg; codecs="vorbis"')){
            var alarm = new Audio("sound/alarm.ogg");
        }
        else if(!!audio_tester.canPlayType && "" != audio_tester.canPlayType('audio/mpeg')){
            var alarm = new Audio("sound/alarm.mp3");
        }

        $.transloc('stops', {
            agencyIds: [agency_id],
            success: function(stops){
                // Find out common route_ids.
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

                // Get route colors and other information.
                $.transloc('routes', {
                    agencyIds: [agency_id],
                    success: function(routes){
                        var route_infos = {};
                        $.each(routes[agency_id], function(i, route){
                            if(route['short_name'] == ''){
                                route['short_name'] = null;
                            }
                            route_infos[route['route_id']] = route;
                        });
                        // Updater, called back by get_update.
                        var update_info = function(arrivals){
                            var arrival_entries = [];
                            var now = new Date();
                            var make_alarm = false;
                            // Check the number in the box.
                            var minutes = parseInt($('#minutes').val());

                            $.each(arrivals, function(vehicle_id, vehicle){
                                // Sort arrival times.
                                vehicle.sort(function(a1, a2){
                                    return a1['arrival_at'] >= a2['arrival_at'] ? 1 : -1;
                                });

                                // Generate all arrival entries.
                                while(vehicle.length){
                                    if(vehicle[0]['is_from'] && (vehicle.length == 1 || vehicle[1]['is_to'])){
                                        // from_stop -> to_stop or from_stop -> null.
                                        var route = route_infos[vehicle[0]['route_id']];
                                        var from_diff = timediff(vehicle[0]['arrival_at'], now);
                                        var to_diff = timediff(vehicle.length > 1 ? vehicle[1]['arrival_at'] : null, now);
                                        var arrival = {
                                            route_short_name: route['short_name'],
                                            route_long_name: route['long_name'],
                                            route_color: route['color'],
                                            route_text_color: route['text_color'],
                                            vehicle_id: vehicle_id,
                                            from_stamp: vehicle[0]['arrival_at'],
                                            to_stamp: vehicle.length > 1 ? vehicle[1]['arrival_at'] : null,
                                            from_arrival: format_timediff(from_diff),
                                            to_arrival: format_timediff(to_diff),
                                        }
                                        if(from_diff <= minutes && from_diff >= minutes - 1){
                                            make_alarm = true;
                                            arrival['alarm'] = true;
                                        }
                                        else{
                                            arrival['alarm'] = false;
                                        }
                                        arrival_entries.push(arrival);
                                    }
                                    vehicle.shift();
                                }
                            });
                            
                            arrival_entries.sort(function(a1, a2){
                                return a1['from_stamp'] >= a2['from_stamp'] ? 1 : -1;
                            });

                            $('#main-container').empty();
                            $.each(arrival_entries, function(i, arrival){
                                $('#main-container').append(render.arrival(arrival));
                            });
                            $("#waiting").hide();

                            if(make_alarm){
                                alarm.play();
                            }
                        };

                        var get_update = update($, [agency_id], common_routes, [from_stop_id, to_stop_id], update_info);

                        setInterval(get_update, 30000);
                        get_update();
                    }
                });
            }
        });
    }
});
