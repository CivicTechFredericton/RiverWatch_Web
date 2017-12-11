$(document).ready( function() {
        
	populateList();
        setupLang();
	setupIntro();
	setupNav();
	setupLegend();
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
        var advisoryLevel = parseFloat( alertLevelList[i].getElementsByTagName("advisory")[0].textContent );
        var watchLevel = parseFloat( alertLevelList[i].getElementsByTagName("watch")[0].textContent );
        var warningLevel = parseFloat( alertLevelList[i].getElementsByTagName("warning")[0].textContent );
        
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
        
        // Set its Name:
        item.appendChild(document.createTextNode(item.getAttribute("data-name")));
        // Add it to the list:
        list.appendChild(item);
        
    }
    
}

function setupLang() {
	$('#lang div').on('click', function() {
		if ($(this).hasClass('fr')) {
			$('body').removeClass('fr').addClass('en');
		} else {
			$('body').removeClass('en').addClass('fr');
		}
	});
}

function setupIntro() {
	$('.close').on('click', function() {
		$(this).parents('section').first().addClass('hide');
	});
}

function setupNav() {
	$('.dropdown').on('click', function() {
		$(this).toggleClass('open');
	});
	
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
	$('#legend').on('click', function() {
		if ($(window).width() <= 640) {
			$(this).toggleClass('open');
		}
	});
}
