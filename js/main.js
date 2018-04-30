var floodChart;
var firstDate;
var stationList = new Array();
var lang = 'en';
var chartLabels = {
	en: {
		dates: [],
		levels: ['Advisory', 'Watch', 'Warning'],
		yAxis: 'Water level (m)',
	},
	fr: {
		dates: [],
		levels: ['Avis', 'Veille', 'Avertissement'],
		yAxis: "Niveau des eaux (m)",
	}
};

$(document).ready( function() {
	setupLang();
	setupToggleView();
	setupIntro();
});

/*******************************************************************************
 * @brief function to Parse XML data and return a JS object containing the data 
 * @param {type} url
 * @returns {Node|ActiveXObject.responseXML|Document}
 ******************************************************************************/
function parseXML(url){
    
    // variable to store xml data as string
    var xml = "";

    var xmlList;

    if (window.XMLHttpRequest) {
  
        xmlhttp = new XMLHttpRequest();
    
    } else {
    
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    
    }

    xmlhttp.open("GET", url, false);
    xmlhttp.send();

    xmlList = xmlhttp.responseXML;

    return xmlList;
    
}

/*******************************************************************************
 * @brief This function returns the status of the alert flag given the alert 
 * levels
 * 
 * @param {type} currentLevel
 * @param {type} advisoryLevel
 * @param {type} watchLevel
 * @param {type} warningLevel
 * @returns {String}
 ******************************************************************************/
function getAlertLevel(currentLevel, advisoryLevel, watchLevel, warningLevel){
    
    var retVal;
    
    // green mode
    if ( currentLevel < advisoryLevel )
    {
        retVal = "normal";
    }
    // yellow mode
    else if ( (currentLevel >= advisoryLevel) && (currentLevel < watchLevel) )
    {
        retVal = "advisory";
    }
    // orange mode
    else if ( (currentLevel >= watchLevel) && (currentLevel < warningLevel) )
    {
        retVal = "watch";
    }
    // red mode
    else if ( currentLevel >= warningLevel )
    {
        retVal = "warning";
    }

    return retVal;

}


/*******************************************************************************
 * @brief function to populate the list of stations available in the the parsed 
 * Data
 * 
 * @returns {undefined}
 ******************************************************************************/
function populateList(){

    // parse alertlevels.xml
    var XMLStationAlerts = parseXML("http://geonb.snb.ca/riverwatch/alertlevels.xml");

    // parse alert.xml
    var XMLStationsList = parseXML("http://geonb.snb.ca/riverwatch/alert.xml");
    
		var dates = XMLStationsList.getElementsByTagName("dates")[0];
		var day0En = dates.getElementsByTagName("dates_in")[0].textContent;
		var day0Fr = dates.getElementsByTagName("dates_in")[1].textContent;
		var day1En = dates.getElementsByTagName("dates_24")[0].textContent;
		var day1Fr = dates.getElementsByTagName("dates_24")[1].textContent;
		var day2En = dates.getElementsByTagName("dates_48")[0].textContent;
		var day2Fr = dates.getElementsByTagName("dates_48")[1].textContent;
		chartLabels['en']['dates'] = [day0En, day1En, day2En];
		chartLabels['fr']['dates'] = [day0Fr, day1Fr, day2Fr];
		firstDate = day0En;

		var alertCounts = {
			'normal': 0,
			'advisory': 0,
			'watch': 0,
			'warning': 0
		};

    // get the list of stations from the parsed XML list
    var stations = XMLStationsList.getElementsByTagName("station");
    
    // get the lists of alert levels
    var alertLevelList = XMLStationAlerts.getElementsByTagName("station");
        
    // find the already defined html station list
    var list = document.getElementById("station-list");
    
    for(var i=0; i<stations.length; i++){
    		var stationData;
         
        // get current station name
        //                picks the station then tag picks item inside the station then get text value
        var stationName = stations[i].getElementsByTagName("name")[0].textContent;
        
        // gets station id
        var stationId = stations[i].getElementsByTagName("stationID")[0].textContent;
        var listId = makeSlug(stationName);
        
        // get levels data - convert string to float for comparison
        var currentLevel = parseFloat( stations[i].getElementsByTagName("forecast_cur")[0].textContent ) || 0;
        var forcast24Level = parseFloat(stations[i].getElementsByTagName("forecast_24")[0].textContent ) || 0;
        var forcast48Level = parseFloat(stations[i].getElementsByTagName("forecast_48")[0].textContent ) || 0;
        var advisoryLevel = parseFloat( alertLevelList[i].getElementsByTagName("advisory")[0].textContent );
        var watchLevel = parseFloat( alertLevelList[i].getElementsByTagName("watch")[0].textContent );
        var warningLevel = parseFloat( alertLevelList[i].getElementsByTagName("warning")[0].textContent );
        var waterLevels = [currentLevel, forcast24Level, forcast48Level];
        var alertLevels = [advisoryLevel, watchLevel, warningLevel];
        
        // not used  - kept in case needed in the future
        //var floodLevel = parseInt(alertLevelList[i].getElementByTagName("Floodlvl")[0].textContent);
        
        // a flag to store the condition of the current alert level
        
        var currentAlertlevel = getAlertLevel(currentLevel, advisoryLevel, watchLevel, warningLevel);

        // data status should be as following:
        // "3 normal"
        // "2 advisory"
        // "1 watch"
        // "0 warning"
        var dataStatus = "3 normal";
        if( currentAlertlevel === "normal" )   dataStatus = "3 normal";
        if( currentAlertlevel === "advisory" ) dataStatus = "2 advisory";
        if( currentAlertlevel === "watch" )    dataStatus = "1 watch";
        if( currentAlertlevel === "warning" )  dataStatus = "0 warning";
        alertCounts[currentAlertlevel]++;
        
        stationData = {
        	'id': stationId,
        	'name': stationName,
        	'level': currentLevel,
        	'alertLevel': currentAlertlevel,
        	'status': dataStatus,
        	'waterLevels': waterLevels,
        	'alertLevels': alertLevels
        };
        stationList.push(stationData);
        
        // create new station and insert data into the list on leftside of screen
				var item = createStationItem(stationData);
        
        // Add it to the list:
        list.appendChild(item);
        
    }
	['advisory', 'watch', 'warning'].forEach(function(level) {
		var levelCount = alertCounts[level];
		$('#'+level+'-count').text(levelCount);
	});
}

/*******************************************************************************
 * @brief Creates a DOM element for a station to be used in the list view
 * 
 * @param {object} station
 * @returns {DOM element}
 ******************************************************************************/
function createStationItem(station) {
	// data is extracted already from the parsed XML file
	var item = document.createElement('li');
	item.setAttribute("id",makeSlug(station['name']));
	item.setAttribute("class",station['alertLevel']);
	item.setAttribute("data-id",station['id']);
	item.setAttribute("data-status",station['status']);
	item.setAttribute("data-name",station['name']);

	// Set its Name:
	item.appendChild(document.createTextNode(station['name']));
	return item;
}

/*******************************************************************************
 * @brief Allows the user to switch between French and English versions of the site
 * 
 * @returns {undefined}
 ******************************************************************************/
function setupLang() {
	// all text on the site is in both French and English and has a class to identify the language
	// the class on body controls which language is visible
	$('#lang div').on('click', function() {
		if ($(this).hasClass('fr')) {
			$('body').removeClass('fr').addClass('en');
			document.location.hash = 'en';
			lang = 'en';
		} else {
			$('body').removeClass('en').addClass('fr');
			document.location.hash = 'fr';
			lang = 'fr';
		}
		updateChartLabels();
	});

	if (document.location.hash) {
		lang = document.location.hash.slice(1);
	}
	switch (lang) {
		case 'en':
			$('body').removeClass('fr').addClass('en');
			break;
		case 'fr':
			$('body').removeClass('en').addClass('fr');
			break;
	}
	updateChartLabels();
}

/*******************************************************************************
 * @brief A dropdown on mobile that the user can switch between list and map modes
 * 
 * @returns {undefined}
 ******************************************************************************/
function setupToggleView() {
	$('#mobile-view li').on('click', function() {
		var view = $(this).data('view');
		$(this).siblings().removeClass('sel');
		$(this).addClass('sel');
		$('body').removeClass('view-map view-list show-station');
		$('body').addClass('view-'+view);
	});
}

/*******************************************************************************
 * @brief Displays a disclaimer overlay when the site first loads and the user 
 * must close it to use the site
 * 
 * @returns {undefined}
 ******************************************************************************/
function setupIntro() {
	$('#intro .agree').on('click', function() {
		$(this).parents('section').first().removeClass('show');
		$('body').addClass('intro-closed');
	});
	
	$('#help-link').on('click', function() {
		$('#help').addClass('show');
	});
	
	$('.overlay .close').on('click', function() {
		$(this).parents('section').first().removeClass('show');
	});
}

/*******************************************************************************
 * @brief Sets up the behaviour of all site dropdown and calls functions 
 * setupStationList and setupChooseStation
 * 
 * @returns {undefined}
 ******************************************************************************/
function setupNav() {
	// toggles the visiblity of a dropdown with a class of 'open' on the parent
	$('.dropdown').on('click', function() {
		$(this).toggleClass('open');
	});

	setupStationList();
	setupChooseStation();
}

/*******************************************************************************
 * @brief Allows the user to sort the station list by location, name, or warning
 * level and saves that sort order in a cookie
 * 
 * @param {jQuery object} list
 * @param {jQuery object} link
 * @returns {undefined}
 ******************************************************************************/
function sortList(list, link) {
	var sortOn = link.data('sort');
	link.siblings().removeClass('sel');
	link.addClass('sel');
	Cookies.set('sort_order', sortOn, {expires: 365});
	$('li', list).sort(sort_li).appendTo(list);
	function sort_li(a, b) {
		return ($(b).data(sortOn)) < ($(a).data(sortOn)) ? 1 : -1;
	}
}

/*******************************************************************************
 * @brief Sets up the dropdown that the user can use to sort the station list and
 * applies the previous sort order if there is a cookie saved
 * 
 * @returns {undefined}
 ******************************************************************************/
function setupStationList() {
	// the list of stations can be sorted in a variety of ways:
	// alphabetically, risk of flood and geographical position which corresponds to the station id
	$('#nav-sort li').on('click', function() {
		sortList($('#station-list'), $(this));
	});

	if (Cookies.get('sort_order')) {
		var sortOrder = Cookies.get('sort_order');
		$('#nav-sort li.sort-'+sortOrder).click();
		$('#nav-sort').removeClass('open');
	}
}

/*******************************************************************************
 * @brief Controls a checkbox where the user can mark a specific station as their
 * favorite and checks for an existing favorite saved as a cookie
 * 
 * @param {int} id
 * @returns {undefined}
 ******************************************************************************/
function setupChooseStation(id) {
	$("#choose-station").click(function() {
		if ($(this).is(":checked")) {
			var id = $('#station-readings').data('id');
			setMyStation(id);
		} else {
			clearMyStation();
		}
	});
	
	if (Cookies.get('station_id')) {
		var id = Cookies.get('station_id');
		setMyStation(id);
	}
}

/*******************************************************************************
 * @brief Displays the chosen favorite and saves a cookie with the favorite 
 * station id
 * 
 * @param {int} id
 * @returns {undefined}
 ******************************************************************************/
function setMyStation(id) {
	var stationData = stationList[id];

	var stationItem = createStationItem(stationData);
	$('#my-station-list').empty().append(stationItem);

	Cookies.set('station_id', id, {expires: 365});
	$('#my-station').addClass('show');
}

/*******************************************************************************
 * @brief Deletes the favorite station cookie and removes the favorite station from
 * the top of the list
 * 
 * @returns {undefined}
 ******************************************************************************/
function clearMyStation() {
	Cookies.remove('station_id');
	$('#my-station').removeClass('show');
	$('#my-station-list').empty();
}

/*******************************************************************************
 * @brief Creates the controls to open the chart and calls functions
 * initializeChart and setupDateWarning
 * 
 * @returns {undefined}
 ******************************************************************************/
function setupChart() {
	initializeChart();

	$('#station-list, #my-station').on('click', 'li', openChart);
	$('#station-readings').on('click', '.close', function() {
		$('body').removeClass('show-station');
	});
	
	setupDateWarning();
}

/*******************************************************************************
 * @brief Initializes the chart.js plugin that we are using to display the water
 * levels
 * 
 * @returns {undefined}
 ******************************************************************************/
function initializeChart() {
	var ctx = $("#flood-chart");
	floodChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: chartLabels[lang]['dates'],
			datasets: [{
				label: chartLabels[lang]['yAxis'],
				data: [],
				backgroundColor: [
					'rgba(0, 81, 198, 1.0)',
					'rgba(64, 125, 212, 1.0)',
					'rgba(127, 168, 226, 1.0)'
				],
				borderWidth: 0
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			legend: {
				display: false,
			},
			scales: {
				yAxes: [{
					id: 'y-axis-0',
					scaleLabel: {
						display: true,
						labelString: chartLabels[lang]['yAxis']
					},
					ticks: {
						min: 0,
						max: 200
					}
				}],
				xAxes: [{
					categoryPercentage: 0.4
				}]
			},
			annotation: {
				annotations: [{
					type: 'line',
					mode: 'horizontal',
					id: '0',
					scaleID: 'y-axis-0',
					value: 0,
					borderColor: 'rgb(252, 238, 33)',
					borderWidth: 3,
					label: {
						enabled: true,
						content: chartLabels[lang]['levels'][0],
						position: 'right'
					}
				},
				{
					type: 'line',
					mode: 'horizontal',
					id: '1',
					scaleID: 'y-axis-0',
					value: 0,
					borderColor: 'rgb(247, 147, 30)',
					borderWidth: 3,
					label: {
						enabled: true,
						content: chartLabels[lang]['levels'][1],
						position: 'right'
					}
				},
				{
					type: 'line',
					mode: 'horizontal',
					id: '2',
					scaleID: 'y-axis-0',
					value: 0,
					borderColor: 'rgb(255, 67, 67)',
					borderWidth: 3,
					label: {
						enabled: true,
						content: chartLabels[lang]['levels'][2],
						position: 'right'
					}
				}]
			}
		}
	});
}

/*******************************************************************************
 * @brief Updates the chart data for a specific station and then display the chart
 * 
 * @returns {undefined}
 ******************************************************************************/
function openChart() {
	var id = $(this).data('id'),
		station = stationList[id],
		waterLevels = station['waterLevels'],
		alertLevels = station['alertLevels'],
		name = station['name'],
		min = 200, // the min value displayed on the chart
		max = 0; // the max value displayed on the chart
	$('#station-title').text(name);
	$('#station-readings').data('id', id);
	
	if (Cookies.get('station_id') == id) {
		$('#choose-station').prop('checked', true);
	} else {
		$('#choose-station').prop('checked', false);
	}

	// add water levels for this station
	floodChart.data.datasets.forEach(function(dataset) {
		// remove previous water levels
		dataset.data = [];
		// add current data
		waterLevels.forEach(function(level) {
			dataset.data.push(level);
			// find max and min for the chart area
			if (level > max) {
				max = level;
			}
			if (level < min) {
				min = level;
			}
		});
	});

	// update the alert levels
	floodChart.options.annotation.annotations.forEach(function(annotation) {
		var i = parseInt(annotation.id);
		annotation.value = parseFloat(alertLevels[i]);
		// include annotations in chart number range
		if (annotation.value > max) {
			max = annotation.value;
		}
		if (annotation.value < min) {
			min = annotation.value;
		}
	});
	
	// round and pad the max and min for tidier y-axis values
	max = Math.ceil(max + 1); // pad above the max
	min = Math.floor(min - 3); // pad below the min
	if (min < 0) {
		min = 0; // flood levels will not be negative
	}
	// adjust the max and min so the y-axis will have even tick intervals
	if (max - min > 10) { // max of 10 ticks on the y-axis
		var nearestDiff = 2*Math.round((max - min)/2); // difference between max and min rounded to an even number
		min = min - Math.floor((nearestDiff - max + min)/2); // reduce the min by half the difference
		min = 2*Math.floor(min/2); // make the min an even number
		max = min + nearestDiff; // set the max as an even amount more than the min
	}
	
	// update the min and max on the chart
	floodChart.options.scales.yAxes[0].ticks.min = min;
	floodChart.options.scales.yAxes[0].ticks.max = max;

	// render the chart with the updated values
	floodChart.update(0);
	$('body').addClass('show-station');
}

/*******************************************************************************
 * @brief Changes the language of the station chart between French & English
 * 
 * @returns {undefined}
 ******************************************************************************/

function updateChartLabels() {
	if (!floodChart) {return; }

	floodChart.options.scales.yAxes[0].scaleLabel.labelString = chartLabels[lang]['yAxis'];
	floodChart.data.datasets[0].label = chartLabels[lang]['yAxis'];
	floodChart.options.annotation.annotations[0].label.content = chartLabels[lang]['levels'][0];
	floodChart.options.annotation.annotations[1].label.content = chartLabels[lang]['levels'][1];
	floodChart.options.annotation.annotations[2].label.content = chartLabels[lang]['levels'][2];
	floodChart.data.labels = chartLabels[lang]['dates'];

	floodChart.update(0);
}

/*******************************************************************************
 * @brief Displays a message about the age of the data if it is more than a day old
 * 
 * @returns {undefined}
 ******************************************************************************/
function setupDateWarning() {
	var today = new Date(),
		currentYear = today.getFullYear();
		startDate = new Date(firstDate+' '+currentYear), // assume the forecast is from the current year
		oneDay = 1000*60*60*24; // ms in a day
		days = Math.floor((today - startDate)/oneDay);
	// if the assumed forecast date is in future, the date must be from last year instead
	if (days < 0) {
		var lastYear = currentYear - 1;
		startDate = new Date(firstDate+' '+lastYear);
		days = Math.floor((today - startDate)/oneDay);
	}
	// display the warning about the age of the forecast
	if (days > 0) {
		$('#forecast-notice .count').text(days);
		if (days == 1) {
			$('#forecast-notice').addClass('singular');
		}
		$('#forecast-notice').addClass('show');
	}
}

/*******************************************************************************
 * @brief Calls populateList, setupNav, and setupChart and then create the google
 * map that displays all of the station locations
 * 
 * @returns {undefined}
 ******************************************************************************/
function initMap() {
	// the map needs station data to be created
	populateList();
	setupNav();
	setupChart();

	// create a new map centered on New Brunswick
	var nb = new google.maps.LatLng(46.5653,-67.0619);
	var map = new google.maps.Map(document.getElementById('map'), {
		zoom: 7,
		center: nb,
		mapTypeId: 'terrain',
		fullscreenControl: false,
		streetViewControl: false
	});

	// add a marker for each station
	for(var i=0; i<stationList.length; i++){
		var latLong = new google.maps.LatLng(stationDetails[i]['lat'],stationDetails[i]['lng']),
			statusCode = parseInt(stationList[i]['status']),
			imgUrl = 'img/map'+statusCode+'.png';
		var image = {
			url: imgUrl,
			size: new google.maps.Size(21, 31),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(10, 31)
		};
		var marker = new google.maps.Marker({
			position: latLong,
			map: map,
			icon: image,
			title: stationList[i]['name']
		});
		// open the chart when the user clicks on a marker
		marker.addListener('click', function() {
			var id = makeSlug(this.getTitle());
			$('#'+id).trigger('click');
		});
	}
}

/*******************************************************************************
 * @brief Creates a slug from the station name so it can be used as an element id
 * Used by initMap and createStationItem to connect the map marker to the station
 * it represents
 * 
 * @param {string} string
 * @returns {string}
 ******************************************************************************/
function makeSlug(string) {
	var strReplaceAll = string;
	var intIndexOfMatch = strReplaceAll.indexOf(' ');
	while(intIndexOfMatch != -1){
			strReplaceAll = strReplaceAll.replace(' ', '-');
			intIndexOfMatch = strReplaceAll.indexOf(' ');
	}
	string = strReplaceAll;
	for(var i = 0, output = '', valid='-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; i < string.length; i++) {
			if(valid.indexOf(string.charAt(i)) != -1) {
					output += string.charAt(i);
			}
	}
	return output.toLowerCase();
}