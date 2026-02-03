ymaps.ready(function() {
    var myMap = new ymaps.Map("map", {
        center: [47.2922, 39.7236],
        zoom: 16
    });
    
    var myPlacemark = new ymaps.Placemark([47.2922, 39.7236], {
        balloonContent: 'Филимоновская ул., 18, Ростов-на-Дону'
    });
    
    myMap.geoObjects.add(myPlacemark);
});