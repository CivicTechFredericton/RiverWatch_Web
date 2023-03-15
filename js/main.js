var floodChart;
var firstDate;
var stationList = new Array();
var lang = 'en';
var forecast_available = true;
var waterlevels_available = true;

var geometryService = null;

var forecast_missing_value = false;
var waterlevels_missing_value = false;
var times = 1;
var wsc_url_en = "NONE";
var wsc_url_fr = "NONE";
var date_arr = [];
var date_arr2 = [];
var create_date = '—';

var chartLabels = {
	en: {
		dates: [],
		levels: ['Normal','Advisory', 'Watch', 'Warning', 'Flood', 'Record'],
		yAxis: 'Water level (m)',
		yAxis_forecast: "Forecast (m)"
	},
	fr: {
		dates: [],
		levels: ['ASD','Avis', 'Veille', 'Avertissement', 'Crue', 'Record'],
		yAxis: "Niveau des eaux (m)",
		yAxis_forecast: "Prévoir (m)"
	}
};

$(document).ready( function() {
	setupLang();
	setupToggleView();
	setupIntro();

	// Detect click on the background to close the help dialog
	$('.overlay').on('click', function(e) {
		if (e.target !== this)
			return;

		e.stopPropagation();

		//Close the help dialog
		$('#help').removeClass('show');
	});

	//Close station dialog
	$('#map').click(function(e) {
		$('body').removeClass('show-station');
	});

	$(document).on('keydown', function(e) {

		// Handle key presses
		// Escape - close help dialog. Close station readings dialog
		// Left / Right Arrow - forward / back through the stations. Similar to the swipe funcionality
		if (e.key === "Escape") { // escape key maps to keycode `27`
			//close the open dialog (i.e. help dialogs)
			$("#help").first().removeClass("show");

			//Close station dialog
			$('body').removeClass('show-station');
		}
		else 
		{
			switch((e.keyCode ? e.keyCode : e.which))
			{
			case 37: //Left arrow
				//Check if the station dialog is open
				if ( $('body').hasClass('show-station') )
				{
					displayPrev();
				}
				e.stopPropagation();

				break;
			case 39: //Right arrow
				//Check if the station dialog is open
				if ( $('body').hasClass('show-station') )
				{
					displayNext();
				}
				e.stopPropagation();

				break;
			}
		}
	});

});

function month_day_swap(date){
	//TODO. Feb 2016-2023 This appears to be localization type code to see the date in the preferred format.
	// Consider changing to using proper date objects and localization. See. toLocaleDateString
	var month = "";
	var day = "";
	var year = "";
	var slash = 0;
	for(var i = 0; i < date.length; i += 1){
		if(date[i] == ' ') break;
		if(date[i] == '/'){
			slash += 1;
			continue;
		}
		if(slash == 0) day += date[i];
		else if(slash == 1) month += date[i];
		else year += date[i];
	}
	//year += "T00:00";
	return month + '/' + day + '/' + year;
}

var date_sort_asc = function (date1, date2) {
  // This is a comparison function that will result in dates being sorted in
  // ASCENDING order. As you can see, JavaScript's native comparison operators
  // can be used to compare dates. This was news to me.
  if (date1 > date2) return 1;
  if (date1 < date2) return -1;
  return 0;
};
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

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
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
function getAlertLevel(currentLevel, advisoryLevel, watchLevel, warningLevel, floodLevel) {

	var retVal;
	if (currentLevel >= floodLevel) {
		// black mode
		retVal = "flood";
	}	else if (currentLevel >= warningLevel) {
		// red mode
		retVal = "warning";
	} else if (currentLevel >= watchLevel) {
		// orange mode
		retVal = "watch";
	} else if (currentLevel >= advisoryLevel) {
		// yellow mode
		retVal = "advisory";
	} else {
		// green mode
		retVal = "normal";
	}
	return retVal;
}


function getMeasures(locId, stations) {
    for(var is=0 ; is < stations.length ; is++) {
		var  shdr = stations[is].getElementsByTagName("header")[0];
      	var  slid = shdr.getElementsByTagName("locationId")[0].textContent;
        
		if(slid == locId) {
			var  pid = shdr.getElementsByTagName("parameterId")[0].textContent;
            if(pid != "HG")
                continue;
            
			var    wmeas = stations[is].getElementsByTagName("event");
          	var    lvls = [];
          	var    im;
            
			for(im=0 ; im < wmeas.length ; im++) {
              //console.log(wmeas[im].getAttribute('date') + 'T' + wmeas[im].getAttribute('time'));
              var  mdt = new Date(wmeas[im].getAttribute('date') + 'T' + wmeas[im].getAttribute('time'));
        	  var wLevel = parseFloat(wmeas[im].getAttribute('value'));
              var meas = {dtime : mdt,
                          wlvl : wLevel };
              lvls.push(meas);
            }
          
			return lvls;
        }
    }
    
    return null;
}

function getForecast(locId, stations) {

	for(var is=0 ; is < stations.length ; is++) {
		var  shdr = stations[is].getElementsByTagName("header")[0];
		var  slid = shdr.getElementsByTagName("locationId")[0].textContent;
		
		if(slid == locId) {
			var  pid = shdr.getElementsByTagName("parameterId")[0].textContent;
            if(pid != "SSTG")
                continue;

			var    wmeas = stations[is].getElementsByTagName("event");
			var    lvls = [];
			var    im;
			
			for(im=0 ; im < wmeas.length ; im++) {
              var  mdt = new Date(wmeas[im].getAttribute('date') + 'T' + wmeas[im].getAttribute('time'));
        	  var wLevel = parseFloat(wmeas[im].getAttribute('value'));
              var meas = {dtime : mdt,
                          wlvl : wLevel };
              lvls.push(meas);
            }
          return lvls;
        }
    }
    
    return null;
}

function getCreationDate(stationId, stations){
	for(var i = 0; i < stations.length; i++){
		var header = stations[i].getElementsByTagName("header")[0];
      	var id = header.getElementsByTagName("locationId")[0].textContent;
      	if(id == stationId){
            var cdts = header.getElementsByTagName("creationDate");
            if(cdts.length > 0) {
        		var creationDate = cdts[0].textContent;
        		return creationDate;
            }
      	}
	}
	return "";
}

function get_month_french(month){
	switch (month) {
			case "Jan":
				return "jan";
			case "Feb":
				return "fév";
			case "Mar":
				return "mar";
			case "Apr":
				return "avr";
			case "May":
				return "mai";
			case "Jun":
				return "juin";
			case "Jul":
				return "juil";
			case "Aug":
				return "aou";
			case "Sep":
				return "sep";
			case "Oct":
				return "oct";
			case "Nov":
				return "nov";
			case "Dec":
				return "déc";
		}
	return "Unknown Month";
}

/*******************************************************************************
 * @brief function to populate the list of stations available in the the parsed
 * Data
 *
 * @returns {undefined}
 ******************************************************************************/
function populateList(){
	var timeStamp = Date.now();
	
	var alertCounts = {
		'normal': 0,
		'advisory': 0,
		'watch': 0,
		'warning': 0,
		'flood': 0
	};

	// get the list of stations from the parsed XML list
	var XMLStationsList = parseXML("https://geonb.snb.ca/rwm/flood/StJohn_FEWSNB_export.xml");
	//var XMLStationsList = parseXML("StJohn_FEWSNB_export.xml"); //debug with local file 
	var timeZone = XMLStationsList.getElementsByTagName("timeZone")[0].textContent;
	var stations = XMLStationsList.getElementsByTagName("series");

	var nextForecastStationId = "NextFcst"; //This is the specific site ID we're looking for to grab the next forcase interval
	var creationDate = getCreationDate(nextForecastStationId, stations);
	var nextForecastDate = getNextForecastDate(nextForecastStationId, stations, timeZone);

	// get the lists of alert levels
    var XMLStationAlerts = parseXML("https://geonb.snb.ca/rwm/flood/alertlevels.xml");
	var alertLevelList = XMLStationAlerts.getElementsByTagName("station");

	// find the already defined html station list
	var list = document.getElementById("station-list");

	for(var i = 0; i < alertLevelList.length; i++) {
		var stationData;

		// get current station name and ID
		var stationName = alertLevelList[i].getElementsByTagName("name")[0].textContent;
		var stationId = alertLevelList[i].getElementsByTagName("stationID")[0].textContent;
		var lat = alertLevelList[i].getElementsByTagName("latitude")[0].textContent;
		var lng = alertLevelList[i].getElementsByTagName("longitude")[0].textContent;

		var has_measured_data = alertLevelList[i].getElementsByTagName("Measured")[0].textContent;
		var has_forecast_data = alertLevelList[i].getElementsByTagName("Forecast")[0].textContent;
		wsc_url_en = alertLevelList[i].getElementsByTagName("WSC_URL_EN")[0].textContent;
		wsc_url_fr = alertLevelList[i].getElementsByTagName("WSC_URL_FR")[0].textContent;
		//console.log("wsc_url_en: " + wsc_url_en);
		var listId = makeSlug(stationName);
		
		// get levels data - convert string to float for comparison
		var advisoryLevel = parseFloat(alertLevelList[i].getElementsByTagName("advisory")[0].textContent);
		var watchLevel = parseFloat(alertLevelList[i].getElementsByTagName("watch")[0].textContent);
		var warningLevel = parseFloat(alertLevelList[i].getElementsByTagName("warning")[0].textContent);
		var floodLevel = parseFloat(alertLevelList[i].getElementsByTagName("Floodlvl")[0].textContent);
//        var maxLevel = parseFloat(alertLevelList[i].getElementsByTagName("max")[0].textContent);
        var maxVal = alertLevelList[i].getElementsByTagName("max");
        var maxLevel = null;
        if (maxVal.length > 0) {
            maxLevel = parseFloat(maxVal[0].textContent);
        }
//  var maxLevel = 8.0;
		var alertLevels = [advisoryLevel, watchLevel, warningLevel, floodLevel, maxLevel];

		var measures = getMeasures(stationId, stations);
        var forecasts = getForecast(stationId, stations);

		var currentLevel = 0;
        if(measures != null) {
            currentLevel = measures[measures.length-1].wlvl;
            if(currentLevel == -999) {
              var  idx = measures.length-2;
              var  cnt = 0;
              while(idx >= 0 && measures[idx].wlvl == -999) {
                  idx --;
              }
              if(idx >= 0) {
                  cnt = 1;
                  currentLevel = measures[idx].wlvl;
              }
              if(forecasts != null) {
                  idx = 0;
                  while(idx < forecasts.length && forecasts[idx].wlvl == -999) {
                      idx ++;
                  }
                  if(idx < forecasts.length) {
                      currentLevel += forecasts[idx].wlvl;
                      cnt ++;
                  }
              }
              if(cnt > 0)
                  currentLevel /= cnt;
            }
        }
        else  if(forecasts != null) {
            currentLevel = forecasts[0].wlvl;
        }
        
        // a flag to store the condition of the current alert level
		// need this but how
		var currentAlertlevel = getAlertLevel(currentLevel, advisoryLevel, watchLevel, warningLevel, floodLevel);
//		var currentAlertlevel = 'normal';
  		if (measures == null) measures = 'NA';
  		if (forecasts == null) forecasts = 'NA';

		// data status should be as following:
		// "4 normal"
		// "3 advisory"
		// "2 watch"
		// "1 warning"
		// "0 flood"
		var dataStatus = "4 normal";

		switch (currentAlertlevel) {
			case "normal":
				dataStatus = "4 normal";
				break;
			case "advisory":
				dataStatus = "3 advisory";
				break;
			case "watch":
				dataStatus = "2 watch";
				break;
			case "warning":
				dataStatus = "1 warning";
				break;
			case "flood":
				dataStatus = "0 flood";
				break;
		}

		alertCounts[currentAlertlevel]++;

		stationData = {
			'id': i,
			'name': stationName,
			'level': currentLevel,
			'alertLevel': currentAlertlevel,
			'status': dataStatus,
			'waterLevels': measures,
            'forecasts' : forecasts,
			'alertLevels': alertLevels,
			'lat': lat,
			'lng': lng,
			'has_measured_data': has_measured_data,
			'has_forecast_data': has_forecast_data,
			'wsc_url_en': wsc_url_en,
			'wsc_url_fr': wsc_url_fr,
			'issuedDate': creationDate,
			'nextForecastDate': nextForecastDate
		};

		stationList.push(stationData);

		// create new station and insert data into the list on leftside of screen
		var item = createStationItem(stationData);

		// Add it to the list:
		list.appendChild(item); //this is the html list on the ledt panel of map
	}
	
	['advisory', 'watch', 'warning', 'flood'].forEach(function(level) {
		var levelCount = alertCounts[level];
		$('.'+level+'-count').text(levelCount);
	});
}

/*******************************************************************************
 * @brief Extract the integer which holds the number of days until the next forecast will be available.
 *
 * 	Note: There is a 'special' site that may be included with a parameterId/locationID/StationID of 'NextFcst'. This is a site that was created specifically to
	       hold a special entry to indicate the next time the XML data set will be updated. In that site, there are 3 events. the event with a flag of '0' is the one we want.
	<series>
        <header>
            <type>instantaneous</type>
            <locationId>NextFcst</locationId>
            <parameterId>NextFcst</parameterId>
            <timeStep unit="second" multiplier="86400"/>
            <startDate date="2023-02-20" time="20:00:00"/>
            <endDate date="2023-02-22" time="20:00:00"/>
            <missVal>-999</missVal>
            <stationName>NextFcst</stationName>
            <units>REAL</units>
            <creationDate>2023-02-21</creationDate>
            <creationTime>14:41:08</creationTime>
        </header>
        <event date="2023-02-20" time="20:00:00" value="-999" flag="8"/>
        <event date="2023-02-21" time="20:00:00" value="1" flag="0"/>
        <event date="2023-02-22" time="20:00:00" value="-999" flag="8"/>
    </series>
 * @param {object} stations array
 * @returns {Integer or null if no next forecast found}
 ******************************************************************************/
function getNextForecastDate(stationId, stations, timeZone) {
	var endDate = null;//This will be the date of the last reading, which we'll add the interval to.

	var timeZone = "-0400"; //This shouldn't be heard coded but the timeZone from the XML is in the incorrect format for Javascript
	// Need the time zone when creating a javascript date object. Otherwise, javascript assumes UTC time which can shift our dates when we 
	// read out as AST. Example
	//   const date = new Date("2023-03-06");
	//	 console.log(date); 
	//	 Sun Mar 05 2023 20:00:00 GMT-0400 (Atlantic Standard Time)
	//  Note it's March 5 in the response, even though we set the date to March 6th

	try
	{
		for(var is=0 ; is < stations.length ; is++) {
			var  header = stations[is].getElementsByTagName("header")[0];
			var  locationId = header.getElementsByTagName("locationId")[0].textContent;

			if(locationId === stationId) {
				// Found the next forecast data. 

				// Remember the end date so we can add the interval later
				endDate = header.getElementsByTagName("creationDate")[0].textContent;

				//Now, we look up the events to find the one with a flag of '0'. That's where the next forecast interval is stored.
				var events = stations[is].getElementsByTagName("event")
				for (var i = 0; i< events.length; i++)
				{
					//find the '0' flag.
					var currentEvent = events[i];
					var eventFlag = currentEvent.getAttribute("flag");
					
					//we're looking for flag 0. If it's flag 0, return value.
					// Update: the format changed on March 14, 2023. There will only be 1 event record with a flag of '1'. 
					//  If the flag is '1' - this is the data we want. Adding a 'or' here to check for a 0 OR 1 to cover both cases and compatibility.
					if ( (eventFlag === "0") || (eventFlag === "1"))
					{
						var nextForcastInterval = currentEvent.getAttribute("value")

						//Create the date. By default, javascript uses UTC time. WE need to make sure we set the time based on our locale.
						//var nextForcastDate = new Date(endDate + "T00:00:00.000" + timeZone);						
						var nextForcastDate = new Date(endDate + "T00:00:00.000" + timeZone);
						
						//Add the interval to the date given and return
						nextForcastDate.setDate(nextForcastDate.getDate() + parseInt(nextForcastInterval));

						return nextForcastDate;
					}
				}
			}
			else
			{
				//Not the location we're looking for... keep going through the XML find the NextFcst element
				continue;
			}
		}
	}
	catch (error)
	{
		console.log("Can't find next forecast interval in the XML");
		console.log(error)
	}
    
	return null;
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
	item.setAttribute("class",station['alertLevel']);
	item.setAttribute("data-id",station['id']);
	item.setAttribute("data-status",station['status']);
	item.setAttribute("data-name",station['name']);

	// Set its Name
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
			document.getElementById("near-real-time-wlvl").href = wsc_url_en;
		} else {
			$('body').removeClass('en').addClass('fr');
			document.location.hash = 'fr';
			lang = 'fr';
			document.getElementById("near-real-time-wlvl").href = wsc_url_fr;
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

	$('#legend').on('click', function() {
		$('#help').addClass('show');
	});
	$('#station-footer').on('click', function() {
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

	//add SameSite settings to avoid warnings
	Cookies.set('station_id', id, {expires: 365, samesite:'lax'});
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
function setupChart_NEW() {
 console.log('setup chart');
	initializeChart_NEW();
	$('#station-list, #my-station').on('click', 'li', openChart_NEW);
	$('#station-readings').on('click', '.close', function() {
		$('body').removeClass('show-station');
	});
	//setupDateWarning();
}

/*******************************************************************************
 * @brief Initializes the chart.js plugin that we are using to display the water
 * levels
 *
 * @returns {undefined}
 ******************************************************************************/
 	Chart.defaults.modifiedline = Chart.defaults.line;

    var timeFormat = 'DD/MM/YYYY';
	

	var borderColorProp = function(){ 
							if(forecast_available)
								return 'rgba(176, 209, 247, 1)'; //B0D1F7
							return 'rgba(198, 179, 255, 0)';	
						}
 	var forecast_data = function(){ 
							if(forecast_available)
							return [
										
										{ x: "06/02/2019 01:00", y: 6.7 }, 
										{ x: "10/02/2019 06:00", y: 5.3 }
										
									];
							return [
										{ x: "06/02/2019 12:20", y: "" }, 
										{ x: "07/02/2019 12:20", y: "" },
										{ x: "08/02/2019 12:20", y: "" }
									];	
						}
	var config = {
        type:    'modifiedline',
        data:    {
        	labels: chartLabels[lang]['dates'],
            datasets: [
                {
                    label: chartLabels[lang]['yAxis'],
                    data: [],
                    fill: true,
                    borderColor: 'rgba(69, 146, 235, 1)' //4592EB
                },
                {
                    label: chartLabels[lang]['yAxis_forecast'],
                    data:  [],
                    fill:  false,
					//borderDash: [4, 2],
                    borderColor: borderColorProp()
                }
            ]
        },
        options: {
			spanGaps: false,
			legend: { 
						display: false,
					  	position: 'bottom'	
					  },
            responsive: true,
            maintainAspectRatio: false, //Adding this makes graph fit on the screen
            
            scales:     {
                
                xAxes: [{
                	id: 'x-axis-0',
                    type: 'time',
                    position:'bottom',
                    time: {
							parser: 'DD/MM/YYYY HH:mm',
							tooltipFormat: 'll HH:mm',
							unit: 'day',
							unitStepSize: 2,
							displayFormats: {
									'day': 'MMM-DD'
								},	
							},
					ticks: {
							autoSkip: true,
							maxTicksLimit: 3,
							stepSize: 2,
							callback: function( label, index, labels ) {
                        		if(lang == 'en')
                        			return label;
                        		var res = label.split('-');
								res[0] = get_month_french(res[0]);
								return res[0] + '-' + res[1];
                    		}
						}
                }],


                yAxes: [{
                	id: 'y-axis-0',
					scaleLabel: {
						display: true,
						labelString: chartLabels[lang]['yAxis']
					},
					ticks: {
						autoSkip: true,
						maxTicksLimit: 10,
						callback: function(value) {if (value % 1 === 0) {return value;}}
					}
                }]
            },

            tooltips: {
            	callbacks: {
            		// Here's where the magic happens:
                	title: function( data ) {
                		if(lang == 'en')
                    		return data[0].xLabel;
                    	var res = data[0].xLabel.split(' ');
                    	res[0] = get_month_french(res[0]);                    	
                    	return res[0] + ' ' + res[1] + ' ' + res[2] + ' ' + res[3];
                	},
                	label: function ( item, data ) {
                        var num = round(item.yLabel, 1).toString();
                        if(num.indexOf('.') < 0)
                            num += '.0';
                        
                        if(lang != 'en')
                          num = num.toString().replace('.', ',');
                      
                        return num+'m';
                	}
            	}
            },


		    pan: {
		      enabled: true,
		      mode: "xy" 
		    },
            zoom: {
		      enabled: true,
		      mode: "xy"
		      
		    },

            //Annotation STARTS            
            annotation: { 
            	drawTime: 'beforeDatasetsDraw',
				annotations: [
				{
					//Draw the 'Advisory' line
					type: 'line',
					mode: 'horizontal',
					id: '0',
					scaleID: 'y-axis-0',
					value: 6, 
					borderColor: 'rgba(252, 238, 33, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][1],
						position: 'right'
					}
				},
				{
					//Draw the 'Watch' line
					type: 'line',
					mode: 'horizontal',
					id: '1',
					scaleID: 'y-axis-0',
					value: 7,
					borderColor: 'rgba(247, 147, 30, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][2],
						position: 'right'
					}
				},
				{
					//Draw the 'Warning' line
					type: 'line',
					mode: 'horizontal',
					id: '2',
					scaleID: 'y-axis-0',
					value: 8,
					borderColor: 'rgba(255, 67, 67, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][3],
						position: 'right'
					}
				},
				{
					//Draw the 'Flood' line
					type: 'line',
					mode: 'horizontal',
					id: '3',
					scaleID: 'y-axis-0',
					value: 9,
					borderColor: 'rgba(0, 0, 0, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][4],
						position: 'right'
					}
				},
				{
					type: 'line',
					mode: 'horizontal',
					id: '4',
					scaleID: 'y-axis-0',
					value: 9,
					borderColor: 'rgba(0, 0, 240, 0.9)',
					borderWidth: 3,
                    borderDash: [8, 5],
					label: {
						enabled: true,
						content: chartLabels[lang]['levels'][5],
						position: 'right'
					}
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '10',
					scaleID: 'x-axis-0',
					value: date_arr2[0], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '11',
					scaleID: 'x-axis-0',
					value: date_arr2[1], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '12',
					scaleID: 'x-axis-0',
					value: date_arr2[2], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '13',
					scaleID: 'x-axis-0',
					value: date_arr2[3], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '14',
					scaleID: 'x-axis-0',
					value: date_arr2[4], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '15',
					scaleID: 'x-axis-0',
					value: date_arr2[5], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '16',
					scaleID: 'x-axis-0',
					value: date_arr2[6], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '17',
					scaleID: 'x-axis-0',
					value: date_arr2[7], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '18',
					scaleID: 'x-axis-0',
					value: date_arr2[8], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				},
				{
					type: 'line',
					mode: 'vertical',
					id: '19',
					scaleID: 'x-axis-0',
					value: date_arr2[9], //new Date('5/13/2019'), //new Date('05/13/2019 00:00'), //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00' new Date('May-13-2019')
					borderColor: 'lightgrey',
					borderWidth: 1
				}

				]
			}
			
			//Annotation ENDS
        }
		
    };

    function parse_date(date_with_space){
    	var date_no_space = "";
    	for(var i = 0; i < date_with_space.length; i++){
    		if(date_with_space[i] == ' ') break;
    		date_no_space += date_with_space[i];
    	}
    	return date_no_space;
    }

    var custom = Chart.controllers.line.extend({
			draw: function(ease) {
				
				//alert("custom draw : " + times);
				times += 1;

				Chart.controllers.line.prototype.draw.call(this, ease);
				var scale = floodChart.scales['y-axis-0'];
				
				var x;
				try{
					if(forecast_missing_value == true) // that means,  forecast is made up of dummy dates ( 5 dates )
						x = config.data.datasets[0]._meta[0].data[ config.data.datasets[0]._meta[0].data.length - 1]._model.x;
					else
						x = config.data.datasets[1]._meta[0].data[0]._model.x;
				}
				catch (error)
				{
					//console.log(error);
					//console.log("Likely cause: _meta[0].data[0] is empty");
				}
				//var date_arr = getDates(config.data.datasets);
				//for(var i = 0; i < date_arr.length; i += 1)
					//console.log(date_arr[i]._model.x);
				//console.log(date_arr);

				var ctx = this.chart.chart.ctx;
				ctx.save();
				
				//Draw the vertical line indicating the last reading date
				ctx.strokeStyle  = 'rgba(0, 0, 0, 1.0)';
				ctx.beginPath(); 
				ctx.setLineDash([5, 5]);
				ctx.lineWidth = 2;
				ctx.moveTo(x, scale.top); //floodChart.options.scales.yAxes[0].ticks.min
				ctx.lineTo(x, scale.bottom);
				ctx.stroke();
				ctx.closePath();
				
				//ctx.restore();
				
				var offset_x = 0.06;
				var offset_y = 0.7;
				var y = scale.top;
				var height = scale.bottom;

				//Cond-2
				if(forecast_available == false){
					xx = x * (1 + offset_x);
					yy = y + height * offset_y;
					ctx.fillStyle  = 'rgba(0, 0, 0, 0.8)';
					ctx.font = "0.6em Arial";
               		if(lang == 'en') {
  					  ctx.fillText("NO FORECAST DUE TO", xx + 0.1 * xx, yy + 0.08 * yy);
					  ctx.fillText("THE UNPREDICTABLE", xx + 0.1 * xx, 14 + yy + 0.08 * yy);
					  ctx.fillText("NATURE OF ICE JAMS", xx + 0.1 * xx, 28 + yy + 0.08 * yy);
                    } else {
  					  ctx.fillText("AUCUNE PRÉVISION DISPONIBLE", xx + 0.1 * xx, yy + 0.08 * yy);
					  ctx.fillText("EN RAISON DE LA NATURE", xx + 0.1 * xx, 14 + yy + 0.08 * yy);
					  ctx.fillText("IMPRÉVISIBLE DES EMBÂCLES.", xx + 0.1 * xx, 28 + yy + 0.08 * yy);
                    }
				}
				//Cond-4
				else if(forecast_missing_value == true){
					xx = x * (1 + offset_x);
					yy = y + height * offset_y;
					ctx.fillStyle  = 'rgba(0, 0, 0, 0.8)';
					ctx.font = "0.6em Arial";
                    if(lang == 'en') {
					  ctx.fillText("DUE TO CURRENT ", xx , yy + 0.08 * yy);
					  ctx.fillText("CONDITIONS NO FORECAST", xx , 14 + yy + 0.08 * yy);
					  ctx.fillText("AT THIS TIME", xx , 28 + yy + 0.08 * yy);	
                    } else {
					  ctx.fillText("EN RAISON DES CONDITIONS", xx , yy + 0.08 * yy);
					  ctx.fillText("ACTUELLES, AUCUNE PRÉVISION", xx , 14 + yy + 0.08 * yy);
					  ctx.fillText("DISPONIBLE POUR LE MOMENT.", xx , 28 + yy + 0.08 * yy);	
                    }
				}
				
				//Cond-1
				if(waterlevels_available == false){
					xx = x - 0.65 * x;
					yy = y + height * offset_y;
					ctx.fillStyle  = 'rgba(0, 0, 0, 0.8)';
					ctx.font = "0.6em Arial";
                    if(lang == 'en') {
					  ctx.fillText("ONLY FORECAST WATER", xx + 0.1 * xx, yy + 0.08 * yy);
					  ctx.fillText("LEVELS AVAILABLE", xx + 0.1 * xx, 14 + yy + 0.08 * yy);
					  ctx.fillText("AT THIS TIME", xx + 0.1 * xx, 28 + yy + 0.08 * yy);
                    } else {
					  ctx.fillText("SEULES LES PRÉVISIONS DES", xx + 0.1 * xx, yy + 0.08 * yy);
					  ctx.fillText("NIVEAUX D’EAU SONT DISPONIBLES", xx + 0.1 * xx, 14 + yy + 0.08 * yy);
					  ctx.fillText("À CET ENDROIT.", xx + 0.1 * xx, 28 + yy + 0.08 * yy);
                    }
				}
				//Cond-3
				else if(waterlevels_missing_value == true){
					//DO NOTHING
					/*
					xx = x - 0.65 * x + 10;
					yy = y + height * 0.75;
					ctx.fillStyle  = 'rgba(0, 0, 0, 0.8)';
					ctx.font = "0.8em Arial";
					ctx.fillText("SOME DATA", xx, yy + 0.08 * yy);
					ctx.fillText("MAY BE MISSING", xx, 14 + yy + 0.08 * yy);
					ctx.fillText("DUE TO", xx, 28 + yy + 0.08 * yy);
					ctx.fillText("TEMPORARY", xx, 42 + yy + 0.08 * yy);
					ctx.fillText("MALFUNCTION", xx, 56 + yy + 0.08 * yy);
					*/	
				}

				ctx.restore();
				
			}//end function
		});
	
	Chart.controllers.modifiedline = custom;

function initializeChart_NEW(){
    console.log('init chart');
	var ctx = $("#flood-chart");
	floodChart = new Chart(ctx, config);
}

/*******************************************************************************
 * @brief Updates the chart data for a specific station and then display the chart
 *
 * @returns {undefined}
 ******************************************************************************/
function openChart_NEW(){
console.log('openchart');
	var id = $(this).data('id');
    displayChart(id);
}

var   curId = -1;

function findPosition(inid) {
  var  list = document.getElementById("station-list");
  var  mxStats = list.childElementCount;
  var  ii = 0;
    for(ii=0 ; ii < mxStats && list.childNodes[ii].dataset.id != inid ; ii++) ;
    return ii;
}

function displayPrev() {
  var  nid = findPosition(curId) - 1;
  var list = document.getElementById("station-list");
  var  maxStats = list.childElementCount;
  
    if(nid < 0) {
        nid = maxStats - 1;
    }
    nid = list.childNodes[nid].dataset.id;
    displayChart(nid);
}

function displayNext() {
  var  nid = findPosition(curId) + 1;
  var list = document.getElementById("station-list");
  var  maxStats = list.childElementCount;
    if(nid >= maxStats) {
        nid = 0;
    }
    nid = list.childNodes[nid].dataset.id;
    displayChart(nid);
}

function displayChart(id) {
	date_arr = [];
    date_arr2 = [];
    curId = id;
	var	station = stationList[id],
		waterLevels = station['waterLevels'],
	    forecasts = station['forecasts'],
		alertLevels = station['alertLevels'],
		name = station['name'],
		has_forecast_data = station['has_forecast_data'],
		has_measured_data = station['has_measured_data'],
		next_forecast_value = station['nextForecastDate'],
		issued_date = station['issuedDate']
	min = 200, // the min value displayed on the chart
	max = 0; // the max value displayed on the chart
    wsc_url_en = station['wsc_url_en'];
	wsc_url_fr = station['wsc_url_fr'];
	
	$('#station-title').text(name);
	$('#station-title').css("font-weight","bold");
	$('#station-readings').data('id', id);

	$("#near-real-time-wlvl").css("display", "block");
	
	if(lang == 'en')
		$('#near-real-time-wlvl').attr("href", wsc_url_en);
	else
		$('#near-real-time-wlvl').attr("href", wsc_url_fr);
	
	if(wsc_url_en == "NONE" || wsc_url_fr == "NONE")
		$("#near-real-time-wlvl").css("display", "none");


	if (Cookies.get('station_id') == id) {
		$('#choose-station').prop('checked', true);
	} else {
		$('#choose-station').prop('checked', false);
	}
	
	forecast_available = true;
	waterlevels_available = true;

	forecast_missing_value = false;
	waterlevels_missing_value = false;
	// add water levels for this station
    var  cs = 0;               // flag for denoting which chart set.
	var  total_forecast = 0;
	var  total_wlvl = 0;
		if(has_forecast_data == 'YES'){
			forecasts.forEach(function(level) {
				if(level.wlvl != -999)
					total_forecast += 1;
			});	
		}
        else
            forecast_available = false;

		if(has_measured_data == 'YES'){
			waterLevels.forEach(function(level) {
				if(level.wlvl != -999)
					total_wlvl += 1;
			});	
		}
        else
            waterlevels_available = false;

	floodChart.data.datasets.forEach(function(dataset) {
		// remove previous water levels
		dataset.data = [];
		
		let total = 0;
        if(cs == 0) {
        	 if(has_measured_data == 'YES' && total_wlvl > 0){
        	 	waterlevels_available = true;
	  			waterLevels.forEach(function(level) {
					total += 1;
		            var dt = level.dtime.getDate() + '/' + ( 1 + level.dtime.getMonth()) +'/'+level.dtime.getFullYear() + ' '+level.dtime.getHours() + ':'+level.dtime.getMinutes();
		            date_arr.push(parse_date(dt));
		            
		            var wlvl = null;
		            if(level.wlvl != -999) wlvl = level.wlvl;
		            else waterlevels_missing_value = true;
		            var itm = {
		            				x: dt,
		                       		y: wlvl
		                       };
					dataset.data.push(itm);
		                
					if (level.wlvl > max) {
						max = level.wlvl;
					}
					if (level.wlvl < min && level.wlvl > 0) {
						min = level.wlvl;
					}
		  		});
	  		}
	  		else {
                if(total_wlvl == 0) {
                    waterlevels_missing_value = true;
                }
                
	  			if(has_forecast_data == 'YES'){
	  				var diff = 4;
	  				while(diff >= 0){
	  					var level = forecasts[0];
                        var yr = level.dtime.getFullYear();
                        var mon = level.dtime.getMonth();
                        var dy = level.dtime.getDate() - diff;
                        var hr = level.dtime.getHours();
                        var dt = new Date(yr, mon, dy, hr, 0, 0, 0);
		                var tdt = dt.getDate() + '/' + ( 1 + dt.getMonth()) +'/'+dt.getFullYear() + ' '+dt.getHours() + ':'+dt.getMinutes();
		  				date_arr.push(parse_date(tdt));
		  				
		  				var itm = {
		            				x: tdt,
		                       		y: null 
		                       };
		                dataset.data.push(itm);       	
		  				diff -= 1;	
	  				}
	  				
	  			}
				
	  		}
        } //cs = 0 ends
        else {
       		if(has_forecast_data == 'YES' && total_forecast > 0) {
       			total_missing_forecast = 0;
  		  		forecasts.forEach(function(level) {
					total += 1;
		            var dt = level.dtime.getDate() + '/' + (1+level.dtime.getMonth())+'/'+level.dtime.getFullYear() + ' '+level.dtime.getHours() + ':'+level.dtime.getMinutes();
		            date_arr.push(parse_date(dt));
			            
		            var wlvl = null;
	            	if(level.wlvl != -999)
                        wlvl = level.wlvl;
	            	else
                        total_missing_forecast += 1;
		            var itm = {
           				x: dt,
                   		y: wlvl
                    };
						
					dataset.data.push(itm);
			                
					if (level.wlvl > max) {
						max = level.wlvl;
					}
					if (level.wlvl < min && level.wlvl > 0) {
						min = level.wlvl;
					}
		  		});

		  		if(total_missing_forecast == forecasts.length)
		  			forecast_missing_value = true;
     		}
       		else{
                if(total_forecast == 0)
                    forecast_missing_value = true;
                
                var   sdate = new Date();
       		 	if(has_measured_data == 'YES'){
  					var level = waterLevels[waterLevels.length - 1];
                    sdate = level.dtime;
                }
                else if(forecasts.length > 0) {
                    sdate = forecasts[0].dtime;
                }
       		 		
   		 		var diff = 1;
  				while(diff <= 5){
                        var yr = sdate.getFullYear();
                        var mon = sdate.getMonth();
                        var dy = sdate.getDate() + diff;
                        var hr = sdate.getHours();
                    var  dt = new Date(yr, mon, dy, hr, 0, 0, 0);
                    var  tdt = (dt.getDate()) + '/' + (1+dt.getMonth())+'/'+dt.getFullYear() + ' '+dt.getHours() + ':'+dt.getMinutes();
		  			date_arr.push(parse_date(tdt));
		  				
		  			var itm = {
		            	x: tdt,
		            	y: null 
		            };
		            dataset.data.push(itm);       	
		    		diff += 1;	
	  			}
       		 }
    }
        cs += 1;
    });
	

	for(var i = 0; i < date_arr.length; i += 1)
		date_arr[i] = new Date( month_day_swap(date_arr[i]) );
	
	
	var date_map = {};
	
	for(var i = 0; i < date_arr.length; i += 1){
		if(date_map[date_arr[i]] != undefined) continue;
		
		date_map[date_arr[i]] = true;
		
		date_arr2.push(date_arr[i]);
	}

	/*
	date_arr.sort(date_sort_asc);
	var begin_date = date_arr[0];
	date_arr = [];
	date_arr.push(begin_date);
	for(var days = 1; days <= 8; days += 1){
		var temp = begin_date;
		temp.setDate(temp.getDate() + days);
		date_arr.push(temp);
	}
	*/

	//console.log(date_arr2);
	
	// update the alert levels
	floodChart.options.annotation.annotations.forEach(function(annotation) {
		var i = parseInt(annotation.id);
		
      if(alertLevels[i] != null) {
      
		annotation.value = parseFloat(alertLevels[i]);

		//if(i == 10) annotation.value = new Date('05/13/2019 00:00'); //DD/MM/YYYY HH:mm  '2019-05-12T02:00:00'
		if(i == 10) annotation.value = date_arr2[0]; //new Date('May-13-2019');
		if(i == 11) annotation.value = date_arr2[1]; //new Date('May-17-2019');
		if(i == 12) annotation.value = date_arr2[2];
		if(i == 13) annotation.value = date_arr2[3];
		if(i == 14) annotation.value = date_arr2[4];
		if(i == 15) annotation.value = date_arr2[5];
		if(i == 16) annotation.value = date_arr2[6];
		if(i == 17) annotation.value = date_arr2[7];
		if(i == 18) annotation.value = date_arr2[8];
		if(i == 19) annotation.value = date_arr2[9];
		

		if(i < 5){
			if (annotation.value > max) {
			max = annotation.value;
			}
			if (annotation.value < min) {
				min = annotation.value;
			}	
		}
      }		
	});
    
    //console.log("min: " + min + " max: " + max);
    
//    if(min < 10)
//    	floodChart.options.scales.yAxes[0].ticks.min = 0;
//    else
//    	floodChart.options.scales.yAxes[0].ticks.min = Math.floor(min - 0.5);
    
//    if(max <= 10)
//		floodChart.options.scales.yAxes[0].ticks.max = 10;
//	else 
//		floodChart.options.scales.yAxes[0].ticks.max = Math.ceil(max + 0.5);

	floodChart.options.scales.yAxes[0].ticks.min = Math.floor(min - 0.5);
	floodChart.options.scales.yAxes[0].ticks.max = Math.ceil(max + 0.5);	

	floodChart.update(0);
	$('body').addClass('show-station');
    $('#date-issued').text(issued_date);

	next_forecast_value = next_forecast_value ? next_forecast_value : "—";
	
	try
	{
		//Need to format as 2023-02-20. note the next_forecast_value is a Date object at this point
		next_forecast_value = next_forecast_value.toLocaleDateString('fr-CA');
		//Note - using fr-CA to get the YYYY-MM-DD formate that's used in the rest of the UI/XML
	}
	catch (error)
	{
		//console.log(error);
	}
    $('#date-next').text(next_forecast_value);
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
	floodChart.data.datasets[1].label = chartLabels[lang]['yAxis_forecast'];
	floodChart.options.annotation.annotations[0].label.content = chartLabels[lang]['levels'][1];
	floodChart.options.annotation.annotations[1].label.content = chartLabels[lang]['levels'][2];
	floodChart.options.annotation.annotations[2].label.content = chartLabels[lang]['levels'][3];
	floodChart.options.annotation.annotations[3].label.content = chartLabels[lang]['levels'][4];
	floodChart.data.labels = chartLabels[lang]['dates'];
	
	floodChart.update(0);
}

/*******************************************************************************
 * @brief Displays a message about the age of the data if it is more than a day old
 *
 * @returns {undefined}
 ******************************************************************************/
function setupDateWarning() {
	$('#date-issued').text(firstDate);
}

/*******************************************************************************
 * @brief Calls populateList, setupNav, and setupChart and then create the google
 * map that displays all of the station locations
 *
 * @returns {undefined}
 ******************************************************************************/
function initMap(AddStation) {
	// the map needs station data to be created
	populateList();
	setupNav();

	setupChart_NEW();
	// add a marker for each station
	for(var i = 0; i < stationList.length; i++){
			statusCode = parseInt(stationList[i]['status']);
			imgUrl = 'img/map'+statusCode+'.png';
			//AddStation(stationDetails[i]['lat'],stationDetails[i]['lng'], imgUrl, stationList[i]['name']);
			AddStation(stationList[i]['lat'], stationList[i]['lng'], imgUrl, stationList[i]['name']);
		}
    setupLang();
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