/*import Placemark from '../src/WorldWind.js'; 
class Pin extends Placemark {
    
    constructor(type, position, eyeDistanceScaling, attributes) {
        super(position, eyeDistanceScaling, attributes);
        this.type = type;
    }
    
    getType() {
        return this.type;
    }
}*/

define(['../src/WorldWind.js'],
    function(WorldWind) {
        'use strict';
        
        //Create the pin
        function Pin(pinType, placemark) {
            this.pinType = pinType;
            this.placemark = placemark;
            
        }
        return Pin;
    }
)