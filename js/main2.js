var floodChart;
var firstDate;
var stationList = new Array();
var lang = 'en';
var forecast_available = true;
var waterlevels_available = true;

var forecast_missing_value = false;
var waterlevels_missing_value = false;
var times = 1;
var wsc_url_en = "NONE";
var wsc_url_fr = "NONE";
var date_arr = [];
var date_arr2 = [];

var chartLabels = {
	en: {
		dates: [],
		levels: ['Advisory', 'Watch', 'Warning', 'Flood'],
		yAxis: 'Water level (m)',
		yAxis_forecast: "Forecast (m)"
	},
	fr: {
		dates: [],
		levels: ['Avis', 'Veille', 'Avertissement', 'Crue'],
		yAxis: "Niveau des eaux (m)",
		yAxis_forecast: "Prévoir (m)"
	}
};

$(document).ready( function() {
	setupLang();
	setupToggleView();
	setupIntro();
});

function month_day_swap(date){
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


function  getMeasures(locId, stations) {
  var  is;
    for(is=0 ; is < stations.length ; is++) {
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

function  getForecast(locId, stations) {
  var  is;
    for(is=0 ; is < stations.length ; is++) {
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

function getStartDate(stationId, stations){
	for(var i = 0; i < stations.length; i++){
		var header = stations[i].getElementsByTagName("header")[0];
      	var id = header.getElementsByTagName("locationId")[0].textContent;
      	if(id == stationId){
      		var  parameterId = header.getElementsByTagName("parameterId")[0].textContent;
            if(parameterId != "SSTG")
                continue;

      		var creationDate = header.getElementsByTagName("creationDate")[0].textContent;
      		return creationDate;
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
console.log('  Populate list ');
	var timeStamp = Date.now();
	
    //var XMLStationAlerts = parseXML("http://localhost:8000/Projects/RiverWatch/working/RiverWatch_Web-develop/data/alertlevels_2020.xml");
console.log('  Loading alert levels ');
    var XMLStationAlerts = parseXML("https://geonb-t.snb.ca/documents/misc/rwm_xml/alertlevels_2020.xml");
	//var XMLStationAlerts = parseXML("http://localhost:8000/Projects/RiverWatch/working/RiverWatch_Web-develop/data/alertlevels_2020_extended.xml");
	
	//var XMLStationsList = parseXML("http://localhost:8000/Projects/RiverWatch/working/RiverWatch_Web-develop/data/alert_2020_test.xml");
//	var XMLStationsList = parseXML("https://geonb-t.snb.ca/documents/misc/rwm_xml/alert_2020.xml");

console.log('  Loading water levels ');
	var XMLStationsList = parseXML("https://geonb.snb.ca/documents/misc/alert.xml");

	var alertCounts = {
		'normal': 0,
		'advisory': 0,
		'watch': 0,
		'warning': 0,
		'flood': 0
	};

	// get the list of stations from the parsed XML list
	var stations = XMLStationsList.getElementsByTagName("series");

	// get the lists of alert levels
	var alertLevelList = XMLStationAlerts.getElementsByTagName("station");

	// find the already defined html station list
console.log('  Next step '+alertLevelList.length);
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
console.log('  Get URLs ');
var  ab = alertLevelList[i].getElementsByTagName("WSC_URL_EN");
		if( alertLevelList[i].getElementsByTagName("WSC_URL_EN").length > 0 ) {
		  wsc_url_en = alertLevelList[i].getElementsByTagName("WSC_URL_EN")[0].textContent;
                }
		if( alertLevelList[i].getElementsByTagName("WSC_URL_FR").length > 0) {
		  wsc_url_fr = alertLevelList[i].getElementsByTagName("WSC_URL_FR")[0].textContent;
                }
console.log('  Have  URLs ');
		//console.log("wsc_url_en: " + wsc_url_en);
		var listId = makeSlug(stationName);
		
		// get levels data - convert string to float for comparison
		var advisoryLevel = parseFloat(alertLevelList[i].getElementsByTagName("advisory")[0].textContent);
		var watchLevel = parseFloat(alertLevelList[i].getElementsByTagName("watch")[0].textContent);
		var warningLevel = parseFloat(alertLevelList[i].getElementsByTagName("warning")[0].textContent);
		var floodLevel = parseFloat(alertLevelList[i].getElementsByTagName("Floodlvl")[0].textContent);
		var alertLevels = [advisoryLevel, watchLevel, warningLevel, floodLevel];

		var measures = getMeasures(stationId, stations);
        var forecasts = getForecast(stationId, stations);
        var startDate = getStartDate(stationId, stations);

        var currentLevel = 0;
        if(measures != null) {
            currentLevel = measures[measures.length-1].wlvl;
        }
        else  if(forecasts != null) {
            currentLevel = forecasts[forecasts.length-1].wlvl;
        }
console.log('  we are here ');
        // a flag to store the condition of the current alert level
		// need this but how
		var currentAlertlevel = getAlertLevel(currentLevel, advisoryLevel, watchLevel, warningLevel, floodLevel);
//		var currentAlertlevel = 'normal';
  		if (measures == null) measures = 'NA';
  		if(forecasts == null) forecasts = 'NA';

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
console.log('  Create Station ');
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
			'startDate': startDate
		};
		
console.log('  Add Station  '+stationName);
		stationList.push(stationData);
		
		// create new station and insert data into the list on leftside of screen
		var item = createStationItem(stationData);

		// Add it to the list:
console.log('  Add to list  '+stationName);
		list.appendChild(item); //this is the html list on the ledt panel of map
	}
	
	['advisory', 'watch', 'warning', 'flood'].forEach(function(level) {
		var levelCount = alertCounts[level];
		$('.'+level+'-count').text(levelCount);
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

function setupChart_NEW() {
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
								return 'rgba(198, 179, 255, 1)';
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
                    borderColor: 'rgb(121, 210, 121)'
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
                        if(lang == 'en')
                        	return round(item.yLabel, 1);
                        var num = round(item.yLabel, 1);
                        num = num.toString().replace('.', ',');
                        return num;
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
					type: 'line',
					mode: 'horizontal',
					id: '0',
					scaleID: 'y-axis-0',
					value: 6, 
					borderColor: 'rgba(252, 238, 33, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][0],
						position: 'right'
					}
				},
				{
					type: 'line',
					mode: 'horizontal',
					id: '1',
					scaleID: 'y-axis-0',
					value: 7,
					borderColor: 'rgba(247, 147, 30, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][1],
						position: 'right'
					}
				},
				{
					type: 'line',
					mode: 'horizontal',
					id: '2',
					scaleID: 'y-axis-0',
					value: 8,
					borderColor: 'rgba(255, 67, 67, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][2],
						position: 'right'
					}
				},
				{
					type: 'line',
					mode: 'horizontal',
					id: '3',
					scaleID: 'y-axis-0',
					value: 9,
					borderColor: 'rgba(0, 0, 0, 0.5)',
					borderWidth: 3,
					label: {
						enabled: false,
						content: chartLabels[lang]['levels'][3],
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
				if(forecast_available == false) // that means,  forecast is made up of dummy dates ( 5 dates )
					x = config.data.datasets[0]._meta[0].data[ config.data.datasets[0]._meta[0].data.length - 1]._model.x;
				else
					x = config.data.datasets[1]._meta[0].data[0]._model.x;
				
				//var date_arr = getDates(config.data.datasets);
				//for(var i = 0; i < date_arr.length; i += 1)
					//console.log(date_arr[i]._model.x);
				//console.log(date_arr);

				var ctx = this.chart.chart.ctx;

				var line_alpha = 1.0;
				
				ctx.save();
				
				ctx.strokeStyle  = 'rgba(0, 0, 0, ' + line_alpha + ')';
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
					ctx.font = "0.8em Arial";
					ctx.fillText("FORECAST NOT", xx + 0.15 * xx, yy + 0.08 * yy);
					ctx.fillText("AVAILABLE DUE TO", xx + 0.15 * xx, 14 + yy + 0.08 * yy);
					ctx.fillText("UNPREDICTABLE", xx + 0.15 * xx, 28 + yy + 0.08 * yy);
					ctx.fillText("NATURE", xx + 0.15 * xx, 42 + yy + 0.08 * yy);
					ctx.fillText("OF ICE JAMS", xx + 0.15 * xx, 56 + yy + 0.08 * yy);
				}
				//Cond-4
				else if(forecast_missing_value == true){
					xx = x * (1 + offset_x);
					yy = y + height * offset_y;
					ctx.fillStyle  = 'rgba(0, 0, 0, 0.8)';
					ctx.font = "0.8em Arial";
					ctx.fillText("CURRENT CONDITIONS", xx , yy + 0.08 * yy);
					ctx.fillText("DO NOT WARRANT", xx , 14 + yy + 0.08 * yy);
					ctx.fillText("A FORECAST", xx , 28 + yy + 0.08 * yy);
					ctx.fillText("AT THIS TIME", xx , 42 + yy + 0.08 * yy);	
				}
				
				//Cond-1
				if(waterlevels_available == false){
					xx = x - 0.65 * x;
					yy = y + height * offset_y;
					ctx.fillStyle  = 'rgba(0, 0, 0, 0.8)';
					ctx.font = "0.8em Arial";
					ctx.fillText("RECENT", xx + 0.15 * xx, yy + 0.08 * yy);
					ctx.fillText("WATER-LEVELS", xx + 0.15 * xx, 14 + yy + 0.08 * yy);
					ctx.fillText("NOT AVAILABLE", xx + 0.15 * xx, 28 + yy + 0.08 * yy);
					ctx.fillText("IN THIS AREA", xx + 0.15 * xx, 42 + yy + 0.08 * yy);

				}
				//Cond-3
				else if(waterlevels_missing_value == true){
					xx = x - 0.65 * x + 10;
					yy = y + height * 0.75;
					ctx.fillStyle  = 'rgba(0, 0, 0, 0.8)';
					ctx.font = "0.8em Arial";
					ctx.fillText("SOME DATA", xx, yy + 0.08 * yy);
					ctx.fillText("MAY BE MISSING", xx, 14 + yy + 0.08 * yy);
					ctx.fillText("DUE TO", xx, 28 + yy + 0.08 * yy);
					ctx.fillText("TEMPORARY", xx, 42 + yy + 0.08 * yy);
					ctx.fillText("MALFUNCTION", xx, 56 + yy + 0.08 * yy);	
				}

				ctx.restore();
				
			}//end function
		});
	
	Chart.controllers.modifiedline = custom;

function initializeChart_NEW(){
	var ctx = $("#flood-chart");
	floodChart = new Chart(ctx, config);
}

/*******************************************************************************
 * @brief Updates the chart data for a specific station and then display the chart
 *
 * @returns {undefined}
 ******************************************************************************/
function openChart_NEW(){
	date_arr = [];
	var id = $(this).data('id'),
		station = stationList[id],
		waterLevels = station['waterLevels'],
	    forecasts = station['forecasts'],
		alertLevels = station['alertLevels'],
		name = station['name'],
		wsc_url_en = station['wsc_url_en'],
		wsc_url_fr = station['wsc_url_fr'],
		has_forecast_data = station['has_forecast_data'],
		has_measured_data = station['has_measured_data']
	
	min = 200, // the min value displayed on the chart
	max = 0; // the max value displayed on the chart
	
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
    var  cs = 0;

	floodChart.data.datasets.forEach(function(dataset) {
		// remove previous water levels
		dataset.data = [];
		
		var total_forecast = 0;
		if(has_forecast_data == 'YES'){
			forecasts.forEach(function(level) {
				if(level.wlvl != -999)
					total_forecast += 1;
			});	
		}
		
		var total_wlvl = 0;
		if(has_measured_data == 'YES'){
			waterLevels.forEach(function(level) {
				if(level.wlvl != -999)
					total_wlvl += 1;
			});	
		}
		
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
	  		else{
	  			waterlevels_available = false;
	  			if(has_forecast_data == 'YES'){
	  				var diff = 1;
	  				while(diff <= 4){
	  					var level = forecasts[0];
		  				var dt = (level.dtime.getDate() - diff) + '/' + (1 + level.dtime.getMonth()) +'/'+level.dtime.getFullYear() + ' '+level.dtime.getHours() + ':'+level.dtime.getMinutes();
		  				date_arr.push(parse_date(dt));
		  				
		  				var itm = {
		            				x: dt,
		                       		y: null 
		                       };
		                dataset.data.push(itm);       	
		  				diff += 1;	
	  				}
	  				
	  			}
				
	  		}
        } //cs = 0 ends
        else {
        		if(has_forecast_data == 'YES' && total_forecast > 0) {
        			forecast_available = true;
	  		  		forecasts.forEach(function(level) {
						total += 1;
			            var dt = level.dtime.getDate() + '/' + (1+level.dtime.getMonth())+'/'+level.dtime.getFullYear() + ' '+level.dtime.getHours() + ':'+level.dtime.getMinutes();
			            date_arr.push(parse_date(dt));
			            
			            var wlvl = null;
		            	if(level.wlvl != -999) wlvl = level.wlvl;
		            	else forecast_missing_value = true;
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
       		 else{
       		 	forecast_available = false;
       		 	if(has_measured_data == 'YES'){
       		 		//if(countMissing(waterLevels) < waterLevels.length)
       		 			//waterlevels_missing_value = true;
       		 		
       		 		var diff = 1;
	  				while(diff <= 5){
	  					var level = waterLevels[waterLevels.length - 1];
		  				var dt = (level.dtime.getDate() + diff) + '/' + (1+level.dtime.getMonth())+'/'+level.dtime.getFullYear() + ' '+level.dtime.getHours() + ':'+level.dtime.getMinutes();
		  				date_arr.push(parse_date(dt));
		  				
		  				var itm = {
		            				x: dt,
		                       		y: null 
		                       };
		                dataset.data.push(itm);       	
		  				diff += 1;	
	  				}
       		 	}
       		 }
    }
        cs += 1;
    });
	

	for(var i = 0; i < date_arr.length; i += 1)
		date_arr[i] = new Date( month_day_swap(date_arr[i]) );
	
	
	var date_map = {};
	
	for(var i = 0; i < date_arr.length; i += 1){
		//console.log(date_arr[i]);
		//console.log(date_map[date_arr[i]]);
		
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
		

		if(i < 4){
			if (annotation.value > max) {
			max = annotation.value;
			}
			if (annotation.value < min) {
				min = annotation.value;
			}	
		}
		
	});
    
    //console.log("min: " + min + " max: " + max);
    
 /*   if(min < 10)
    	floodChart.options.scales.yAxes[0].ticks.min = 0;
    else
*/
    	floodChart.options.scales.yAxes[0].ticks.min = Math.floor(min);
    /*
    else if(min - 4 >= 10)
		floodChart.options.scales.yAxes[0].ticks.min = min - 4;
	else 
		floodChart.options.scales.yAxes[0].ticks.min = min;
	*/
	
/*	if(max <= 10)
		floodChart.options.scales.yAxes[0].ticks.max = 10;
	else 
*/
		floodChart.options.scales.yAxes[0].ticks.max = Math.ceil(max) + 1;

	floodChart.update(0);
	$('body').addClass('show-station');
	$('#date-issued').text(station['startDate']);
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
	floodChart.options.annotation.annotations[0].label.content = chartLabels[lang]['levels'][0];
	floodChart.options.annotation.annotations[1].label.content = chartLabels[lang]['levels'][1];
	floodChart.options.annotation.annotations[2].label.content = chartLabels[lang]['levels'][2];
	floodChart.options.annotation.annotations[3].label.content = chartLabels[lang]['levels'][3];
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
console.log('  Init map ');
	populateList();
	setupNav();
	//setupChart();
	setupChart_NEW();
	// add a marker for each station
	for(var i = 0; i < stationList.length; i++){
			statusCode = parseInt(stationList[i]['status']);
			imgUrl = 'img/map'+statusCode+'.png';
			//AddStation(stationDetails[i]['lat'],stationDetails[i]['lng'], imgUrl, stationList[i]['name']);
			AddStation(stationList[i]['lat'], stationList[i]['lng'], imgUrl, stationList[i]['name']);
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
