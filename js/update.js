define([], function() {
    return function($, agency_ids, route_ids, stop_ids, callback){
        return function(){
            // Get arrival predictions feed, show arrival predictions
            // for both stops.
            $.transloc('arrival-estimates', {
                agencyIds: agency_ids,
                routeIds: route_ids,
                stopIds: stop_ids,
                success: function(arrivals){
                    var vehicles = {};
                    for(var i = 0; i < 2; i++){
                        var stop = arrivals[i];
                        if(!stop){
                            // If currently no arrival prediction for this stop.
                            continue;
                        }
                        for (var j = 0; j < stop['arrivals'].length; j++){
                            var arrival = stop['arrivals'][j];
                            arrival['is_from'] = (stop['stop_id'] == stop_ids[0]);
                            arrival['is_to'] = (stop['stop_id'] == stop_ids[1]);

                            // Skip schedule-based predictions.
                            if(!arrival['vehicle_id']){
                                continue;
                            }

                            // Add to vehicles object.
                            if(vehicles.hasOwnProperty(arrival['vehicle_id'])){
                                vehicles[arrival['vehicle_id']].push(arrival);
                            }
                            else{
                                vehicles[arrival['vehicle_id']] = [arrival];
                            }
                        }
                    }
                    callback(vehicles);
                }
            });
        }
    }
});
