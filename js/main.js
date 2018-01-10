var floodChart;
var dateList;

$(document).ready( function() {
        
	populateList();
	setupLang();
	setupIntro();
	setupNav();
	setupLegend();
	setupChart();
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

    // parse alertlevels.xml - use true url when website uploaded to server
    var XMLStationAlerts = parseXML("alertlevels.xml");

    // parse alert.xml - use true url when website uploaded to server
    var XMLStationsList = parseXML("alert.xml");
    
		var dates = XMLStationsList.getElementsByTagName("dates")[0];
		var day0En = dates.getElementsByTagName("dates_in")[0].textContent;
		var day0Fr = dates.getElementsByTagName("dates_in")[1].textContent;
		var day1En = dates.getElementsByTagName("dates_24")[0].textContent;
		var day1Fr = dates.getElementsByTagName("dates_24")[1].textContent;
		var day2En = dates.getElementsByTagName("dates_48")[0].textContent;
		var day2Fr = dates.getElementsByTagName("dates_48")[1].textContent;
		dateList = [day0En + ' / '+day0Fr, day1En + ' / '+day1Fr, day2En + ' / '+day2Fr];

    // get the list of stations from the parsed XML list
    var stations = XMLStationsList.getElementsByTagName("station");
    
    // get the lists of alert levels
    var alertLevelList = XMLStationAlerts.getElementsByTagName("station");
        
    // find the already defined html station list
    var list = document.getElementById("station-list");
    
    for(var i=0; i<stations.length; i++){
         
        // get current station name
        //                picks the station then tag picks item inside the station then get text value
        var stationName = stations[i].getElementsByTagName("name")[0].textContent;
        
        // gets station id
        var stationId = stations[i].getElementsByTagName("stationID")[0].textContent;
        
        // get levels data - convert string to float for comparison
        var currentLevel = parseFloat( stations[i].getElementsByTagName("forecast_cur")[0].textContent );
        var forcast24Level = parseFloat(stations[i].getElementsByTagName("forecast_24")[0].textContent );
        var forcast48Level = parseFloat(stations[i].getElementsByTagName("forecast_48")[0].textContent );
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
        var dataStatus;
        if( currentAlertlevel === "normal" )   dataStatus = "3 normal";
        if( currentAlertlevel === "advisory" ) dataStatus = "2 advisory";
        if( currentAlertlevel === "watch" )    dataStatus = "1 watch";
        if( currentAlertlevel === "warning" )  dataStatus = "0 warning";
        
        // create new station and insert data into the list on leftside of screen
        // data is extracted already from the parsed XML file
        var item = document.createElement('li'); 
        item.setAttribute("class",currentAlertlevel);
        item.setAttribute("data-id",stationId);
        item.setAttribute("data-status",dataStatus);
        item.setAttribute("data-name",stationName);
        item.setAttribute("data-levels",waterLevels.join());
        item.setAttribute("data-alerts",alertLevels.join());
        
        // Set its Name:
        item.appendChild(document.createTextNode(item.getAttribute("data-name")));
        // Add it to the list:
        list.appendChild(item);
        
    }
    
}

function setupLang() {
	// all text on the site is in both French and English and has a class to identify which language it is
	// the class on body controls which language is visible
	$('#lang div').on('click', function() {
		if ($(this).hasClass('fr')) {
			$('body').removeClass('fr').addClass('en');
			document.location.hash = 'en';
		} else {
			$('body').removeClass('en').addClass('fr');
			document.location.hash = 'fr';
		}
	});
	var lang = 'en';
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
}

function setupIntro() {
	// a disclaimer overlay appears when the site first loads and the user must close it to use the site
	$('.close').on('click', function() {
		$(this).parents('section').first().addClass('hide');
	});
}

function setupNav() {
	// toggles the visiblity of a dropdown with a class of 'open' on the parent
	$('.dropdown').on('click', function() {
		$(this).toggleClass('open');
	});
	
	// the list of stations can be sorted in a variety of ways:
	// alphabetically, risk of flood and geographical position which corresponds to the station id
	$('#nav-sort li').on('click', function() {
		sortList($('#station-list'), $(this));
	});
}


function sortList(list, link) {
	var sortOn = link.data('sort');
	link.siblings().removeClass('sel');
	link.addClass('sel');
	$('li', list).sort(sort_li).appendTo(list);
  function sort_li(a, b) {
	return ($(b).data(sortOn)) < ($(a).data(sortOn)) ? 1 : -1;
  }
}

function setupLegend() {
	// on smaller screens the legend is in a dropdown
	$('#legend').on('click', function() {
		if ($(window).width() <= 640) {
			$(this).toggleClass('open');
		}
	});
}

function setupChart() {
	initializeChart();

	$('#station-list').on('click', 'li', openChart);
	$('#station-readings').on('click', '.close', function() {
		$('body').removeClass('show-station');
	});
}

function initializeChart() {
	var ctx = $("#flood-chart");
	floodChart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: dateList,
			datasets: [{
				label: 'Water Level',
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
						labelString: "Water level / Niveaux d'eau (m)"
					},
					ticks: {
						//beginAtZero:true
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
						content: 'Advisory',
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
						content: 'Watch',
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
						content: 'Warning',
						position: 'right'
					}
				}]
			}
		}
	});
}

function openChart() {
	var id = $(this).data('id'),
		waterLevels = $(this).data('levels').split(','),
		alertLevels = $(this).data('alerts').split(','),
		name = $(this).text();
	$('#station-title').text(name);

	// remove previous water levels
	floodChart.data.datasets.forEach(function(dataset) {
		dataset.data.pop();
	});

	// add water levels for this station
	floodChart.data.datasets.forEach(function(dataset) {
		dataset.data = waterLevels;
	});

	// update the alert levels
	floodChart.options.annotation.annotations.forEach(function(annotation) {
		var i = parseInt(annotation.id);
		annotation.value = parseFloat(alertLevels[i]);
	});

	// render the chart with the updated values
	floodChart.update(0);
	$('body').addClass('show-station');
}
