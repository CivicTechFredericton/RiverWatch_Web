require([
    "esri/layers/TileLayer",
    "esri/Map",
    "esri/Basemap",
    "esri/widgets/BasemapToggle",
    "esri/views/MapView",
    "esri/widgets/CoordinateConversion",
    "esri/geometry/Extent",
    "esri/geometry/Geometry",
    "esri/geometry/Extent",
    "esri/tasks/QueryTask",
    "esri/Graphic",
    "esri/geometry/Point",
    "esri/tasks/GeometryService",
    "esri/geometry/SpatialReference",
    "esri/tasks/support/ProjectParameters",
    "esri/layers/GraphicsLayer",
    "esri/widgets/BasemapToggle",
    "dojo/_base/connect"
], function (TileLayer, Map,
    Basemap, BasemapToggle, MapView, CoordinateConversion, Extent, Geometry, Extent, QueryTask, Graphic, Point, GeometryService, SpatialReference, ProjectParameters, GraphicsLayer, BasemapToggle
) {
    // Create a WebTileLayer with a third-party cached service
    var mapBaseLayer = new TileLayer({
        url: "https://geonb.snb.ca/arcgis/rest/services/GeoNB_Basemap_Topo/MapServer",
        copyright: "From SNB.",
        visible: true
    });

    geometryService = new GeometryService("https://geonb.snb.ca/arcgis/rest/services/Utilities/Geometry/GeometryServer");

    // Create a Basemap with the WebTileLayer. The thumbnailUrl will be used for
    // the image in the BasemapToggle widget.
    var snbbase = new Basemap({
        baseLayers: [mapBaseLayer],
        title: "Terrain",
        id: "terrain",
        thumbnailUrl: "https://geonb.snb.ca/arcgis/rest/services/GeoNB_Basemap_Topo/MapServer/export?bbox=2320000.%2C7360000.%2C2700000.%2C7650000.&bboxSR=&layers=&layerDefs=&size=64,64&imageSR=&format=png&transparent=false&dpi=&time=&layerTimeOptions=&dynamicLayers=&gdbVersion=&mapScale=&f=image"
    });

    var orlyr = new TileLayer({
        url: "https://geonb.snb.ca/arcgis/rest/services/GeoNB_Basemap_Imagery/MapServer",
        id: "SNBOrtho",
        copyright: "SNB",
        visible: true
    });

    var phbase = new Basemap({
        baseLayers: [orlyr],
        title: "Photo",
        id: "photo",
        thumbnailUrl: "https://geonb.snb.ca/arcgis/rest/services/GeoNB_Basemap_Imagery/MapServer/export?bbox=2320000.%2C7360000.%2C2700000.%2C7650000.&bboxSR=&layers=&layerDefs=&size=64,64&imageSR=&format=png&transparent=false&dpi=&time=&layerTimeOptions=&dynamicLayers=&gdbVersion=&mapScale=&f=image"
    });


    var statLyr = new GraphicsLayer({
        id: 'Stations',
        title: 'Stations'
    });

    var map = new Map({
        basemap: snbbase
    });

    map.layers.add(statLyr);

    var index = new Extent({
        xmin: 2261652,
        ymin: 7259455,
        xmax: 2827464,
        ymax: 7704882,
        spatialReference: 2036
    });

    var view = new MapView({
        container: "viewDiv",
        map: map,
        extent: index
        // Sets center point of view using longitude,latitude
    });

    var toggle = new BasemapToggle({
        view: view, // view that provides access to the map's 'topo' basemap
        nextBasemap: phbase // allows for toggling to the 'hybrid' basemap
    });

    // Add widget to the top right corner of the view
    view.ui.add(toggle, "top-right");

    // Get the screen point from the view's click event

    //Works for pop-up on mouse over to a station: TODOS --> Add a popup to x, y location when pointer-move event happens
    /*
    view.on("pointer-move",function (event) {
        var screenPoint = {
            x: event.x,
            y: event.y
        };
  
    view.hitTest(screenPoint).then(function (response) {
            if (response.results.length) {
                var id = makeSlug(response.results[0].graphic.symbol.title);			
                view.popup.open({
                    title: id,
                    location: event.mapPoint
                });		
            }
        });
    });
    */
    view.on("hold", function (event) {
        var screenPoint = {
            x: event.x,
            y: event.y
        };
        view.hitTest(screenPoint).then(function (response) {
            if (response.results.length) {
                //				var id = makeSlug(response.results[0].graphic.symbol.title);
                var id = response.results[0].graphic.symbol.title;
                id = id.trim();
                view.popup.open({
                    title: id,
                    //content = id,
                    location: event.mapPoint
                });
            }
        });
    });

    // Get the screen point from the view's click event
    view.on("click", function (event) {
        var screenPoint = {
            x: event.x,
            y: event.y
        };
        view.hitTest(screenPoint).then(function (response) {
            if (response.results.length) {
                var id = makeSlug(response.results[0].graphic.symbol.title);
                $('#' + id).trigger('click');
            }
        });
    });
    view.on("key-down", function (event) {
        //Stop panning if the station dialog is visible. 
        // Normally, when the left/right arrow keys are pressed, the app moves to the next / previous station.
        // This way, the left/rifght  arrow keys wont pan the map around when the station dialog is open.
        var keyPressed = event.key;
        if (keyPressed.slice(0, 5) === "Arrow") {
            if ($('body').hasClass('show-station'))
                event.stopPropagation();
        }
    });

    function AddStation(lat, lng, inurl, name) {
        var outSR = "2036"; // `wkid {number}`
        var inputpoint = new Point({
            longitude: lng,
            latitude: lat
        });

        var projectParams = new ProjectParameters();
        projectParams.geometries = [inputpoint];
        //projectParams.outSR = new SpatialReference({ wkid: outSR });
        projectParams.outSpatialReference = new SpatialReference({ wkid: outSR });

        geometryService.project(projectParams).then(function (result) {
            var outputpoint = result[0]; // outputpoint first element of result array
            var stat = new Graphic({
                geometry: {
                    type: "point",
                    x: outputpoint.x,
                    y: outputpoint.y,
                    spatialReference: view.spatialReference
                },
                symbol: {
                    type: "picture-marker",
                    url: inurl,
                    width: '27px',
                    height: '41px',
                    yoffset: '15px',
                    title: name
                }
            });
            statLyr.add(stat);
        });
    }

    view.on("layerview-create", function (lyr, lvw) {
        if (lyr.layer.id == 'Stations') {
            initMap(AddStation);
        }
    });

});